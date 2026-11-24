<?php

use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Hazard;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\RationTemplateItem;
use App\Models\Shelter;
use App\Models\User;
use App\Services\WeatherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

test('shelter model categorizes hazard safety and earthquake open fields', function () {
    $coveredCourt = Shelter::create([
        'name' => 'Tetuan Covered Court',
        'latitude' => 6.9180,
        'longitude' => 122.0880,
        'max_capacity' => 500,
        'current_occupancy' => 0,
        'status' => 'open',
        'facility_type' => 'covered_court',
        'allowed_hazards' => ['flood', 'fire', 'general'],
    ]);

    $openField = Shelter::create([
        'name' => 'WMSU Grandstand Open Athletic Field',
        'latitude' => 6.9135,
        'longitude' => 122.0600,
        'max_capacity' => 2000,
        'current_occupancy' => 10,
        'status' => 'open',
        'facility_type' => 'open_field',
        'allowed_hazards' => ['earthquake', 'flood'],
    ]);

    expect($coveredCourt->isSafeForHazard('flood'))->toBeTrue();
    expect($coveredCourt->isSafeForHazard('earthquake'))->toBeFalse(); // Covered courts strictly excluded for earthquakes

    expect($openField->isSafeForHazard('earthquake'))->toBeTrue(); // Open field is safe
    expect($openField->current_idps)->toBe(10); // IDP Terminology accessor
});

test('checkin endpoint verifies qr token and triggers instant anti-duplication warning', function () {
    $staff = User::create([
        'name' => 'CSWDO Intake Staff',
        'email' => 'staff.cswdo@test.local',
        'password' => bcrypt('password'),
        'role' => 'lgu_staff',
        'operator_type' => 'scanner',
        'status' => 'active',
    ]);

    $shelter = Shelter::create([
        'name' => 'San Roque Permanent Evacuation Center',
        'latitude' => 6.9300,
        'longitude' => 122.0800,
        'max_capacity' => 1000,
        'current_occupancy' => 0,
        'status' => 'open',
        'facility_type' => 'permanent_shelter',
        'allowed_hazards' => ['flood', 'typhoon'],
    ]);

    $rice = InventoryItem::create([
        'item_name' => 'Rice (25kg)',
        'total_stock' => 500,
        'unit_type' => 'sacks',
    ]);

    $template = RationTemplate::create([
        'name' => 'Standard Pack',
        'is_active' => true,
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $rice->id,
        'quantity_per_head' => 1,
        'allocation_type' => 'per_head',
    ]);

    $residentUser = User::create([
        'name' => 'Ramon Alvarez',
        'email' => 'ramon.idp@test.local',
        'password' => bcrypt('password'),
        'role' => 'resident',
        'status' => 'active',
    ]);

    FamilyProfile::create([
        'user_id' => $residentUser->id,
        'headcount' => 4,
        'barangay' => 'Tetuan',
        'contact_number' => '09171112233',
        'qr_code_hash' => 'IDP_RAMON_ALVAREZ_TOKEN',
    ]);

    // First check-in: No duplicate warning
    $firstRes = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/check-in", [
        'qr_code_hash' => 'IDP_RAMON_ALVAREZ_TOKEN',
        'actual_headcount' => 4,
        'claimed_nfi_items' => ['blanket', 'hygiene_kit'],
    ]);

    $firstRes->assertStatus(200);
    expect($firstRes->json('data.has_claimed'))->toBeFalse();
    expect($firstRes->json('data.idp_headcount'))->toBe(4);

    // Verify QR route inspects anti-duplication status
    $verifyRes = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/verify-qr", [
        'qr_code_hash' => 'IDP_RAMON_ALVAREZ_TOKEN',
    ]);

    $verifyRes->assertStatus(200);
    expect($verifyRes->json('data.has_claimed'))->toBeTrue();
    expect($verifyRes->json('data.duplicate_warning'))->toContain('DUPLICATE CLAIM WARNING');

    $shelter2 = Shelter::create([
        'name' => 'Baliwasan Secondary Evacuation Facility',
        'latitude' => 6.9150,
        'longitude' => 122.0550,
        'max_capacity' => 800,
        'current_occupancy' => 0,
        'status' => 'open',
        'facility_type' => 'covered_court',
    ]);

    // Second check-in today (at shelter 2): Instant duplicate claim warning flagged
    $secondRes = $this->actingAs($staff)->postJson("/api/shelters/{$shelter2->id}/check-in", [
        'qr_code_hash' => 'IDP_RAMON_ALVAREZ_TOKEN',
        'actual_headcount' => 4,
    ]);

    $secondRes->assertStatus(200);
    expect($secondRes->json('data.has_claimed'))->toBeTrue();
    expect($secondRes->json('data.is_duplicate_claim'))->toBeTrue();
    expect($secondRes->json('data.duplicate_warning'))->toContain('DUPLICATE CLAIM WARNING');
});

