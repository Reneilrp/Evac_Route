<?php

use App\Models\BroadcastAlert;
use App\Models\FamilyProfile;
use App\Models\Hazard;
use App\Models\RescueMission;
use App\Models\RescueUnit;
use App\Models\Shelter;
use App\Models\User;
use App\Services\WeatherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    Http::fake([
        'exp.host/*' => Http::response(['status' => 'ok']),
    ]);
});

test('public endpoint returns live weather status and recommendation', function () {
    $this->mock(WeatherService::class, function ($mock) {
        $mock->shouldReceive('isCurrentlyRaining')->once()->andReturn(true);
    });

    Cache::put('rain_started_at', now()->subMinutes(50)->toIso8601String(), 3600);

    $response = $this->getJson('/api/weather/live-status');

    $response->assertStatus(200)
        ->assertJson([
            'status' => 'success',
            'data' => [
                'city' => 'Zamboanga City',
                'is_raining' => true,
                'continuous_rain_duration_minutes' => 50,
            ],
        ]);

    expect($response->json('data.system_recommendation'))->toContain('High flood risk');
});

test('public endpoint returns pre-mapped geohazard presets', function () {
    $response = $this->getJson('/api/hazards/presets');

    $response->assertStatus(200)
        ->assertJson([
            'status' => 'success',
        ]);

    $data = $response->json('data');
    expect(count($data))->toBeGreaterThanOrEqual(5);

    $tumaga = collect($data)->firstWhere('key', 'tumaga_basin');
    expect($tumaga)->not->toBeNull()
        ->and($tumaga['name'])->toContain('Tumaga River')
        ->and($tumaga['barangays'])->toContain('Tumaga')
        ->and($tumaga['barangays'])->toContain('Tetuan')
        ->and($tumaga['is_active'])->toBeFalse();
});

test('CDRRMO staff can declare a proactive hazard zone for a barangay with automated broadcast', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff']);

    $resident = User::factory()->create([
        'role' => 'resident',
        'push_token' => 'ExponentPushToken[residentAlertToken]',
    ]);

    $response = $this->actingAs($staff)->postJson('/api/hazards/declare-zone', [
        'barangay' => 'Tumaga',
        'hazard_type' => 'flood',
        'severity_level' => 'critical',
        'radius_meters' => 1000,
        'estimated_duration_hours' => 6,
        'send_broadcast' => true,
        'advisory_message' => 'Tumaga river water level has breached Red Alert. Evacuate immediately.',
    ]);

    $response->assertStatus(201)
        ->assertJson([
            'status' => 'success',
            'message' => 'Disaster hazard zone officially declared for Barangay Tumaga.',
        ]);

    $hazard = Hazard::where('barangay', 'Tumaga')->first();
    expect($hazard)->not->toBeNull()
        ->and($hazard->origin_type)->toBe('official_declaration')
        ->and((bool) $hazard->is_active)->toBeTrue()
        ->and((float) $hazard->latitude)->toBe(6.9325)
        ->and((float) $hazard->longitude)->toBe(122.0805);

    $broadcast = BroadcastAlert::where('title', 'like', '%Tumaga%')->first();
    expect($broadcast)->not->toBeNull()
        ->and($broadcast->severity)->toBe('critical');

    // Verify Expo push API request was dispatched
    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'exp.host/--/api/v2/push/send')
            && str_contains($request->body(), 'ExponentPushToken[residentAlertToken]');
    });
});

test('CDRRMO staff can toggle geohazard presets ON and OFF', function () {
    $staff = User::factory()->create(['role' => 'admin']);

    // 1. Toggle ON
    $toggleOn = $this->actingAs($staff)->postJson('/api/hazards/presets/tumaga_basin/toggle');
    $toggleOn->assertStatus(201)
        ->assertJson([
            'status' => 'success',
            'action' => 'activated',
            'preset_key' => 'tumaga_basin',
        ]);

    $hazard = Hazard::where('preset_key', 'tumaga_basin')->first();
    expect($hazard)->not->toBeNull()
        ->and((bool) $hazard->is_active)->toBeTrue()
        ->and($hazard->origin_type)->toBe('geohazard_preset');

    // 2. Check presets endpoint reports it as active
    $presetsRes = $this->getJson('/api/hazards/presets');
    $tumaga = collect($presetsRes->json('data'))->firstWhere('key', 'tumaga_basin');
    expect($tumaga['is_active'])->toBeTrue();

    // 3. Toggle OFF
    $toggleOff = $this->actingAs($staff)->postJson('/api/hazards/presets/tumaga_basin/toggle');
    $toggleOff->assertStatus(200)
        ->assertJson([
            'status' => 'success',
            'action' => 'deactivated',
            'preset_key' => 'tumaga_basin',
        ]);

    $hazard->refresh();
    expect((bool) $hazard->is_active)->toBeFalse();
});

