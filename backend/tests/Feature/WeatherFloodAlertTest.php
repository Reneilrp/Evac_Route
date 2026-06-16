<?php

use App\Models\Hazard;
use App\Models\User;
use App\Services\WeatherService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Artisan;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    Http::fake([
        'exp.host/*' => Http::response(['status' => 'ok']),
        'api.openweathermap.org/*' => Http::response([
            'weather' => [['main' => 'Rain', 'id' => 501]]
        ])
    ]);
});

test('user can update last coordinates', function () {
    $user = User::factory()->create(['role' => 'resident']);

    $response = $this->actingAs($user)
        ->postJson('/api/user/location', [
            'latitude' => 6.9126,
            'longitude' => 122.0729
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'status' => 'success',
            'message' => 'Location updated successfully.'
        ]);

    $user->refresh();
    expect($user->last_latitude)->toEqual('6.91260000')
        ->and($user->last_longitude)->toEqual('122.07290000');
});

test('rain started alert triggers city wide notification and sets cache', function () {
    $resident = User::factory()->create([
        'role' => 'resident',
        'push_token' => 'ExponentPushToken[1111111111111111111111]'
    ]);

    // Mock weather service directly in container
    $this->mock(WeatherService::class, function ($mock) {
        $mock->shouldReceive('isCurrentlyRaining')->once()->andReturn(true);
    });

    expect(Cache::has('rain_started_at'))->toBeFalse();

    Artisan::call('app:check-rain-and-alert');

    expect(Cache::has('rain_started_at'))->toBeTrue();

    // Verify Expo push API request was sent
    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'exp.host/--/api/v2/push/send')
            && str_contains($request->body(), 'ExponentPushToken[1111111111111111111111]')
            && str_contains($request->body(), 'Precipitation Warning');
    });
});

test('prolonged rain triggers fixed flood spot activation and geofenced alerts', function () {
    // 1. Create a resident close to the flood spot
    $nearbyUser = User::factory()->create([
        'role' => 'resident',
        'push_token' => 'ExponentPushToken[nearUser]',
        'last_latitude' => 6.9120, // close to 6.9126
        'last_longitude' => 122.0720, // close to 122.0729
        'alert_radius_meters' => 200 // choice allows it (dist ~120m)
    ]);

    // 2. Create a resident close to the flood spot but with a small alert radius preference
    $optedOutUser = User::factory()->create([
        'role' => 'resident',
        'push_token' => 'ExponentPushToken[optedOutUser]',
        'last_latitude' => 6.9120, // close to 6.9126
        'last_longitude' => 122.0720, // close to 122.0729
        'alert_radius_meters' => 50 // choice is smaller than distance (~120m)
    ]);

    // 3. Create a resident far away from the flood spot
    $farUser = User::factory()->create([
        'role' => 'resident',
        'push_token' => 'ExponentPushToken[farUser]',
        'last_latitude' => 7.0500, // far
        'last_longitude' => 122.2000 // far
    ]);

    // 4. Create a fixed flood spot hazard
    $hazard = Hazard::create([
        'name' => 'Tugbungan Flood Point',
        'latitude' => 6.9126,
        'longitude' => 122.0729,
        'radius_meters' => 500,
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'is_fixed_flood_spot' => true,
        'is_active' => false,
        'estimated_duration_hours' => 2,
        'reported_by' => $nearbyUser->id
    ]);

    // 5. Set rain started cache back 2 hours ago (120 minutes)
    Cache::forever('rain_started_at', now()->subHours(2)->toIso8601String());

    $this->mock(WeatherService::class, function ($mock) {
        $mock->shouldReceive('isCurrentlyRaining')->once()->andReturn(true);
    });

    Artisan::call('app:check-rain-and-alert');

    // Assert hazard is now active
    $hazard->refresh();
    expect((bool)$hazard->is_active)->toBeTrue();

    // Verify Expo push alert was sent to nearbyUser but NOT farUser or optedOutUser
    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'exp.host/--/api/v2/push/send')
            && str_contains($request->body(), 'ExponentPushToken[nearUser]')
            && !str_contains($request->body(), 'ExponentPushToken[farUser]')
            && !str_contains($request->body(), 'ExponentPushToken[optedOutUser]')
            && str_contains($request->body(), 'Street Flooding Alert');
    });
});

