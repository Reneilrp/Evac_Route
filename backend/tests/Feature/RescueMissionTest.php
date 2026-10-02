<?php

use App\Models\RescueMission;
use App\Models\RescueUnit;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('CDRRMO admin can view rescue units fleet roster', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    RescueUnit::create([
        'name' => 'Boat Alpha',
        'call_sign' => 'ALPHA',
        'unit_type' => 'water_rescue',
        'status' => 'standby',
    ]);

    $response = $this->actingAs($admin)
        ->getJson('/api/rescue/units');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonCount(1, 'data');
});

test('CDRRMO admin can dispatch a rescue unit to stranded victims', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $unit = RescueUnit::create([
        'name' => 'Boat Alpha',
        'call_sign' => 'ALPHA',
        'unit_type' => 'water_rescue',
        'status' => 'standby',
    ]);
    $shelter = Shelter::create([
        'name' => 'Tetuan Gym',
        'latitude' => 6.9185,
        'longitude' => 122.0882,
        'elevation_meters' => 12,
        'barangay' => 'Tetuan',
        'max_capacity' => 150,
        'current_occupancy' => 10,
        'status' => 'open',
    ]);

    $payload = [
        'rescue_unit_id' => $unit->id,
        'victim_name' => 'John Doe and Family',
        'victim_phone' => '09171234567',
        'victim_latitude' => 6.9200,
        'victim_longitude' => 122.0800,
        'barangay' => 'Tetuan',
        'headcount' => 4,
        'special_needs' => '1 senior citizen',
        'situation_description' => 'Water 1.5m deep near bridge',
        'triage_level' => 'critical',
        'target_shelter_id' => $shelter->id,
    ];

    $response = $this->actingAs($admin)
        ->postJson('/api/rescue/missions', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.status', 'dispatched')
        ->assertJsonPath('data.headcount', 4);

    expect($unit->fresh()->status)->toBe('dispatched');
});

test('busy rescue unit cannot be dispatched to another mission', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $unit = RescueUnit::create([
        'name' => 'Boat Alpha',
        'call_sign' => 'ALPHA',
        'unit_type' => 'water_rescue',
        'status' => 'on_scene',
    ]);

    $payload = [
        'rescue_unit_id' => $unit->id,
        'victim_name' => 'Jane Smith',
        'victim_latitude' => 6.9200,
        'victim_longitude' => 122.0800,
        'headcount' => 2,
        'triage_level' => 'urgent',
    ];

    $response = $this->actingAs($admin)
        ->postJson('/api/rescue/missions', $payload);

    $response->assertStatus(422);
});

test('responder stepper updates and completed mission triggers shelter bridge', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $unit = RescueUnit::create([
        'name' => 'Boat Alpha',
        'call_sign' => 'ALPHA',
        'unit_type' => 'water_rescue',
        'status' => 'standby',
    ]);
    $shelter = Shelter::create([
        'name' => 'Baliwasan Gym',
        'latitude' => 6.9126,
        'longitude' => 122.0573,
        'elevation_meters' => 8,
        'barangay' => 'Baliwasan',
        'max_capacity' => 200,
        'current_occupancy' => 20,
        'status' => 'open',
    ]);

    $mission = RescueMission::create([
        'control_no' => 'RES-2026-TEST',
        'rescue_unit_id' => $unit->id,
        'dispatched_by' => $admin->id,
        'status' => 'dispatched',
        'triage_level' => 'critical',
        'victim_name' => 'Trapped Family',
        'victim_latitude' => 6.9150,
        'victim_longitude' => 122.0780,
        'headcount' => 5,
        'target_shelter_id' => $shelter->id,
    ]);

    // 1. En route
    $this->actingAs($admin)->putJson("/api/rescue/missions/{$mission->id}/status", [
        'status' => 'en_route',
    ])->assertStatus(200);

    expect($unit->fresh()->status)->toBe('en_route');

    // 2. On scene
    $this->actingAs($admin)->putJson("/api/rescue/missions/{$mission->id}/status", [
        'status' => 'on_scene',
    ])->assertStatus(200);

    expect($unit->fresh()->status)->toBe('on_scene');

    // 3. Completed (evacuated to shelter)
    $this->actingAs($admin)->putJson("/api/rescue/missions/{$mission->id}/status", [
        'status' => 'completed',
        'target_shelter_id' => $shelter->id,
    ])->assertStatus(200);

    // Unit returns to standby
    expect($unit->fresh()->status)->toBe('standby');

    // Shelter occupancy auto-incremented by headcount (20 + 5 = 25)
    expect($shelter->fresh()->current_occupancy)->toBe(25);
});

