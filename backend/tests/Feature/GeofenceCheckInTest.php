<?php

use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('resident within geofence proximity can auto-check in with family headcount', function () {
    $user = User::factory()->create(['role' => 'resident']);
    $family = FamilyProfile::create([
        'user_id' => $user->id,
        'headcount' => 4,
        'contact_number' => '09171234567',
        'barangay' => 'Tetuan',
        'qr_code_hash' => 'HASH_GEO_TEST',
    ]);

    $shelter = Shelter::create([
        'name' => 'Tetuan Covered Court',
        'latitude' => 6.918500,
        'longitude' => 122.088200,
        'elevation_meters' => 12,
        'barangay' => 'Tetuan',
        'max_capacity' => 150,
        'current_occupancy' => 20,
        'status' => 'open',
    ]);

    // Resident is 30 meters away from shelter
    $response = $this->actingAs($user)->postJson("/api/shelters/{$shelter->id}/geofence-checkin", [
        'latitude' => 6.918700,
        'longitude' => 122.088200,
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.action', 'geofence_checkin');

    // Shelter capacity auto-incremented by 4 (20 + 4 = 24)
    expect($shelter->fresh()->current_occupancy)->toBe(24);

    // EvacuationLog created with checkin_method = 'geofence'
    $log = EvacuationLog::where('family_profile_id', $family->id)->first();
    expect($log)->not->toBeNull();
    expect($log->checkin_method)->toBe('geofence');
    expect($log->recorded_headcount)->toBe(4);
    expect($log->shelter_id)->toBe($shelter->id);
});

test('resident outside geofence boundary is rejected', function () {
    $user = User::factory()->create(['role' => 'resident']);
    FamilyProfile::create([
        'user_id' => $user->id,
        'headcount' => 3,
        'contact_number' => '09171112222',
        'barangay' => 'Tetuan',
        'qr_code_hash' => 'HASH_GEO_FAR',
    ]);

    $shelter = Shelter::create([
        'name' => 'Tetuan Covered Court',
        'latitude' => 6.918500,
        'longitude' => 122.088200,
        'elevation_meters' => 12,
        'barangay' => 'Tetuan',
        'max_capacity' => 150,
        'current_occupancy' => 20,
        'status' => 'open',
    ]);

    // Resident is 2 kilometers away
    $response = $this->actingAs($user)->postJson("/api/shelters/{$shelter->id}/geofence-checkin", [
        'latitude' => 6.935000,
        'longitude' => 122.070000,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('status', 'error');

    // Occupancy unchanged
    expect($shelter->fresh()->current_occupancy)->toBe(20);
});

test('duplicate geofence trigger does not double count family headcount', function () {
    $user = User::factory()->create(['role' => 'resident']);
    $family = FamilyProfile::create([
        'user_id' => $user->id,
        'headcount' => 5,
        'contact_number' => '09173334444',
        'barangay' => 'Tetuan',
        'qr_code_hash' => 'HASH_GEO_DUP',
    ]);

    $shelter = Shelter::create([
        'name' => 'Tetuan Covered Court',
        'latitude' => 6.918500,
        'longitude' => 122.088200,
        'elevation_meters' => 12,
        'barangay' => 'Tetuan',
        'max_capacity' => 150,
        'current_occupancy' => 10,
        'status' => 'open',
    ]);

    // First geofence check-in
    $this->actingAs($user)->postJson("/api/shelters/{$shelter->id}/geofence-checkin", [
        'latitude' => 6.918550,
        'longitude' => 122.088200,
    ])->assertStatus(200);

    expect($shelter->fresh()->current_occupancy)->toBe(15);

    // Second geofence trigger (e.g. app reopened or GPS drifted inside gym)
    $secondResponse = $this->actingAs($user)->postJson("/api/shelters/{$shelter->id}/geofence-checkin", [
        'latitude' => 6.918520,
        'longitude' => 122.088210,
    ]);

    $secondResponse->assertStatus(200)
        ->assertJsonPath('data.action', 'already_checked_in');

    // Occupancy MUST STILL BE 15 (no double counting!)
    expect($shelter->fresh()->current_occupancy)->toBe(15);
    expect(EvacuationLog::where('family_profile_id', $family->id)->count())->toBe(1);
});