test('cswdo nfi ration templates allocate per head and per family', function () {
    $staff = User::create([
        'name' => 'CSWDO Logistics',
        'email' => 'logistics@test.local',
        'password' => bcrypt('password'),
        'role' => 'lgu_staff',
        'operator_type' => 'logistics',
    ]);

    $rice = InventoryItem::create([
        'item_name' => 'Rice (25kg)',
        'total_stock' => 100,
        'unit_type' => 'sacks',
    ]);
    $blanket = InventoryItem::create([
        'item_name' => 'Warm Blankets',
        'total_stock' => 50,
        'unit_type' => 'pcs',
    ]);
    $dignity = InventoryItem::create([
        'item_name' => 'CSWDO Dignity Kit',
        'total_stock' => 50,
        'unit_type' => 'kits',
    ]);

    $template = RationTemplate::create([
        'name' => 'NFI & Food Pack',
        'is_active' => true,
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $rice->id,
        'quantity_per_head' => 1,
        'allocation_type' => 'per_head',
    ]);
    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $blanket->id,
        'quantity_per_head' => 1,
        'allocation_type' => 'per_family',
    ]);
    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $dignity->id,
        'quantity_per_head' => 1,
        'allocation_type' => 'per_family',
    ]);

    $shelter = Shelter::create([
        'name' => 'Tetuan EC',
        'latitude' => 6.9180,
        'longitude' => 122.0880,
        'max_capacity' => 500,
        'current_occupancy' => 0,
        'status' => 'open',
    ]);

    $user = User::create([
        'name' => 'Family Head',
        'email' => 'head@test.local',
        'password' => bcrypt('password'),
        'role' => 'resident',
    ]);

    FamilyProfile::create([
        'user_id' => $user->id,
        'headcount' => 5,
        'barangay' => 'Tetuan',
        'contact_number' => '09123456789',
        'qr_code_hash' => 'FAMILY_NFI_TEST',
    ]);

    $res = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/check-in", [
        'qr_code_hash' => 'FAMILY_NFI_TEST',
        'actual_headcount' => 5,
    ]);

    $res->assertStatus(200);

    // Rice (per_head) should deduct 5 * 1 = 5
    expect($rice->fresh()->total_stock)->toBe(95);
    // Blankets (per_family) should deduct 1 * 1 = 1
    expect($blanket->fresh()->total_stock)->toBe(49);
    // Dignity kits (per_family) should deduct 1 * 1 = 1
    expect($dignity->fresh()->total_stock)->toBe(49);
});

