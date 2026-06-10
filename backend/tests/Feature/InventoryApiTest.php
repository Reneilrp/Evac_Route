<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Shelter;
use App\Models\FamilyProfile;
use App\Models\InventoryItem;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_add_inventory_item()
    {
        $user = User::factory()->create(['role' => 'lgu_staff']);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/inventory', [
            'item_name' => 'Sacks of Rice',
            'total_stock' => 100,
            'unit_type' => 'sacks'
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('inventory_items', [
            'item_name' => 'Sacks of Rice',
            'total_stock' => 100
        ]);
    }

    public function test_can_create_ration_template()
    {
        $user = User::factory()->create(['role' => 'lgu_staff']);
        $item1 = InventoryItem::create(['item_name' => 'Rice', 'total_stock' => 500, 'unit_type' => 'pcs']);
        $item2 = InventoryItem::create(['item_name' => 'Canned Goods', 'total_stock' => 500, 'unit_type' => 'pcs']);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/rations/template', [
            'name' => 'Level 1 Flood Kit',
            'is_active' => true,
            'items' => [
                ['inventory_item_id' => $item1->id, 'quantity_per_head' => 3],
                ['inventory_item_id' => $item2->id, 'quantity_per_head' => 2]
            ]
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('ration_templates', ['name' => 'Level 1 Flood Kit', 'is_active' => true]);
        $this->assertDatabaseHas('ration_template_items', [
            'inventory_item_id' => $item1->id,
            'quantity_per_head' => 3
        ]);
    }

    public function test_end_to_end_checkin()
    {
        $user = User::factory()->create(['role' => 'lgu_staff']);
        $family = FamilyProfile::create([
            'user_id' => $user->id,
            'headcount' => 4,
            'contact_number' => '1234567890',
            'barangay' => 'Tetuan',
            'qr_code_hash' => 'hash123'
        ]);

        $shelter = Shelter::create([
            'name' => 'Tetuan Covered Court',
            'latitude' => 6.9,
            'longitude' => 122.0,
            'max_capacity' => 100,
            'current_occupancy' => 0,
            'status' => 'open',
            'pinned_by' => $user->id
        ]);

        $item1 = InventoryItem::create(['item_name' => 'Rice', 'total_stock' => 100, 'unit_type' => 'pcs']);
        
        $this->actingAs($user, 'sanctum')->postJson('/api/rations/template', [
            'name' => 'Level 1 Flood Kit',
            'is_active' => true,
            'items' => [
                ['inventory_item_id' => $item1->id, 'quantity_per_head' => 3],
            ]
        ]);

        $response = $this->postJson("/api/shelters/{$shelter->id}/check-in", [
            'qr_code_hash' => 'hash123'
        ]);

        $response->assertStatus(200);

        // Check shelter capacity
        $this->assertDatabaseHas('shelters', [
            'id' => $shelter->id,
            'current_occupancy' => 4
        ]);

        // Check log
        $this->assertDatabaseHas('evacuation_logs', [
            'family_profile_id' => $family->id,
            'shelter_id' => $shelter->id,
            'recorded_headcount' => 4,
            'ration_claimed' => 1
        ]);

        // Check inventory deduction
        // Headcount 4 * 3 Rice = 12 Rice deducted. 100 - 12 = 88
        $this->assertDatabaseHas('inventory_items', [
            'id' => $item1->id,
            'total_stock' => 88
        ]);
    }
}
