<?php

use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Hazard;
use App\Models\RescueMission;
use App\Models\RescueUnit;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

test('WMSU FLOOD SCENARIO: Hazard detection, proximity evaluation, SOS distress order, and full rescue lifecycle', function () {
    // ─── STEP 1: Resident at WMSU (Baliwasan, Zamboanga City) ───
    $wmsuLat = 6.9152;
    $wmsuLng = 122.0614;

    $resident = User::factory()->create([
        'name' => 'Al-Rashid WMSU Resident',
        'role' => 'resident',
        'last_latitude' => $wmsuLat,
        'last_longitude' => $wmsuLng,
    ]);

    $profile = FamilyProfile::create([
        'user_id' => $resident->id,
        'contact_number' => '09170001234',
        'barangay' => 'Baliwasan',
        'headcount' => 4,
        'qr_code_hash' => 'QR-WMSU-' . Str::upper(Str::random(16)),
        'home_latitude' => $wmsuLat,
        'home_longitude' => $wmsuLng,
    ]);

    expect((float)$resident->last_latitude)->toBe($wmsuLat);
    expect((float)$resident->last_longitude)->toBe($wmsuLng);

    // ─── STEP 2: CDRRMO Admin Creates Flood Hazard Around WMSU ───
    $drrmo = User::factory()->create([
        'name' => 'CDRRMO Dispatch Commander',
        'role' => 'admin',
    ]);

    $hazardResponse = $this->actingAs($drrmo)->postJson('/api/hazards', [
        'name' => 'WMSU Campus Rising Flood Surge',
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'latitude' => $wmsuLat,
        'longitude' => $wmsuLng,
        'radius_meters' => 500,
        'description' => 'Rapid floodwaters entering WMSU campus buildings along Normal Road.',
    ]);

    $hazardResponse->assertStatus(201);
    $hazard = Hazard::where('name', 'WMSU Campus Rising Flood Surge')->first();
    expect($hazard)->not->toBeNull();
    expect($hazard->is_active)->toBeTruthy();

    // ─── STEP 3: Mathematical Proximity Threat Detection ───
    $lat1 = $resident->last_latitude;
    $lon1 = $resident->last_longitude;
    $lat2 = $hazard->latitude;
    $lon2 = $hazard->longitude;

    $R = 6371000;
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2) * sin($dLon/2);
    $distanceToHazard = $R * (2 * atan2(sqrt($a), sqrt(1-$a)));
    $dangerBuffer = $hazard->radius_meters + 300;

    expect($distanceToHazard)->toBeLessThanOrEqual($dangerBuffer);

    // ─── STEP 4: Safe Target Shelter Selection Outside Flood ───
    $shelter = Shelter::create([
        'name' => 'Baliwasan Gymnasium Cluster',
        'barangay' => 'Baliwasan',
        'latitude' => 6.9126,
        'longitude' => 122.0573,
        'max_capacity' => 250,
        'current_occupancy' => 30,
        'status' => 'open',
    ]);

    // ─── STEP 5: Resident Trapped at WMSU Submits SOS Distress Ticket ───
    $sosResponse = $this->actingAs($resident)->postJson('/api/rescue/sos', [
        'latitude' => $wmsuLat,
        'longitude' => $wmsuLng,
        'headcount' => 4,
        'situation' => 'Trapped on WMSU campus 2nd floor due to rapid floodwaters along Normal Road.',
        'hazard_type' => 'flood',
    ]);

    $sosResponse->assertStatus(201);
    $incidentId = $sosResponse->json('data.incident_id');
    expect($incidentId)->not->toBeNull();

    // ─── STEP 6: CDRRMO Dispatches Quick Response Team (QRT) ───
    $rescuer = User::factory()->create([
        'name' => 'Officer Marco (WASAR Unit)',
        'role' => 'lgu_staff',
        'operator_type' => 'rescue',
    ]);

    $unit = RescueUnit::create([
        'name' => 'Alpha Watercraft 1',
        'call_sign' => 'QRT-WATER-ALPHA',
        'unit_type' => 'water_rescue',
        'capacity_persons' => 10,
        'status' => 'standby',
        'current_latitude' => 6.9120,
        'current_longitude' => 122.0650,
        'assigned_personnel_id' => $rescuer->id,
    ]);

    $dispatchResponse = $this->actingAs($drrmo)->postJson('/api/rescue/missions', [
        'rescue_unit_id' => $unit->id,
        'pending_incident_id' => $incidentId,
        'victim_name' => $resident->name,
        'victim_phone' => '09170001234',
        'victim_latitude' => $wmsuLat,
        'victim_longitude' => $wmsuLng,
        'barangay' => 'Baliwasan',
        'headcount' => 4,
        'special_needs' => 'Stretcher for elderly family member, life vest for infant',
        'situation_description' => 'Trapped on WMSU campus 2nd floor due to rapid floodwaters along Normal Road.',
        'target_shelter_id' => $shelter->id,
        'triage_level' => 'critical',
        'status' => 'dispatched',
    ]);

    $dispatchResponse->assertStatus(201);
    $missionId = $dispatchResponse->json('data.id');
    $mission = RescueMission::find($missionId);
    expect($mission)->not->toBeNull();
    expect($mission->status)->toBe('dispatched');
    expect($mission->rescue_unit_id)->toBe($unit->id);

    // ─── STEP 7: Rescuer Stepper Flow (En Route ➔ Victims Secured ➔ Arrived at Shelter) ───
    // 7.1 En Route to WMSU
    $this->actingAs($rescuer)->putJson("/api/rescue/missions/{$mission->id}/status", [
        'status' => 'en_route',
    ])->assertStatus(200);
    expect($mission->fresh()->status)->toBe('en_route');

    // 7.2 Victims Secured at WMSU Campus
    $this->actingAs($rescuer)->putJson("/api/rescue/missions/{$mission->id}/status", [
        'status' => 'transporting',
    ])->assertStatus(200);
    expect($mission->fresh()->status)->toBe('transporting');

    // 7.3 Arrived at Shelter Gate 20m Geofence (Completes mission & bridges to shelter)
    $this->actingAs($rescuer)->putJson("/api/rescue/missions/{$mission->id}/status", [
        'status' => 'completed',
    ])->assertStatus(200);
    expect($mission->fresh()->status)->toBe('completed');

    // ─── STEP 8: Shelter Gate Admission & Occupancy Bridge Verification ───
    expect($shelter->fresh()->current_occupancy)->toBe(34); // 30 + 4
    expect(EvacuationLog::where('family_profile_id', $profile->id)->exists())->toBeTrue();
});