test('tumaga river corridor flood spots tiered activation tied to rain duration', function () {
    $admin = User::create([
        'name' => 'Admin User',
        'email' => 'admin@test.local',
        'password' => bcrypt('password'),
        'role' => 'admin',
    ]);

    $tier1Spot = Hazard::create([
        'name' => 'Tumaga River Tier 1: Tugbungan Downstream',
        'barangay' => 'Tugbungan',
        'corridor_name' => 'Tumaga River',
        'rainfall_trigger_minutes' => 15,
        'hazard_type' => 'flood',
        'severity_level' => 'low',
        'is_fixed_flood_spot' => true,
        'is_active' => false,
        'latitude' => 6.9080,
        'longitude' => 122.0850,
        'radius_meters' => 250,
        'reported_by' => $admin->id,
    ]);

    $tier2Spot = Hazard::create([
        'name' => 'Tumaga River Tier 2: Tumaga Mid-Corridor',
        'barangay' => 'Tumaga',
        'corridor_name' => 'Tumaga River',
        'rainfall_trigger_minutes' => 30,
        'hazard_type' => 'flood',
        'severity_level' => 'medium',
        'is_fixed_flood_spot' => true,
        'is_active' => false,
        'latitude' => 6.9320,
        'longitude' => 122.0790,
        'radius_meters' => 350,
        'reported_by' => $admin->id,
    ]);

    // Mock WeatherService so it returns isCurrentlyRaining => true
    $mockWeather = Mockery::mock(WeatherService::class);
    $mockWeather->shouldReceive('isCurrentlyRaining')->andReturn(true);
    $mockWeather->shouldReceive('getLiveTelemetry')->andReturn([
        'is_raining' => true,
        'condition' => 'Rain',
        'description' => 'Heavy Rain',
        'temp_c' => 26.5,
        'humidity' => 88,
        'rain_mm' => 18.5,
        'source' => 'mock',
    ]);
    app()->instance(WeatherService::class, $mockWeather);

    // Simulate 20 minutes continuous rain (activates Tier 1, but not Tier 2)
    Cache::forever('rain_started_at', now()->subMinutes(20)->toIso8601String());

    $res = $this->getJson('/api/weather/live-status');
    $res->assertStatus(200);

    expect((bool) $tier1Spot->fresh()->is_active)->toBeTrue();
    expect((bool) $tier2Spot->fresh()->is_active)->toBeFalse();
    expect($res->json('data.tumaga_corridor_tier'))->toBe('low');

    // Simulate 35 minutes continuous rain (activates Tier 2)
    Cache::forever('rain_started_at', now()->subMinutes(35)->toIso8601String());

    $res2 = $this->getJson('/api/weather/live-status');
    $res2->assertStatus(200);

    expect((bool) $tier2Spot->fresh()->is_active)->toBeTrue();
    expect($res2->json('data.tumaga_corridor_tier'))->toBe('medium');
});

test('sos dispatch receives vulnerable flags in pending incident payload', function () {
    $citizen = User::create([
        'name' => 'Stranded Citizen',
        'email' => 'citizen@test.local',
        'password' => bcrypt('password'),
        'role' => 'resident',
    ]);

    $res = $this->actingAs($citizen)->postJson('/api/rescue/sos', [
        'latitude' => 6.9200,
        'longitude' => 122.0750,
        'headcount' => 3,
        'hazard_type' => 'flood',
        'vulnerable_flags' => ['pwd', 'infant', 'elderly'],
    ]);

    $res->assertStatus(201);

    $incident = \App\Models\PendingIncident::latest()->first();
    expect($incident)->not->toBeNull();
    expect($incident->modifiers)->toContain('pwd');
    expect($incident->modifiers)->toContain('infant');
    expect($incident->modifiers)->toContain('elderly');
});