test('stopping rain clears cache and deactivates fixed flood spots', function () {
    $user = User::factory()->create();
    $hazard = Hazard::create([
        'name' => 'Tugbungan Flood Point',
        'latitude' => 6.9126,
        'longitude' => 122.0729,
        'radius_meters' => 500,
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'is_fixed_flood_spot' => true,
        'is_active' => true,
        'estimated_duration_hours' => 2,
        'reported_by' => $user->id
    ]);

    Cache::forever('rain_started_at', now()->toIso8601String());
    Cache::forever('fixed_flood_spots_triggered', true);

    $this->mock(WeatherService::class, function ($mock) {
        $mock->shouldReceive('isCurrentlyRaining')->once()->andReturn(false);
    });

    Artisan::call('app:check-rain-and-alert');

    expect(Cache::has('rain_started_at'))->toBeFalse()
        ->and(Cache::has('fixed_flood_spots_triggered'))->toBeFalse();

    $hazard->refresh();
    expect((bool)$hazard->is_active)->toBeFalse();
});

test('lgu can promote pending incident to fixed flood spot', function () {
    $resident = User::factory()->create(['role' => 'resident']);
    $lguStaff = User::factory()->create(['role' => 'lgu_staff']);

    $incident = \App\Models\PendingIncident::create([
        'reported_by'    => $resident->id,
        'name'           => 'Bad Drainage Bottleneck',
        'latitude'       => 6.9126,
        'longitude'      => 122.0729,
        'hazard_type'    => 'flood',
        'severity_level' => 'high',
        'status'         => 'pending'
    ]);

    $response = $this->actingAs($lguStaff)
        ->postJson("/api/incidents/{$incident->id}/approve", [
            'is_fixed_flood_spot' => true,
            'note' => 'Resident report verified. Bad drainage area.'
        ]);

    $response->assertStatus(200);

    // Assert that a Hazard was created with is_fixed_flood_spot = true, and is_active = false
    $hazard = Hazard::where('name', 'Bad Drainage Bottleneck')->first();
    expect($hazard)->not->toBeNull();
    expect((bool)$hazard->is_fixed_flood_spot)->toBeTrue();
    expect((bool)$hazard->is_active)->toBeFalse(); // Fixed flood spots start inactive until rain triggers them
});

test('fixed flood spot alert triggers at 60 minutes but not 45 minutes', function () {
    // 1. Create a resident
    $nearbyUser = User::factory()->create([
        'role' => 'resident',
        'push_token' => 'ExponentPushToken[timeTest]',
        'last_latitude' => 6.9120,
        'last_longitude' => 122.0720,
        'alert_radius_meters' => 200
    ]);

    // 2. Create a fixed flood spot hazard
    $hazard = Hazard::create([
        'name' => 'Bad Drainage Area',
        'latitude' => 6.9126,
        'longitude' => 122.0729,
        'radius_meters' => 500,
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'is_fixed_flood_spot' => true,
        'is_active' => false,
        'reported_by' => $nearbyUser->id
    ]);

    // 3. Setup mock weather service
    $this->mock(WeatherService::class, function ($mock) {
        $mock->shouldReceive('isCurrentlyRaining')->andReturn(true);
    });

    // 4. Test at 45 minutes (should not trigger)
    Cache::forever('rain_started_at', now()->subMinutes(45)->toIso8601String());

    Artisan::call('app:check-rain-and-alert');

    $hazard->refresh();
    expect((bool)$hazard->is_active)->toBeFalse();

    // 5. Test at 60 minutes (should trigger)
    Cache::forever('rain_started_at', now()->subMinutes(60)->toIso8601String());

    Artisan::call('app:check-rain-and-alert');

    $hazard->refresh();
    expect((bool)$hazard->is_active)->toBeTrue();

    // Verify Expo push alert was sent
    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'exp.host/--/api/v2/push/send')
            && str_contains($request->body(), 'ExponentPushToken[timeTest]')
            && str_contains($request->body(), 'Street Flooding Alert');
    });
});