test('resident can submit emergency rescue SOS', function () {
    $resident = User::factory()->create(['role' => 'resident']);

    $response = $this->actingAs($resident)->postJson('/api/rescue/sos', [
        'latitude' => 6.9150,
        'longitude' => 122.0750,
        'headcount' => 3,
        'situation' => 'Rapid flood rise on street',
        'contact_number' => '09170000000',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.status', 'pending_rescue_dispatch');
});

test('water rescue boat can drop victims at staging assembly point and instantly release unit', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $unit = RescueUnit::create([
        'name' => 'Rescue Boat Beta',
        'call_sign' => 'BETA',
        'unit_type' => 'water_rescue',
        'status' => 'on_scene',
    ]);
    $stagingPoint = Shelter::create([
        'name' => 'Tetuan Bridge Staging Point',
        'latitude' => 6.9170,
        'longitude' => 122.0860,
        'elevation_meters' => 14,
        'barangay' => 'Tetuan',
        'max_capacity' => 200,
        'current_occupancy' => 0,
        'status' => 'open',
        'facility_type' => 'assembly_point',
    ]);
    $mission = RescueMission::create([
        'control_no' => 'RES-2026-9999',
        'rescue_unit_id' => $unit->id,
        'dispatched_by' => $admin->id,
        'status' => 'on_scene',
        'triage_level' => 'critical',
        'victim_name' => 'Flooded Rooftop Family',
        'victim_latitude' => 6.9180,
        'victim_longitude' => 122.0850,
        'headcount' => 6,
    ]);

    // 1-Tap Handover to Staging Point
    $response = $this->actingAs($admin)->putJson("/api/rescue/missions/{$mission->id}/status", [
        'status' => 'staged_at_assembly',
        'staging_point_id' => $stagingPoint->id,
    ]);

    $response->assertStatus(200);

    // Verify unit is INSTANTLY RELEASED (standby) so it can return to flood
    expect($unit->fresh()->status)->toBe('standby');

    // Verify mission record
    $freshMission = $mission->fresh();
    expect($freshMission->status)->toBe('staged_at_assembly');
    expect($freshMission->staging_point_id)->toBe($stagingPoint->id);

    // Verify staging assembly point occupancy reflects the waiting evacuees (+6)
    expect($stagingPoint->fresh()->current_occupancy)->toBe(6);
});

test('individual rescuers can be registered with specific crew roles and assigned to a fleet vehicle', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $vehicle = RescueUnit::create([
        'name' => 'Zamboanga Rescue Boat Charlie',
        'call_sign' => 'BOAT-CHARLIE',
        'unit_type' => 'water_rescue',
        'capacity_persons' => 8,
        'status' => 'standby',
    ]);

    // Register Pilot
    $pilotRes = $this->actingAs($admin)->postJson('/api/staff', [
        'name' => 'Officer Juan Dela Cruz',
        'email' => 'pilot.juan@lgu.gov.ph',
        'password' => 'password123',
        'role' => 'lgu_staff',
        'operator_type' => 'rescue',
        'assigned_rescue_unit_id' => $vehicle->id,
        'rescue_role' => 'boat_pilot',
        'status' => 'active',
    ]);

    $pilotRes->assertStatus(201);
    expect($pilotRes->json('data.assigned_rescue_unit.id'))->toBe($vehicle->id);
    expect($pilotRes->json('data.rescue_role'))->toBe('boat_pilot');

    // Register Medic on the same vehicle
    $medicRes = $this->actingAs($admin)->postJson('/api/staff', [
        'name' => 'Paramedic Maria Santos',
        'email' => 'medic.maria@lgu.gov.ph',
        'password' => 'password123',
        'role' => 'lgu_staff',
        'operator_type' => 'rescue',
        'assigned_rescue_unit_id' => $vehicle->id,
        'rescue_role' => 'lead_medic',
        'status' => 'active',
    ]);

    $medicRes->assertStatus(201);
    expect($medicRes->json('data.assigned_rescue_unit.id'))->toBe($vehicle->id);
    expect($medicRes->json('data.rescue_role'))->toBe('lead_medic');

    // Verify vehicle fleet roster lists both rescuers as crew members
    $unitsRes = $this->actingAs($admin)->getJson('/api/rescue/units');
    $unitsRes->assertStatus(200);

    $unitData = collect($unitsRes->json('data'))->firstWhere('call_sign', 'BOAT-CHARLIE');
    expect($unitData)->not->toBeNull();
    expect(count($unitData['crew_members']))->toBe(2);

    // Verify rescuer logging in via /api/user sees their vehicle and crew role
    $pilotUser = User::where('email', 'pilot.juan@lgu.gov.ph')->first();
    $userProfileRes = $this->actingAs($pilotUser)->getJson('/api/user');
    $userProfileRes->assertStatus(200);
    expect($userProfileRes->json('assigned_rescue_unit.call_sign'))->toBe('BOAT-CHARLIE');
    expect($userProfileRes->json('rescue_role'))->toBe('boat_pilot');
});