test('shelter api filters candidate safe zones by hazard and pinned status', function () {
    $admin = User::create([
        'name' => 'CDRRMO Officer',
        'email' => 'cdrrmo.officer@test.local',
        'password' => bcrypt('password'),
        'role' => 'admin',
    ]);

    $coveredCourt = Shelter::create([
        'name' => 'Lowland Covered Court',
        'latitude' => 6.9180,
        'longitude' => 122.0880,
        'max_capacity' => 500,
        'current_occupancy' => 0,
        'status' => 'open',
        'facility_type' => 'covered_court',
        'elevation_meters' => 5,
        'allowed_hazards' => ['flood'],
    ]);

    $openField = Shelter::create([
        'name' => 'Grandstand Open Field Safe Zone',
        'latitude' => 6.9135,
        'longitude' => 122.0600,
        'max_capacity' => 2000,
        'current_occupancy' => 0,
        'status' => 'open',
        'facility_type' => 'open_field',
        'elevation_meters' => 12,
        'allowed_hazards' => ['earthquake', 'flood'],
    ]);

    $permanentCenter = Shelter::create([
        'name' => 'Pasonanca Permanent Evacuation Center',
        'latitude' => 6.9450,
        'longitude' => 122.0700,
        'max_capacity' => 1000,
        'current_occupancy' => 0,
        'status' => 'open',
        'facility_type' => 'permanent_shelter',
        'elevation_meters' => 28,
        'allowed_hazards' => ['flood'],
        'pinned_by' => $admin->id,
    ]);

    // 1. Earthquake filter: excludes covered court, selects open field
    $eqRes = $this->actingAs($admin)->getJson('/api/shelters?hazard=earthquake');
    $eqRes->assertStatus(200);
    $eqNames = collect($eqRes->json('data'))->pluck('name');
    expect($eqNames)->toContain('Grandstand Open Field Safe Zone');
    expect($eqNames)->not->toContain('Lowland Covered Court');

    // 2. Flood filter: includes flood-capable permanent shelter and flood facilities
    $floodRes = $this->actingAs($admin)->getJson('/api/shelters?hazard=flood');
    $floodRes->assertStatus(200);
    $floodNames = collect($floodRes->json('data'))->pluck('name');
    expect($floodNames)->toContain('Pasonanca Permanent Evacuation Center');

    // 3. Pinned safe zone filter: returns only CDRRMO custom-pinned safe zones
    $pinnedRes = $this->actingAs($admin)->getJson('/api/shelters?pinned=1');
    $pinnedRes->assertStatus(200);
    $pinnedNames = collect($pinnedRes->json('data'))->pluck('name');
    expect($pinnedNames)->toContain('Pasonanca Permanent Evacuation Center');
    expect($pinnedNames)->not->toContain('Lowland Covered Court');
});