test('calculates proactive population-at-risk and shelter capacity deficit', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff']);

    // 1. Register 3 families in Barangay Baliwasan
    $user1 = User::factory()->create(['role' => 'resident']);
    FamilyProfile::create([
        'user_id' => $user1->id,
        'barangay' => 'Baliwasan',
        'headcount' => 5,
        'contact_number' => '09171111111',
        'qr_code_hash' => 'hash_baliwasan_1',
        'transportation_mode' => 'pedestrian',
    ]);

    $user2 = User::factory()->create(['role' => 'resident']);
    FamilyProfile::create([
        'user_id' => $user2->id,
        'barangay' => 'Baliwasan',
        'headcount' => 6,
        'contact_number' => '09172222222',
        'qr_code_hash' => 'hash_baliwasan_2',
        'transportation_mode' => '2_wheel',
    ]);

    // 2. Create shelter in Baliwasan with max capacity 8
    Shelter::create([
        'name' => 'Baliwasan Elementary Evacuation Center',
        'barangay' => 'Baliwasan',
        'latitude' => 6.9150,
        'longitude' => 122.0550,
        'max_capacity' => 8,
        'current_occupancy' => 0,
        'status' => 'open',
    ]);

    $response = $this->actingAs($staff)->getJson('/api/lgu/population-at-risk/Baliwasan');

    $response->assertStatus(200)
        ->assertJson([
            'status' => 'success',
            'barangay' => 'Baliwasan',
            'risk_summary' => [
                'total_registered_households' => 2,
                'total_registered_headcount' => 11,
                'transportation_modes' => [
                    'pedestrian' => 1,
                    '2_wheel' => 1,
                ],
            ],
            'shelter_feasibility' => [
                'total_shelter_capacity' => 8,
                'available_shelter_capacity' => 8,
                'capacity_surplus_or_deficit' => -3,
                'has_deficit' => true,
                'deficit_amount' => 3,
            ],
        ]);

    expect($response->json('shelter_feasibility.recommendation'))->toContain('SHELTER DEFICIT ALERT');
});

test('CDRRMO can log direct 911 hotline or VHF radio distress calls and dispatch rescue units', function () {
    $dispatcher = User::factory()->create(['role' => 'admin']);

    $unit = RescueUnit::create([
        'name' => 'WASAR Fast Boat Charlie',
        'call_sign' => 'WASAR-03',
        'unit_type' => 'water_rescue',
        'status' => 'standby',
        'capacity_persons' => 8,
    ]);

    $shelter = Shelter::create([
        'name' => 'Tetuan Central School',
        'barangay' => 'Tetuan',
        'latitude' => 6.9189,
        'longitude' => 122.0886,
        'max_capacity' => 200,
        'status' => 'open',
    ]);

    $payload = [
        'intake_source' => 'vhf_radio',
        'informant_name' => 'Tanod Romeo - Brgy Scout',
        'informant_contact' => 'VHF-CH3',
        'rescue_unit_id' => $unit->id,
        'victim_name' => 'Dela Cruz Family (Stranded on Roof)',
        'victim_latitude' => 6.9325,
        'victim_longitude' => 122.0805,
        'barangay' => 'Tumaga',
        'headcount' => 5,
        'special_needs' => '1 bedridden elderly, 1 infant',
        'situation_description' => 'Flood water reached 6 feet due to river breach. Urgent extraction needed.',
        'triage_level' => 'critical',
        'target_shelter_id' => $shelter->id,
        'status' => 'en_route',
        'equipments' => ['Life Jackets', 'Inflatable Raft', 'First Aid Kit'],
        'notes' => 'Call received via Radio Channel 3.',
    ];

    $response = $this->actingAs($dispatcher)->postJson('/api/rescue/hotline-intake', $payload);

    $response->assertStatus(201)
        ->assertJson([
            'status' => 'success',
            'data' => [
                'intake_source' => 'vhf_radio',
                'informant_name' => 'Tanod Romeo - Brgy Scout',
                'victim_name' => 'Dela Cruz Family (Stranded on Roof)',
                'triage_level' => 'critical',
                'headcount' => 5,
                'status' => 'en_route',
            ],
        ]);

    $unit->refresh();
    expect($unit->status)->toBe('en_route');

    $mission = RescueMission::where('intake_source', 'vhf_radio')->first();
    expect($mission)->not->toBeNull()
        ->and($mission->control_no)->toStartWith('RES-')
        ->and($mission->notes)->toContain('[VHF RADIO INTAKE | Informant: Tanod Romeo - Brgy Scout (VHF-CH3)]')
        ->and($mission->notes)->toContain('[EQUIPMENT DEPLOYED]: Life Jackets, Inflatable Raft, First Aid Kit');
});

test('resident cannot declare disaster zones or perform hotline intake', function () {
    $resident = User::factory()->create(['role' => 'resident']);

    $this->actingAs($resident)->postJson('/api/hazards/declare-zone', [
        'barangay' => 'Tumaga',
    ])->assertStatus(403);

    $this->actingAs($resident)->postJson('/api/rescue/hotline-intake', [
        'intake_source' => 'hotline_911',
    ])->assertStatus(403);
});
