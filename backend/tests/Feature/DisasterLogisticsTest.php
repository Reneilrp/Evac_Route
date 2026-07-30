<?php

use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\RationTemplateItem;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create an active admin user for the required auth middleware
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
});

it('allows check-in under emergency overflow state when capacity is exceeded (REV-04)', function () {
    // 1. Mock two shelters
    $shelterA = Shelter::create([
        'name' => 'Shelter A',
        'latitude' => 10.0,
        'longitude' => 10.0,
        'max_capacity' => 10,
        'current_occupancy' => 8,
        'status' => 'open',
    ]);

    $shelterB = Shelter::create([
        'name' => 'Shelter B',
        'latitude' => 10.1,
        'longitude' => 10.1,
        'max_capacity' => 50,
        'current_occupancy' => 0,
        'status' => 'open',
    ]);

    // 2. Simulate a family profile with headcount 5 (total 13 > 10 max capacity)
    $user = User::factory()->create();
    $family = FamilyProfile::create([
        'user_id' => $user->id,
        'headcount' => 5,
        'contact_number' => '09123456789',
        'barangay' => 'Test',
        'qr_code_hash' => 'hash_test_123',
        'transportation_mode' => 'pedestrian',
    ]);

    // 3. Act: Check-in request to Shelter A (Overflow allowed)
    Sanctum::actingAs($this->admin, ['*']);

    $response = $this->postJson("/api/shelters/{$shelterA->id}/check-in", [
        'qr_code_hash' => 'hash_test_123',
    ]);

    // 4. Assert: Returns status 200 under Emergency Overflow
    $response->assertStatus(200)
        ->assertJsonPath('status', 'success');

    // 5. Assert: Shelter A's occupancy is 13 and status is 'full'
    $shelterA->refresh();
    expect($shelterA->current_occupancy)->toBe(13);
    expect($shelterA->status)->toBe('full');
});

it('supports rapid on-the-spot registration and relief check-in for unregistered walk-ins (REV-05)', function () {
    $shelter = Shelter::create([
        'name' => 'Tetuan Covered Court',
        'latitude' => 6.9185,
        'longitude' => 122.0882,
        'max_capacity' => 100,
        'current_occupancy' => 10,
        'status' => 'open',
    ]);

    Sanctum::actingAs($this->admin, ['*']);

    $response = $this->postJson("/api/shelters/{$shelter->id}/rapid-check-in", [
        'name' => 'Unregistered Resident',
        'headcount' => 4,
        'barangay' => 'Tetuan',
        'contact_number' => '09991234567',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.action', 'rapid_checkin');

    $shelter->refresh();
    expect($shelter->current_occupancy)->toBe(14);
});

it('calculates proactive barangay-based relief supply summary without continuous GPS tracking', function () {
    $user = User::factory()->create();
    FamilyProfile::create([
        'user_id' => $user->id,
        'headcount' => 4,
        'barangay' => 'Tumaga',
        'contact_number' => '09123456789',
        'qr_code_hash' => 'hash_tumaga_1',
        'transportation_mode' => 'pedestrian',
    ]);

    Sanctum::actingAs($this->admin, ['*']);

    $response = $this->getJson('/api/lgu/barangay-relief-summary/Tumaga');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('barangay', 'Tumaga')
        ->assertJsonPath('total_affected_headcount', 4)
        ->assertJsonPath('safety_buffer_headcount', 1)
        ->assertJsonPath('recommended_total_headcount', 5);
});

it('calculates automated shelter-specific supply aggregation (dispatch manifests)', function () {
    // 1. Set up a RationTemplate containing two InventoryItems
    $rice = InventoryItem::create([
        'item_name' => 'Rice',
        'total_stock' => 1000,
        'unit_type' => 'kg',
    ]);

    $sardines = InventoryItem::create([
        'item_name' => 'Canned Sardines',
        'total_stock' => 1000,
        'unit_type' => 'pcs',
    ]);

    $template = RationTemplate::create([
        'name' => 'Standard Pack',
        'is_active' => true,
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $rice->id,
        'quantity_per_head' => 2, // 2 units of Rice
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $sardines->id,
        'quantity_per_head' => 3, // 3 units of Canned Sardines
    ]);

    // 2. Seed Shelter A (10 checked-in evacuees) and Shelter B (30 checked-in evacuees)
    $shelterA = Shelter::create([
        'name' => 'Shelter A',
        'latitude' => 10.0,
        'longitude' => 10.0,
        'max_capacity' => 100,
        'current_occupancy' => 10,
        'status' => 'open',
    ]);

    $shelterB = Shelter::create([
        'name' => 'Shelter B',
        'latitude' => 10.1,
        'longitude' => 10.1,
        'max_capacity' => 100,
        'current_occupancy' => 30,
        'status' => 'open',
    ]);

    // Helper to log evacuees
    $logEvacuees = function ($shelter, $headcount) {
        $family = FamilyProfile::create([
            'user_id' => User::factory()->create()->id,
            'headcount' => $headcount,
            'contact_number' => '111',
            'barangay' => 'Test',
            'qr_code_hash' => uniqid(),
            'transportation_mode' => 'pedestrian',
        ]);
        EvacuationLog::create([
            'family_profile_id' => $family->id,
            'shelter_id' => $shelter->id,
            'checked_in_at' => now(),
            'recorded_headcount' => $headcount,
            'ration_claimed' => false,
        ]);
    };

    $logEvacuees($shelterA, 10);
    $logEvacuees($shelterB, 30);

    // 3. Execute a GET request to the dispatch/dashboard summary endpoint
    Sanctum::actingAs($this->admin, ['*']);
    $response = $this->getJson('/api/dashboard/overview');
    $response->assertStatus(200);

    $data = $response->json();
    $sheltersData = collect($data['shelters'])->keyBy('id');

    // Calculate live headcount from evacuation logs returned in the payload
    $shelterALiveHeadcount = collect($sheltersData[$shelterA->id]['evacuation_logs'])->sum('recorded_headcount');
    $shelterBLiveHeadcount = collect($sheltersData[$shelterB->id]['evacuation_logs'])->sum('recorded_headcount');

    // Verify headcounts match precisely based on live headcounts rather than static estimations
    expect($shelterALiveHeadcount)->toBe(10)
        ->and($shelterBLiveHeadcount)->toBe(30);

    // 4. Assert that the system accurately calculates the aggregated manifest
    $activeTemplate = RationTemplate::with('items.inventoryItem')->where('is_active', true)->first();

    $manifestA = [];
    $manifestB = [];

    foreach ($activeTemplate->items as $item) {
        $itemName = $item->inventoryItem->item_name;
        $manifestA[$itemName] = $shelterALiveHeadcount * $item->quantity_per_head;
        $manifestB[$itemName] = $shelterBLiveHeadcount * $item->quantity_per_head;
    }

    // Shelter A requires exactly 20 units of Rice and 30 units of Canned Sardines.
    expect($manifestA['Rice'])->toBe(20)
        ->and($manifestA['Canned Sardines'])->toBe(30);

    // Shelter B requires exactly 60 units of Rice and 90 units of Canned Sardines.
    expect($manifestB['Rice'])->toBe(60)
        ->and($manifestB['Canned Sardines'])->toBe(90);
});
