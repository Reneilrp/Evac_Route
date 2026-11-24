<?php

namespace Tests\Feature;

use App\Models\Hazard;
use App\Models\PendingIncident;
use App\Models\RescueMission;
use App\Models\RescueUnit;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IncidentValidationAndHazardTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_report_instantly_creates_active_hazard(): void
    {
        $resident = User::factory()->create([
            'role' => 'resident',
        ]);
        Sanctum::actingAs($resident);

        $payload = [
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'latitude' => 6.9214,
            'longitude' => 122.0790,
            'barangay' => 'Tetuan',
            'radius_meters' => 120,
            'geometry_type' => 'circle',
            'description' => 'Knee deep flood on main road',
        ];

        $response = $this->postJson('/api/incidents', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.validation_status', 'community_active');
        $response->assertJsonPath('data.name', 'Flood Incident — Barangay Tetuan');

        // Verify Hazard was instantly created and is active on live map
        $this->assertDatabaseHas('hazards', [
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'is_active' => true,
            'origin_type' => 'resident_report',
            'validation_status' => 'unverified',
            'is_validated_by_cdrrmo' => false,
            'radius_meters' => 120,
            'barangay' => 'Tetuan',
        ]);

        $this->assertDatabaseHas('pending_incidents', [
            'hazard_type' => 'flood',
            'validation_status' => 'community_active',
            'status' => 'pending',
            'radius_meters' => 120,
        ]);
    }

    public function test_cdrrmo_can_validate_incident_report(): void
    {
        $resident = User::factory()->create(['role' => 'resident']);
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($resident);
        $createRes = $this->postJson('/api/incidents', [
            'hazard_type' => 'landslide',
            'severity_level' => 'medium',
            'latitude' => 6.9300,
            'longitude' => 122.0800,
            'barangay' => 'Pasonanca',
        ]);
        $incidentId = $createRes->json('data.id');

        // CDRRMO validates the report
        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/incidents/{$incidentId}/validate", [
            'note' => 'Verified by field inspector team Bravo.',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('pending_incidents', [
            'id' => $incidentId,
            'status' => 'approved',
            'validation_status' => 'cdrrmo_validated',
            'reviewed_by' => $admin->id,
        ]);

        $this->assertDatabaseHas('hazards', [
            'pending_incident_id' => $incidentId,
            'is_validated_by_cdrrmo' => true,
            'validation_status' => 'cdrrmo_validated',
            'is_active' => true,
        ]);
    }

    public function test_cdrrmo_can_dismiss_false_incident_hazard(): void
    {
        $resident = User::factory()->create(['role' => 'resident']);
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($resident);
        $createRes = $this->postJson('/api/incidents', [
            'hazard_type' => 'flood',
            'severity_level' => 'low',
            'latitude' => 6.9100,
            'longitude' => 122.0700,
            'barangay' => 'Baliwasan',
        ]);
        $incidentId = $createRes->json('data.id');

        // CDRRMO dismisses the false report
        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/incidents/{$incidentId}/dismiss", [
            'note' => 'Water already subsided. Road fully clear.',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');

        // Hazard must be deactivated from the map
        $this->assertDatabaseHas('hazards', [
            'pending_incident_id' => $incidentId,
            'is_active' => false,
            'validation_status' => 'dismissed',
        ]);

        $this->assertDatabaseHas('pending_incidents', [
            'id' => $incidentId,
            'status' => 'rejected',
            'validation_status' => 'dismissed',
        ]);
    }

    public function test_sos_hotspot_evaluates_cluster_without_drainage_flag(): void
    {
        $resident = User::factory()->create(['role' => 'resident']);

        // Seed 2 existing SOS calls in same 200m area
        PendingIncident::create([
            'reported_by' => $resident->id,
            'name' => 'EMERGENCY SOS: Flood Rescue',
            'hazard_type' => 'sos',
            'severity_level' => 'high',
            'latitude' => 6.9200,
            'longitude' => 122.0800,
            'headcount' => 3,
            'modifiers' => ['elderly'],
            'status' => 'pending',
        ]);
        PendingIncident::create([
            'reported_by' => $resident->id,
            'name' => 'EMERGENCY SOS: Stranded Family',
            'hazard_type' => 'sos',
            'severity_level' => 'high',
            'latitude' => 6.9205,
            'longitude' => 122.0805,
            'headcount' => 4,
            'modifiers' => ['infant'],
            'status' => 'pending',
        ]);

        $controller = new \App\Http\Controllers\Api\IncidentController();
        $eval = $controller->evaluateFrequency(6.9202, 122.0802, 'sos', null, true);

        // Assert SOS cluster recognized
        $this->assertTrue($eval['is_sos_cluster']);
        $this->assertGreaterThanOrEqual(2, $eval['nearby_sos_count']);
        $this->assertStringContainsString('MASS RESCUE CLUSTER', $eval['evaluation_summary']);
        // Assert drainage recommendation is SUPPRESSED for SOS
        $this->assertFalse($eval['recommended_fixed_spot']);
    }

    public function test_hazard_creation_without_estimated_duration_hours(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $payload = [
            'name' => 'Fallen Electric Pole on Nuñez St',
            'hazard_type' => 'debris',
            'severity_level' => 'high',
            'latitude' => 6.9150,
            'longitude' => 122.0650,
            'radius_meters' => 60,
        ];

        $response = $this->postJson('/api/hazards', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('hazards', [
            'name' => 'Fallen Electric Pole on Nuñez St',
            'estimated_duration_hours' => null,
            'is_active' => true,
        ]);
    }

    public function test_multi_unit_dispatch_creates_missions_for_all_selected_units(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $unit1 = RescueUnit::create([
            'name' => 'Water Rescue Unit Alpha',
            'call_sign' => 'WR-01',
            'unit_type' => 'water_rescue',
            'capacity' => 4,
            'status' => 'standby',
        ]);
        $unit2 = RescueUnit::create([
            'name' => 'Water Rescue Unit Bravo',
            'call_sign' => 'WR-02',
            'unit_type' => 'water_rescue',
            'capacity' => 4,
            'status' => 'standby',
        ]);

        $shelter = Shelter::create([
            'name' => 'Baliwasan Central Gym',
            'barangay' => 'Baliwasan',
            'latitude' => 6.9180,
            'longitude' => 122.0600,
            'max_capacity' => 300,
            'current_occupancy' => 50,
            'status' => 'open',
        ]);

        $payload = [
            'rescue_unit_ids' => [$unit1->id, $unit2->id],
            'victim_name' => 'Flores Family (8 Persons)',
            'victim_latitude' => 6.9250,
            'victim_longitude' => 122.0750,
            'barangay' => 'Tetuan',
            'headcount' => 8,
            'target_shelter_id' => $shelter->id,
            'status' => 'en_route',
            'equipments' => ['rubber_boat', 'life_vests'],
        ];

        $response = $this->postJson('/api/rescue/missions', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('status', 'success');

        // Both units should now have dispatched/en_route missions
        $this->assertDatabaseHas('rescue_missions', [
            'rescue_unit_id' => $unit1->id,
            'victim_name' => 'Flores Family (8 Persons)',
            'status' => 'en_route',
        ]);
        $this->assertDatabaseHas('rescue_missions', [
            'rescue_unit_id' => $unit2->id,
            'victim_name' => 'Flores Family (8 Persons)',
            'status' => 'en_route',
        ]);

        $this->assertEquals('en_route', $unit1->fresh()->status);
        $this->assertEquals('en_route', $unit2->fresh()->status);
    }

    public function test_rescuer_can_dynamically_change_target_shelter_during_transport(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $unit = RescueUnit::create([
            'name' => 'Ambulance 01',
            'call_sign' => 'MED-01',
            'unit_type' => 'medical_ambulance',
            'capacity' => 2,
            'status' => 'transporting',
        ]);

        $shelterOld = Shelter::create([
            'name' => 'Shelter A (Full)',
            'barangay' => 'Tetuan',
            'latitude' => 6.9200,
            'longitude' => 122.0700,
            'max_capacity' => 100,
            'current_occupancy' => 100,
            'status' => 'open',
        ]);

        $shelterNew = Shelter::create([
            'name' => 'Shelter B (Open)',
            'barangay' => 'Sta. Maria',
            'latitude' => 6.9300,
            'longitude' => 122.0800,
            'max_capacity' => 200,
            'current_occupancy' => 20,
            'status' => 'open',
        ]);

        $mission = RescueMission::create([
            'control_no' => 'RES-2026-9999',
            'rescue_unit_id' => $unit->id,
            'dispatched_by' => $admin->id,
            'status' => 'transporting',
            'victim_name' => 'Juan Dela Cruz',
            'victim_latitude' => 6.9220,
            'victim_longitude' => 122.0720,
            'headcount' => 1,
            'target_shelter_id' => $shelterOld->id,
        ]);

        // Rescuer switches shelter to Shelter B dynamically
        $response = $this->patchJson("/api/rescue/missions/{$mission->id}", [
            'target_shelter_id' => $shelterNew->id,
            'notes' => 'Rerouting: Shelter A reached 100% capacity.',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('rescue_missions', [
            'id' => $mission->id,
            'status' => 'transporting',
            'target_shelter_id' => $shelterNew->id,
        ]);
        $this->assertEquals($shelterNew->id, $mission->fresh()->target_shelter_id);
    }
}
