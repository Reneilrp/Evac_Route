<?php

namespace Tests\Feature;

use App\Models\RescueUnit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RescueVehicleFleetManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;
    private User $officerA;
    private User $officerB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
            'operator_type' => 'drrmo',
        ]);

        $this->officerA = User::factory()->create([
            'name' => 'Officer Juan Dela Cruz',
            'email' => 'juan.delacruz@zamboanga.gov.ph',
            'role' => 'lgu_staff',
            'operator_type' => 'rescue_leader',
        ]);

        $this->officerB = User::factory()->create([
            'name' => 'Captain Maria Santos',
            'email' => 'maria.santos@zamboanga.gov.ph',
            'role' => 'lgu_staff',
            'operator_type' => 'rescue_leader',
        ]);
    }

    public function test_can_register_new_vehicle_and_assign_officer(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'name' => 'Zamboanga Rescue Watercraft Bravo',
            'call_sign' => 'BOAT-BRAVO',
            'unit_type' => 'water_rescue',
            'capacity_persons' => 10,
            'contact_number' => '0917-BOAT-02',
            'assigned_personnel_id' => $this->officerA->id,
            'current_latitude' => 6.9214,
            'current_longitude' => 122.0790,
        ];

        $response = $this->postJson('/api/rescue/units', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'Zamboanga Rescue Watercraft Bravo')
            ->assertJsonPath('data.call_sign', 'BOAT-BRAVO')
            ->assertJsonPath('data.assigned_personnel_id', $this->officerA->id);

        $this->assertDatabaseHas('rescue_units', [
            'call_sign' => 'BOAT-BRAVO',
            'assigned_personnel_id' => $this->officerA->id,
            'status' => 'standby',
        ]);

        // Verify bidirectional link in users table
        $this->officerA->refresh();
        $unit = RescueUnit::where('call_sign', 'BOAT-BRAVO')->first();
        $this->assertEquals($unit->id, $this->officerA->assigned_rescue_unit_id);
        $this->assertEquals('boat_pilot', $this->officerA->rescue_role);
    }

    public function test_can_reassign_vehicle_to_different_officer(): void
    {
        Sanctum::actingAs($this->adminUser);

        $unit = RescueUnit::create([
            'name' => 'Ambulance Unit 5',
            'call_sign' => 'MED-05',
            'unit_type' => 'medical_ambulance',
            'status' => 'standby',
            'capacity_persons' => 4,
            'assigned_personnel_id' => $this->officerA->id,
        ]);
        $this->officerA->update(['assigned_rescue_unit_id' => $unit->id, 'rescue_role' => 'lead_medic']);

        // Now reassign to Officer B
        $response = $this->putJson("/api/rescue/units/{$unit->id}", [
            'assigned_personnel_id' => $this->officerB->id,
            'capacity_persons' => 5,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.assigned_personnel_id', $this->officerB->id);

        // Previous officer should have assigned_rescue_unit_id set to null
        $this->officerA->refresh();
        $this->assertNull($this->officerA->assigned_rescue_unit_id);

        // New officer should now have assigned_rescue_unit_id set to this unit
        $this->officerB->refresh();
        $this->assertEquals($unit->id, $this->officerB->assigned_rescue_unit_id);
        $this->assertEquals('lead_medic', $this->officerB->rescue_role);
    }

    public function test_can_unassign_officer_from_vehicle(): void
    {
        Sanctum::actingAs($this->adminUser);

        $unit = RescueUnit::create([
            'name' => 'Heavy 4x4 Truck Delta',
            'call_sign' => 'TRUCK-DELTA',
            'unit_type' => 'high_clearance_truck',
            'status' => 'standby',
            'capacity_persons' => 12,
            'assigned_personnel_id' => $this->officerA->id,
        ]);
        $this->officerA->update(['assigned_rescue_unit_id' => $unit->id]);

        // Unassign by passing null
        $response = $this->putJson("/api/rescue/units/{$unit->id}", [
            'assigned_personnel_id' => null,
        ]);

        $response->assertStatus(200);

        $this->officerA->refresh();
        $this->assertNull($this->officerA->assigned_rescue_unit_id);

        $unit->refresh();
        $this->assertNull($unit->assigned_personnel_id);
    }

    public function test_can_toggle_vehicle_readiness_status(): void
    {
        Sanctum::actingAs($this->adminUser);

        $unit = RescueUnit::create([
            'name' => 'Utility Patrol 1',
            'call_sign' => 'PATROL-01',
            'unit_type' => 'high_clearance_truck',
            'status' => 'standby',
            'capacity_persons' => 6,
        ]);

        // Set to off_duty
        $response = $this->putJson("/api/rescue/units/{$unit->id}", [
            'status' => 'off_duty',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('off_duty', $unit->fresh()->status);

        // Set back to standby
        $response2 = $this->putJson("/api/rescue/units/{$unit->id}", [
            'status' => 'standby',
        ]);

        $response2->assertStatus(200);
        $this->assertEquals('standby', $unit->fresh()->status);
    }

    public function test_can_remove_vehicle_from_fleet_and_clear_staff_association(): void
    {
        Sanctum::actingAs($this->adminUser);

        $unit = RescueUnit::create([
            'name' => 'Retiring Boat Alpha',
            'call_sign' => 'BOAT-ALPHA',
            'unit_type' => 'water_rescue',
            'status' => 'standby',
            'capacity_persons' => 6,
            'assigned_personnel_id' => $this->officerA->id,
        ]);
        $this->officerA->update(['assigned_rescue_unit_id' => $unit->id]);

        $response = $this->deleteJson("/api/rescue/units/{$unit->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseMissing('rescue_units', ['id' => $unit->id]);

        $this->officerA->refresh();
        $this->assertNull($this->officerA->assigned_rescue_unit_id);
    }

    public function test_can_fetch_single_vehicle_with_captain_and_crew_details(): void
    {
        Sanctum::actingAs($this->adminUser);

        $unit = RescueUnit::create([
            'name' => 'Flagship Rescue Boat Alpha',
            'call_sign' => 'BOAT-ALPHA-01',
            'unit_type' => 'water_rescue',
            'status' => 'standby',
            'capacity_persons' => 8,
            'contact_number' => '0917-HOTLINE-1',
            'assigned_personnel_id' => $this->officerA->id,
        ]);
        $this->officerA->update([
            'assigned_rescue_unit_id' => $unit->id,
            'rescue_role' => 'boat_pilot',
            'status' => 'active',
        ]);

        // Add additional crew member
        $crewMember = User::factory()->create([
            'name' => 'Swimmer Pedro Gomez',
            'email' => 'pedro.gomez@zamboanga.gov.ph',
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'rescue_role' => 'rescue_swimmer',
            'assigned_rescue_unit_id' => $unit->id,
            'status' => 'active',
        ]);

        $response = $this->getJson("/api/rescue/units/{$unit->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.id', $unit->id)
            ->assertJsonPath('data.assigned_personnel.id', $this->officerA->id)
            ->assertJsonPath('data.assigned_personnel.name', $this->officerA->name)
            ->assertJsonPath('data.assigned_personnel.rescue_role', 'boat_pilot');

        $crewData = $response->json('data.crew_members');
        $this->assertIsArray($crewData);
        $this->assertCount(2, $crewData); // Both officerA and crewMember have assigned_rescue_unit_id = unit->id
    }

    public function test_units_index_includes_crew_and_missions_count(): void
    {
        Sanctum::actingAs($this->adminUser);

        $unit = RescueUnit::create([
            'name' => 'Fast Craft Charlie',
            'call_sign' => 'BOAT-CHARLIE',
            'unit_type' => 'water_rescue',
            'status' => 'standby',
            'capacity_persons' => 6,
            'assigned_personnel_id' => $this->officerB->id,
        ]);
        $this->officerB->update([
            'assigned_rescue_unit_id' => $unit->id,
            'rescue_role' => 'boat_pilot',
        ]);

        $response = $this->getJson('/api/rescue/units');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $unitData = collect($response->json('data'))->firstWhere('id', $unit->id);
        $this->assertNotNull($unitData);
        $this->assertEquals($this->officerB->id, $unitData['assigned_personnel']['id']);
        $this->assertEquals('boat_pilot', $unitData['assigned_personnel']['rescue_role']);
        $this->assertArrayHasKey('missions_count', $unitData);
        $this->assertArrayHasKey('crew_members', $unitData);
    }
}
