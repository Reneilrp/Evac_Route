<?php

namespace Tests\Feature;

use App\Models\DispatchOrder;
use App\Models\DispatchOrderItem;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportPrintTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_without_token_is_forbidden_from_printing_stock_report(): void
    {
        $response = $this->get('/reports/stock-print');
        $response->assertStatus(403);
    }

    public function test_authorized_user_with_token_can_print_stock_report_blade(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);
        $token = $admin->createToken('test_print_token')->plainTextToken;

        InventoryItem::create([
            'item_name' => 'Premium Rice 50kg Sack',
            'total_stock' => 1500,
            'reserved_quantity' => 100,
            'unit_type' => 'sacks',
        ]);

        $response = $this->get("/reports/stock-print?token={$token}");
        $response->assertStatus(200);
        $response->assertSee('City Social Welfare and Development Office (CSWDO)');
        $response->assertSee('Premium Rice 50kg Sack');
        $response->assertSee('Warehouse Logistics Custodian');
        $response->assertSee('CSWDO Department Head');
    }

    public function test_authorized_user_can_print_shelter_capacity_report_blade(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);
        $token = $admin->createToken('test_print_token')->plainTextToken;

        Shelter::create([
            'name' => 'Armor Village Covered Court',
            'barangay' => 'San Jose Gusu',
            'max_capacity' => 350,
            'current_occupancy' => 4,
            'status' => 'open',
            'latitude' => 6.9214,
            'longitude' => 122.0790,
        ]);

        $response = $this->get("/reports/shelter-capacity-print?token={$token}");
        $response->assertStatus(200);
        $response->assertSee('Armor Village Covered Court');
        $response->assertSee('San Jose Gusu');
        $response->assertSee('CSWDO Camp Coordination Officer');
    }

    public function test_authorized_user_can_print_single_shelter_ration_report_blade(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);
        $token = $admin->createToken('test_print_token')->plainTextToken;

        $shelter = Shelter::create([
            'name' => 'Armor Village Covered Court',
            'barangay' => 'San Jose Gusu',
            'max_capacity' => 350,
            'current_occupancy' => 4,
            'status' => 'open',
            'latitude' => 6.9214,
            'longitude' => 122.0790,
        ]);

        $response = $this->get("/reports/shelter-ration-print/{$shelter->id}?token={$token}&mode=occupancy");
        $response->assertStatus(200);
        $response->assertSee('Armor Village Covered Court');
        $response->assertSee('Live Occupancy');
        $response->assertSee('Shelter Camp Manager');
    }

    public function test_authorized_user_can_print_dispatch_manifest_report_blade(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);
        $token = $admin->createToken('test_print_token')->plainTextToken;

        $shelter = Shelter::create([
            'name' => 'Armor Village Covered Court',
            'barangay' => 'San Jose Gusu',
            'max_capacity' => 350,
            'current_occupancy' => 4,
            'status' => 'open',
            'latitude' => 6.9214,
            'longitude' => 122.0790,
        ]);

        $item = InventoryItem::create([
            'item_name' => 'CSWDO Ready-to-Eat Food Pack',
            'total_stock' => 500,
            'reserved_quantity' => 50,
            'unit_type' => 'packs',
            'category' => 'food_pack',
        ]);

        $order = DispatchOrder::create([
            'created_by' => $admin->id,
            'shelter_id' => $shelter->id,
            'status' => 'pending',
            'notes' => 'Priority dispatch for high-water advisory.',
        ]);

        DispatchOrderItem::create([
            'dispatch_order_id' => $order->id,
            'inventory_item_id' => $item->id,
            'quantity' => 20,
        ]);

        $response = $this->get("/reports/dispatch-manifest-print/{$order->id}?token={$token}");
        $response->assertStatus(200);
        $response->assertSee('Disaster Relief Requisition &amp; Transport Manifest', false);
        $response->assertSee('Armor Village Covered Court');
        $response->assertSee('CSWDO Ready-to-Eat Food Pack');
        $response->assertSee('Priority dispatch for high-water advisory.');
        $response->assertSee('Official Custody Turnover &amp; COA Accountability Sign-off', false);

        // Also test with /api/ prefix
        $apiResponse = $this->get("/api/reports/dispatch-manifest-print/{$order->id}?token={$token}");
        $apiResponse->assertStatus(200);
        $apiResponse->assertSee('CSWDO Ready-to-Eat Food Pack');
    }
}