test('cswdo ration templates support food packs, blankets/mats, hygiene kits, dignity kits, and medicine kits', function () {
    $staff = User::create([
        'name' => 'CSWDO Gate Officer',
        'email' => 'cswdo.gate@test.local',
        'password' => bcrypt('password'),
        'role' => 'lgu_staff',
        'operator_type' => 'scanner',
    ]);

    $shelter = Shelter::create([
        'name' => 'Joaquin Enriquez Memorial Sports Complex',
        'latitude' => 6.9150,
        'longitude' => 122.0650,
        'max_capacity' => 1500,
        'current_occupancy' => 0,
        'status' => 'open',
        'facility_type' => 'permanent_shelter',
    ]);

    // 1. Food pack (per family)
    $foodPack = InventoryItem::create([
        'item_name' => 'CSWDO Family Food Pack',
        'total_stock' => 100,
        'unit_type' => 'packs',
    ]);

    // 2. Non-food items: blankets & sleeping mats
    $mats = InventoryItem::create([
        'item_name' => 'Thermal Blankets & Sleeping Mats',
        'total_stock' => 100,
        'unit_type' => 'sets',
    ]);

    // 3. Hygiene kits (family level)
    $hygiene = InventoryItem::create([
        'item_name' => 'CSWDO Family Hygiene Kit',
        'total_stock' => 100,
        'unit_type' => 'kits',
    ]);

    // 4. Dignity kits (per female adolescent/adult)
    $dignity = InventoryItem::create([
        'item_name' => 'CSWDO Dignity Kit (Women & Girls)',
        'total_stock' => 100,
        'unit_type' => 'kits',
    ]);

    // 5. Medicine / medical kits
    $meds = InventoryItem::create([
        'item_name' => 'First Aid & Essential Medicines Kit',
        'total_stock' => 100,
        'unit_type' => 'kits',
    ]);

    $template = RationTemplate::create([
        'name' => 'Comprehensive CSWDO IDP Humanitarian Relief Pack',
        'is_active' => true,
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $foodPack->id,
        'quantity_per_head' => 1,
        'allocation_type' => 'per_family',
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $mats->id,
        'quantity_per_head' => 1,
        'allocation_type' => 'per_family',
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $hygiene->id,
        'quantity_per_head' => 1,
        'allocation_type' => 'per_family',
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $dignity->id,
        'quantity_per_head' => 1,
        'allocation_type' => 'per_female',
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $meds->id,
        'quantity_per_head' => 1,
        'allocation_type' => 'per_family',
    ]);

    $residentUser = User::create([
        'name' => 'Maria Santos Family',
        'email' => 'santos.idp@test.local',
        'password' => bcrypt('password'),
        'role' => 'resident',
    ]);

    $profile = FamilyProfile::create([
        'user_id' => $residentUser->id,
        'headcount' => 6,
        'barangay' => 'Baliwasan',
        'contact_number' => '09181234567',
        'qr_code_hash' => 'IDP_SANTOS_QR_HASH_TOKEN',
    ]);

    // Process check-in with partial arrival (4 out of 6 present)
    $res = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/check-in", [
        'qr_code_hash' => 'IDP_SANTOS_QR_HASH_TOKEN',
        'actual_headcount' => 4,
        'claimed_nfi_items' => ['food_pack', 'blanket_mat', 'hygiene_kit', 'dignity_kit', 'medicines'],
    ]);

    $res->assertStatus(200);
    $res->assertJsonPath('data.action', 'checkin');
    $res->assertJsonPath('data.idp_headcount', 4);

    // Verify stock deductions
    expect($foodPack->fresh()->total_stock)->toBe(99); // 1 per family
    expect($mats->fresh()->total_stock)->toBe(99); // 1 per family
    expect($hygiene->fresh()->total_stock)->toBe(99); // 1 per family
    expect($dignity->fresh()->total_stock)->toBe(98); // 2 female kits for 4 IDPs present (ceil(4/2) = 2)
    expect($meds->fresh()->total_stock)->toBe(99); // 1 per family

    // Verify resident my-status endpoint reflects issued relief
    $statusRes = $this->actingAs($residentUser)->getJson('/api/my-status');
    $statusRes->assertStatus(200);
    expect($statusRes->json('status'))->toBe('safe');
    expect($statusRes->json('shelter_name'))->toBe('Joaquin Enriquez Memorial Sports Complex');
    expect($statusRes->json('relief_status'))->toBe('claimed');
    expect($statusRes->json('ration_claimed'))->toBeTrue();
});

test('earthquake service distinguishes offshore tsunami threat vs inland duck cover hold shaking', function () {
    $service = app(\App\Services\EarthquakeService::class);

    // Case A: Inland shaking (no tsunami) -> Duck, Cover & Hold
    $inlandGuidance = $service->determineGuidance(
        mag: 5.4,
        distKm: 25.0,
        depthKm: 15.0,
        intensity: 5.8,
        tsunami: 0
    );

    expect($inlandGuidance['tier'])->toBe('emergency');
    expect($inlandGuidance['tsunami_threat'])->toBeFalse();
    expect($inlandGuidance['action'])->toBe('Duck, Cover & Hold');
    expect($inlandGuidance['directive'])->toContain('Duck, Cover & Hold under a sturdy desk or table');

    // Case B: Offshore seismic event with tsunami flag (Sulu / Cotabato Trench) -> Coastal Tsunami Warning
    $tsunamiGuidance = $service->determineGuidance(
        mag: 6.7,
        distKm: 120.0,
        depthKm: 20.0,
        intensity: 5.0,
        tsunami: 1
    );

    expect($tsunamiGuidance['tier'])->toBe('emergency');
    expect($tsunamiGuidance['tsunami_threat'])->toBeTrue();
    expect($tsunamiGuidance['action'])->toBe('Evacuate Coastal Areas Inland');
    expect($tsunamiGuidance['title'])->toBe('🌊 TSUNAMI EVACUATION WARNING');
    expect($tsunamiGuidance['directive'])->toContain('Coastal barangays');
    expect($tsunamiGuidance['directive'])->toContain('KCC Mall / Gov. Camins and above');
});

