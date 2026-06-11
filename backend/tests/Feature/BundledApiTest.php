<?php

namespace Tests\Feature;

use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Hazard;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BundledApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $resident;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->resident = User::factory()->create([
            'role' => 'resident',
            'status' => 'active',
        ]);
    }

    public function test_dashboard_overview_returns_consolidated_data()
    {
        // Seed database
        $shelter = Shelter::create([
            'name' => 'Main Shelter',
            'latitude' => 6.9,
            'longitude' => 122.0,
            'max_capacity' => 100,
            'current_occupancy' => 10,
            'status' => 'open',
            'pinned_by' => $this->admin->id,
        ]);

        $hazard = Hazard::create([
            'name' => 'Flooded area',
            'latitude' => 6.91,
            'longitude' => 122.01,
            'radius_meters' => 100,
            'reported_by' => $this->admin->id,
        ]);

        $inventory = InventoryItem::create([
            'item_name' => 'Canned Beans',
            'total_stock' => 200,
            'unit_type' => 'pcs',
        ]);

        $family = FamilyProfile::create([
            'user_id' => $this->resident->id,
            'headcount' => 4,
            'contact_number' => '1234567890',
            'barangay' => 'Tetuan',
            'qr_code_hash' => 'hash123',
        ]);

        $log = EvacuationLog::create([
            'family_profile_id' => $family->id,
            'shelter_id' => $shelter->id,
            'recorded_headcount' => 4,
            'ration_claimed' => false,
            'checked_in_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/dashboard/overview');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'shelters',
            'hazards',
            'recent_logs',
            'inventory',
        ]);

        $this->assertCount(1, $response->json('shelters'));
        $this->assertCount(1, $response->json('hazards'));
        $this->assertCount(1, $response->json('recent_logs'));
        $this->assertCount(1, $response->json('inventory'));
    }

    public function test_map_dashboard_returns_active_shelters_and_hazards()
    {
        // 1. Open and not full shelter (should be returned)
        Shelter::create([
            'name' => 'Open Shelter',
            'latitude' => 6.9,
            'longitude' => 122.0,
            'max_capacity' => 100,
            'current_occupancy' => 10,
            'status' => 'open',
            'pinned_by' => $this->admin->id,
        ]);

        // 2. Full shelter (should not be returned in map / active endpoint)
        Shelter::create([
            'name' => 'Full Shelter',
            'latitude' => 6.91,
            'longitude' => 122.01,
            'max_capacity' => 10,
            'current_occupancy' => 10,
            'status' => 'full',
            'pinned_by' => $this->admin->id,
        ]);

        // 3. Active hazard
        Hazard::create([
            'name' => 'Fire area',
            'latitude' => 6.92,
            'longitude' => 122.02,
            'radius_meters' => 50,
            'reported_by' => $this->admin->id,
            'is_active' => true,
        ]);

        // 4. Inactive hazard (should not be returned)
        Hazard::create([
            'name' => 'Resolved area',
            'latitude' => 6.93,
            'longitude' => 122.03,
            'radius_meters' => 50,
            'reported_by' => $this->admin->id,
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/map/dashboard');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'shelters',
            'hazards',
        ]);

        // Assert only active shelters/hazards are loaded
        $this->assertCount(1, $response->json('shelters'));
        $this->assertEquals('Open Shelter', $response->json('shelters.0.name'));
        $this->assertCount(1, $response->json('hazards'));
        $this->assertEquals('Fire area', $response->json('hazards.0.name'));
    }

    public function test_inventory_dashboard_returns_items_and_templates()
    {
        InventoryItem::create([
            'item_name' => 'Bottled Water',
            'total_stock' => 1000,
            'unit_type' => 'bottles',
        ]);

        RationTemplate::create([
            'name' => 'Standard Ration Kit',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/inventory/dashboard');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'inventory',
            'templates',
        ]);

        $this->assertCount(1, $response->json('inventory'));
        $this->assertCount(1, $response->json('templates'));
    }

    public function test_shelters_dashboard_returns_shelters_and_templates()
    {
        Shelter::create([
            'name' => 'Test Shelter',
            'latitude' => 6.9,
            'longitude' => 122.0,
            'max_capacity' => 100,
            'current_occupancy' => 0,
            'status' => 'open',
            'pinned_by' => $this->admin->id,
        ]);

        RationTemplate::create([
            'name' => 'Active Ration Template',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/shelters/dashboard');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'shelters',
            'templates',
        ]);

        $this->assertCount(1, $response->json('shelters'));
        $this->assertCount(1, $response->json('templates'));
    }

    public function test_resident_cannot_access_bundled_apis()
    {
        $response = $this->actingAs($this->resident, 'sanctum')
            ->getJson('/api/dashboard/overview');

        $response->assertStatus(403);
    }

    public function test_resident_can_access_resident_map_data()
    {
        Shelter::create([
            'name' => 'Open Shelter',
            'latitude' => 6.9,
            'longitude' => 122.0,
            'max_capacity' => 100,
            'current_occupancy' => 10,
            'status' => 'open',
            'pinned_by' => $this->admin->id,
        ]);

        Hazard::create([
            'name' => 'Fire area',
            'latitude' => 6.92,
            'longitude' => 122.02,
            'radius_meters' => 50,
            'reported_by' => $this->admin->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->resident, 'sanctum')
            ->getJson('/api/resident/map-data');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'shelters',
            'hazards',
        ]);

        $this->assertCount(1, $response->json('shelters'));
        $this->assertCount(1, $response->json('hazards'));
    }

    public function test_unauthenticated_cannot_access_resident_map_data()
    {
        $response = $this->getJson('/api/resident/map-data');

        $response->assertStatus(401);
    }
}
