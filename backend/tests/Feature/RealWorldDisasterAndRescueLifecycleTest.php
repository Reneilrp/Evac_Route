<?php

use App\Models\AuditLog;
use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Hazard;
use App\Models\PendingIncident;
use App\Models\RescueMission;
use App\Models\RescueUnit;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 1: RESIDENT EMERGENCY SOS -> DRRMO SMART DISPATCH -> RESCUER EXECUTION -> CSWDO INTAKE
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW 1: End-to-end Search & Rescue lifecycle without simulation', function () {
    // 1. Setup Actors & Environment
    $resident = User::factory()->create([
        'name' => 'Maria Santos',
        'role' => 'resident',
    ]);
    FamilyProfile::create([
        'user_id' => $resident->id,
        'contact_number' => '09171112222',
        'barangay' => 'Baliwasan',
        'headcount' => 4,
        'qr_code_hash' => \Illuminate\Support\Str::random(32),
    ]);

    $drrmo = User::factory()->create([
        'name' => 'CDRRMO Dispatcher Commander',
        'role' => 'admin',
    ]);

    $rescuer = User::factory()->create([
        'name' => 'Lt. Cruz (WASAR Lead)',
        'role' => 'lgu_staff',
        'operator_type' => 'rescue',
    ]);

    $rescueUnit = RescueUnit::create([
        'name' => 'Zamboanga Rescue Boat Alpha',
        'call_sign' => 'BOAT-ALPHA',
        'unit_type' => 'water_rescue',
        'status' => 'standby',
        'assigned_personnel_id' => $rescuer->id,
        'contact_number' => '0917-RESCUE-01',
        'capacity_persons' => 8,
    ]);

    $shelter = Shelter::create([
        'name' => 'Baliwasan Gym Evacuation Center',
        'latitude' => 6.9126,
        'longitude' => 122.0573,
        'elevation_meters' => 10,
        'barangay' => 'Baliwasan',
        'max_capacity' => 200,
        'current_occupancy' => 30,
        'status' => 'open',
    ]);

    // ─── STEP 1: Resident Submits Live Emergency SOS ───
    $sosPayload = [
        'latitude' => 6.9180,
        'longitude' => 122.0620,
        'headcount' => 4,
        'hazard_type' => 'flood',
        'modifiers' => ['elderly', 'infant', 'roof_trapped'],
        'situation' => '🚨 URGENT FLOOD RESCUE: 4 person(s) stranded on rooftop at Baliwasan Coastal. Elderly with wheelchair.',
        'contact_number' => '09171112222',
    ];

    $sosResponse = $this->actingAs($resident)
        ->postJson('/api/rescue/sos', $sosPayload);

    $sosResponse->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.headcount', 4)
        ->assertJsonPath('data.hazard_type', 'flood');

    $incidentId = $sosResponse->json('data.incident_id');
    $incident = PendingIncident::findOrFail($incidentId);
    expect($incident->headcount)->toBe(4)
        ->and($incident->modifiers)->toContain('elderly', 'infant', 'roof_trapped')
        ->and($incident->status)->toBe('pending');

    // ─── STEP 2: DRRMO Command Center Receives and Dispatches Unit ───
    // DRRM fetches pending distress calls
    $queueResponse = $this->actingAs($drrmo)
        ->getJson('/api/incidents?status=pending');

    $queueResponse->assertStatus(200);

    // DRRM dispatches Rescue Boat Alpha with smart recommendations
    $dispatchPayload = [
        'rescue_unit_id' => $rescueUnit->id,
        'pending_incident_id' => $incidentId,
        'victim_name' => 'Maria Santos and Family',
        'victim_phone' => '09171112222',
        'victim_latitude' => 6.9180,
        'victim_longitude' => 122.0620,
        'barangay' => 'Baliwasan',
        'headcount' => 4,
        'triage_level' => 'critical',
        'status' => 'en_route', // automatic accept
        'target_shelter_id' => $shelter->id,
        'equipments' => ['rubber_boat', 'life_vests', 'first_aid', 'vhf_radios'],
    ];

    $dispatchResponse = $this->actingAs($drrmo)
        ->postJson('/api/rescue/missions', $dispatchPayload);

    $dispatchResponse->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.status', 'en_route')
        ->assertJsonPath('data.headcount', 4)
        ->assertJsonPath('data.target_shelter_id', $shelter->id);

    $missionId = $dispatchResponse->json('data.id');
    expect($rescueUnit->fresh()->status)->toBe('en_route');

    // ─── STEP 3: Rescuer Mobile Fetches Active Mission & Drives to Scene ───
    $rescuerMissions = $this->actingAs($rescuer)
        ->getJson('/api/rescue/missions?active_only=1');

    $rescuerMissions->assertStatus(200)
        ->assertJsonPath('status', 'success');

    // Rescuer arrives on scene (within 20m geofence trigger)
    $onSceneResponse = $this->actingAs($rescuer)
        ->putJson("/api/rescue/missions/{$missionId}/status", [
            'status' => 'on_scene',
            'current_latitude' => 6.9180,
            'current_longitude' => 122.0620,
        ]);

    $onSceneResponse->assertStatus(200);
    expect($rescueUnit->fresh()->status)->toBe('on_scene');

    // ─── STEP 4: Victims Secured & Rerouted to Shelter ───
    $transportResponse = $this->actingAs($rescuer)
        ->putJson("/api/rescue/missions/{$missionId}/status", [
            'status' => 'transporting',
            'target_shelter_id' => $shelter->id,
            'current_latitude' => 6.9150,
            'current_longitude' => 122.0600,
        ]);

    $transportResponse->assertStatus(200);
    expect($rescueUnit->fresh()->status)->toBe('transporting');

    // ─── STEP 5: Shelter Gate Arrival & CSWDO Intake Handover ───
    $completeResponse = $this->actingAs($rescuer)
        ->putJson("/api/rescue/missions/{$missionId}/status", [
            'status' => 'completed',
            'target_shelter_id' => $shelter->id,
            'current_latitude' => 6.9126,
            'current_longitude' => 122.0573,
        ]);

    $completeResponse->assertStatus(200);

    // 1. Unit returns to standby for next emergency
    expect($rescueUnit->fresh()->status)->toBe('standby');

    // 2. Shelter capacity automatically incremented by 4 (30 + 4 = 34)
    expect($shelter->fresh()->current_occupancy)->toBe(34);

    // 3. Official Evacuation Log entry generated
    $evacLog = EvacuationLog::where('shelter_id', $shelter->id)->latest()->first();
    expect($evacLog)->not->toBeNull()
        ->and($evacLog->checkin_method)->toBe('rescue_intake')
        ->and($evacLog->recorded_headcount)->toBe(4);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 2: FIELD INCIDENT REPORTING WITH MULTI-PHOTO UPLOAD & HAZARD AVOIDANCE
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW 2: Resident multi-photo field report, hotspot evaluation, and hazard approval', function () {
    $resident = User::factory()->create(['role' => 'resident']);
    $drrmo = User::factory()->create(['role' => 'admin']);

    // 1. Resident uploads field report with 3 photos
    $photos = [
        UploadedFile::fake()->image('flood1.jpg', 800, 600),
        UploadedFile::fake()->image('flood2.jpg', 800, 600),
        UploadedFile::fake()->image('flood3.jpg', 800, 600),
    ];

    $reportResponse = $this->actingAs($resident)
        ->post('/api/incidents', [
            'name' => 'Severe Flash Flood on Main Highway',
            'latitude' => 6.9150,
            'longitude' => 122.0750,
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'description' => 'Water reached 1.2m, completely impassable for sedans.',
            'photos' => $photos,
        ]);

    $reportResponse->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.severity_level', 'high');

    $incidentId = $reportResponse->json('data.id');
    $incident = PendingIncident::findOrFail($incidentId);
    expect(count($incident->photos))->toBe(3);

    // 2. DRRMO Reviews Pending Queue & checks AI Hotspot Evaluation
    $reviewResponse = $this->actingAs($drrmo)
        ->getJson('/api/incidents?status=pending');

    $reviewResponse->assertStatus(200);
    $firstItem = collect($reviewResponse->json('data.data'))->firstWhere('id', $incidentId);
    expect($firstItem)->not->toBeNull()
        ->and($firstItem)->toHaveKey('frequency_evaluation')
        ->and(count($firstItem['photo_urls']))->toBe(3);

    // 3. DRRMO Approves Incident -> Creates Active Map Hazard
    $approveResponse = $this->actingAs($drrmo)
        ->postJson("/api/incidents/{$incidentId}/approve", [
            'radius_meters' => 350,
        ]);

    $approveResponse->assertStatus(200)
        ->assertJsonPath('status', 'success');

    // Verify Hazard created in active hazards database
    $hazard = Hazard::where('hazard_type', 'flood')->latest()->first();
    expect($hazard)->not->toBeNull()
        ->and($hazard->radius_meters)->toBe(350)
        ->and($hazard->is_active)->toBe(1);

    // 4. Verify Active Hazards endpoint delivers hazard for A* router
    $hazardsResponse = $this->getJson('/api/hazards');
    $hazardsResponse->assertStatus(200)
        ->assertJsonPath('status', 'success');
    expect(collect($hazardsResponse->json('data'))->contains('id', $hazard->id))->toBeTrue();
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 3: FIRE SUPPRESSION MISSION (DIRECT THREAT NEUTRALIZATION - NO SHELTER)
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW 3: Fire suppression mission concludes directly on scene without shelter transport', function () {
    $resident = User::factory()->create(['role' => 'resident']);
    $drrmo = User::factory()->create(['role' => 'admin']);
    $rescuer = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'rescue']);

    $fireTruck = RescueUnit::create([
        'name' => 'BFP Fire Engine 03',
        'call_sign' => 'FIRE-03',
        'unit_type' => 'high_clearance_truck',
        'status' => 'standby',
        'assigned_personnel_id' => $rescuer->id,
    ]);

    // Resident reports structure fire
    $sosResponse = $this->actingAs($resident)->postJson('/api/rescue/sos', [
        'latitude' => 6.9250,
        'longitude' => 122.0850,
        'headcount' => 8,
        'hazard_type' => 'fire',
        'modifiers' => ['trapped_on_roof'],
        'situation' => 'Commercial structure fire, second alarm.',
    ]);

    $incidentId = $sosResponse->json('data.incident_id');

    // DRRMO dispatches Fire Engine
    $dispatchResponse = $this->actingAs($drrmo)->postJson('/api/rescue/missions', [
        'rescue_unit_id' => $fireTruck->id,
        'pending_incident_id' => $incidentId,
        'victim_name' => 'Commercial Store Fire',
        'victim_latitude' => 6.9250,
        'victim_longitude' => 122.0850,
        'headcount' => 8,
        'status' => 'en_route',
        'equipments' => ['scba_gear', 'first_aid', 'extrication_tools'],
    ]);

    $missionId = $dispatchResponse->json('data.id');

    // Rescuer arrives and NEUTRALIZES THREAT directly
    $completeResponse = $this->actingAs($rescuer)->putJson("/api/rescue/missions/{$missionId}/status", [
        'status' => 'completed',
        'notes' => 'Fire declared under control (Fire Out). Building evacuated.',
    ]);

    $completeResponse->assertStatus(200);
    expect($fireTruck->fresh()->status)->toBe('standby');
    expect(RescueMission::find($missionId)->status)->toBe('completed');
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 4: MEDICAL EMERGENCY & TRAUMA CARE DISPATCH
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW 4: Medical / trauma emergency ambulance dispatch and transport', function () {
    $resident = User::factory()->create(['role' => 'resident']);
    $drrmo = User::factory()->create(['role' => 'admin']);
    $medic = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'rescue']);

    $ambulance = RescueUnit::create([
        'name' => 'EMS Ambulance 01',
        'call_sign' => 'AMB-01',
        'unit_type' => 'medical_ambulance',
        'status' => 'standby',
        'assigned_personnel_id' => $medic->id,
    ]);

    $hospitalShelter = Shelter::create([
        'name' => 'Zamboanga City Medical Center Field Triage',
        'latitude' => 6.9210,
        'longitude' => 122.0720,
        'elevation_meters' => 15,
        'barangay' => 'Sta. Maria',
        'max_capacity' => 50,
        'current_occupancy' => 5,
        'status' => 'open',
    ]);

    // Resident submits Medical SOS
    $sosResponse = $this->actingAs($resident)->postJson('/api/rescue/sos', [
        'latitude' => 6.9200,
        'longitude' => 122.0700,
        'headcount' => 1,
        'hazard_type' => 'medical',
        'modifiers' => ['injured', 'pwd'],
        'situation' => 'Head injury from falling debris. Unconscious.',
    ]);

    $incidentId = $sosResponse->json('data.incident_id');

    // DRRMO dispatches Ambulance
    $dispatchResponse = $this->actingAs($drrmo)->postJson('/api/rescue/missions', [
        'rescue_unit_id' => $ambulance->id,
        'pending_incident_id' => $incidentId,
        'victim_name' => 'Trauma Patient',
        'victim_latitude' => 6.9200,
        'victim_longitude' => 122.0700,
        'headcount' => 1,
        'status' => 'en_route',
        'target_shelter_id' => $hospitalShelter->id,
        'equipments' => ['first_aid', 'spine_board', 'vhf_radios'],
    ]);

    $missionId = $dispatchResponse->json('data.id');

    // Medic delivers patient to hospital field triage
    $completeResponse = $this->actingAs($medic)->putJson("/api/rescue/missions/{$missionId}/status", [
        'status' => 'completed',
        'target_shelter_id' => $hospitalShelter->id,
    ]);

    $completeResponse->assertStatus(200);
    expect($ambulance->fresh()->status)->toBe('standby')
        ->and($hospitalShelter->fresh()->current_occupancy)->toBe(6);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 5: TWO-TIER WATER RESCUE / SHORELINE STAGING HANDOVER
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW 5: Rescue boat hands over victims at staging assembly point and is immediately released', function () {
    $drrmo = User::factory()->create(['role' => 'admin']);
    $boatOperator = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'rescue']);

    $boat = RescueUnit::create([
        'name' => 'Zamboanga Rescue Boat Charlie',
        'call_sign' => 'CHARLIE',
        'unit_type' => 'water_rescue',
        'status' => 'on_scene',
        'assigned_personnel_id' => $boatOperator->id,
    ]);

    $stagingPoint = Shelter::create([
        'name' => 'Tetuan Bridge Assembly Point',
        'latitude' => 6.9180,
        'longitude' => 122.0850,
        'elevation_meters' => 12,
        'barangay' => 'Tetuan',
        'max_capacity' => 100,
        'current_occupancy' => 0,
        'status' => 'open',
        'facility_type' => 'assembly_point',
    ]);

    $mission = RescueMission::create([
        'control_no' => 'RES-2026-STAGED',
        'rescue_unit_id' => $boat->id,
        'dispatched_by' => $drrmo->id,
        'status' => 'on_scene',
        'triage_level' => 'critical',
        'victim_name' => 'Rooftop Evacuees',
        'victim_latitude' => 6.9190,
        'victim_longitude' => 122.0860,
        'headcount' => 7,
    ]);

    // Rescuer / DRRMO triggers Staging Handover
    $stagedResponse = $this->actingAs($drrmo)->putJson("/api/rescue/missions/{$mission->id}/status", [
        'status' => 'staged_at_assembly',
        'staging_point_id' => $stagingPoint->id,
    ]);

    $stagedResponse->assertStatus(200);

    // Boat is IMMEDIATELY FREED (standby) so it can perform more flood rescues
    expect($boat->fresh()->status)->toBe('standby')
        ->and($stagingPoint->fresh()->current_occupancy)->toBe(7);
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 6: CSWDO SHELTER RAPID CHECK-IN & RELIEF CLAIM
// ─────────────────────────────────────────────────────────────────────────────
test('FLOW 6: Evacuee QR intake registration and relief goods claim ticket', function () {
    $resident = User::factory()->create(['role' => 'resident']);
    $family = FamilyProfile::create([
        'user_id' => $resident->id,
        'contact_number' => '09172223333',
        'barangay' => 'Baliwasan',
        'headcount' => 5,
        'qr_code_hash' => \Illuminate\Support\Str::random(32),
    ]);

    $shelterStaff = User::factory()->create([
        'name' => 'CSWDO Shelter Manager',
        'role' => 'lgu_staff',
        'operator_type' => 'logistics',
    ]);

    $shelter = Shelter::create([
        'name' => 'Baliwasan Elementary Evacuation Center',
        'latitude' => 6.9130,
        'longitude' => 122.0590,
        'elevation_meters' => 11,
        'barangay' => 'Baliwasan',
        'max_capacity' => 150,
        'current_occupancy' => 20,
        'status' => 'open',
    ]);

    // 1. Staff performs QR scanner check-in using resident's QR code hash
    $qrCheckInResponse = $this->actingAs($shelterStaff)
        ->postJson("/api/shelters/{$shelter->id}/check-in", [
            'qr_code_hash' => $family->qr_code_hash,
        ]);

    $qrCheckInResponse->assertStatus(200)
        ->assertJsonPath('status', 'success');

    // Shelter occupancy updated (20 + 5 = 25)
    expect($shelter->fresh()->current_occupancy)->toBe(25);

    // Evacuation Log recorded
    $log = EvacuationLog::where('family_profile_id', $family->id)->first();
    expect($log)->not->toBeNull()
        ->and($log->shelter_id)->toBe($shelter->id)
        ->and($log->recorded_headcount)->toBe(5);

    // 2. Staff performs Walk-in Rapid Check-in for an unregistered evacuee on-the-fly
    $walkInResponse = $this->actingAs($shelterStaff)
        ->postJson("/api/shelters/{$shelter->id}/rapid-check-in", [
            'name' => 'Walkin Evacuee Head',
            'barangay' => 'Baliwasan',
            'headcount' => 3,
            'contact_number' => '09179998888',
        ]);

    $walkInResponse->assertStatus(200)
        ->assertJsonPath('status', 'success');

    // Shelter occupancy updated again (25 + 3 = 28)
    expect($shelter->fresh()->current_occupancy)->toBe(28);
});