test('shelter and evacuation log eloquent models support allowed_hazards, idp terminology, and geojson properties', function () {
    $admin = User::create([
        'name' => 'CDRRMO Lead Admin',
        'email' => 'cdrrmo.lead@test.local',
        'password' => bcrypt('password'),
        'role' => 'admin',
    ]);

    // 1. Shelter Creation via API with allowed_hazards
    $createRes = $this->actingAs($admin)->postJson('/api/shelters', [
        'name' => 'Sta. Maria Secondary Evacuation Staging Site',
        'latitude' => 6.9250,
        'longitude' => 122.0720,
        'max_capacity' => 600,
        'facility_type' => 'permanent_shelter',
        'allowed_hazards' => ['flood', 'tsunami'],
        'status' => 'open',
    ]);
    $createRes->assertStatus(201);
    expect($createRes->json('data.allowed_hazards'))->toBe(['flood', 'tsunami']);

    $shelterId = $createRes->json('data.id');

    // 2. Shelter Update via API with modified allowed_hazards
    $updateRes = $this->actingAs($admin)->putJson("/api/shelters/{$shelterId}", [
        'allowed_hazards' => ['flood', 'typhoon', 'general'],
    ]);
    $updateRes->assertStatus(200);
    expect($updateRes->json('data.allowed_hazards'))->toBe(['flood', 'typhoon', 'general']);

    // 3. GeoJSON Feature verification
    $mapRes = $this->actingAs($admin)->getJson('/api/shelters/map');
    $mapRes->assertStatus(200);
    $features = collect($mapRes->json('features'));
    $matched = $features->firstWhere('properties.id', $shelterId);
    expect($matched)->not->toBeNull();
    expect($matched['properties']['current_idps'])->toBe(0);
    expect($matched['properties']['allowed_hazards'])->toBe(['flood', 'typhoon', 'general']);

    // 4. EvacuationLog IDP Headcount and Duplicate Warning verification
    $resident = User::create([
        'name' => 'IDP Beneficiary User',
        'email' => 'idp.beneficiary@test.local',
        'password' => bcrypt('password'),
        'role' => 'resident',
    ]);
    $profile = FamilyProfile::create([
        'user_id' => $resident->id,
        'headcount' => 5,
        'barangay' => 'Sta. Maria',
        'contact_number' => '09199998877',
        'qr_code_hash' => 'IDP_TEST_HASH_HEADCOUNT',
    ]);
    $log = EvacuationLog::create([
        'family_profile_id' => $profile->id,
        'shelter_id' => $shelterId,
        'recorded_headcount' => 5,
        'actual_headcount' => 4,
        'is_duplicate_claim_warning' => true,
        'nfi_items_claimed' => ['sleeping_mat', 'blanket'],
    ]);

    expect($log->idp_headcount)->toBe(4);
    expect($log->is_duplicate_claim_warning)->toBeTrue();
    expect($log->nfi_items_claimed)->toBe(['sleeping_mat', 'blanket']);

    // 5. Hazard corridor and rainfall trigger attributes
    $hazard = Hazard::create([
        'name' => 'Vitali River High Water Mark',
        'barangay' => 'Vitali',
        'corridor_name' => 'Vitali River Corridor',
        'rainfall_trigger_minutes' => 45,
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'latitude' => 7.2100,
        'longitude' => 122.2800,
        'reported_by' => $admin->id,
        'is_active' => true,
    ]);
    expect($hazard->corridor_name)->toBe('Vitali River Corridor');
    expect($hazard->rainfall_trigger_minutes)->toBe(45);
});
