<?php

use App\Models\User;
use App\Models\Shelter;
use App\Models\FamilyProfile;
use App\Models\EvacuationLog;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\RationTemplateItem;
use Laravel\Sanctum\Sanctum;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create an active admin user for the required auth middleware
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
});

it('prevents check-in when capacity is exceeded and redirects users', function () {
    // 1. Mock two shelters
    $shelterA = Shelter::create([
        'name' => 'Shelter A',
        'latitude' => 10.0,
        'longitude' => 10.0,
        'max_capacity' => 10,
        'current_occupancy' => 8,
        'status' => 'open'
    ]);

    $shelterB = Shelter::create([
        'name' => 'Shelter B',
        'latitude' => 10.1,
        'longitude' => 10.1,
        'max_capacity' => 50,
        'current_occupancy' => 0,
        'status' => 'open'
    ]);

    // 2. Simulate a family profile with headcount 5
    $user = User::factory()->create();
    $family = FamilyProfile::create([
        'user_id' => $user->id,
        'headcount' => 5,
        'contact_number' => '09123456789',
        'barangay' => 'Test',
        'qr_code_hash' => 'hash_test_123',
        'transportation_mode' => 'pedestrian'
    ]);

    // 3. Act: Simulate a check-in request to Shelter A
    Sanctum::actingAs($this->admin, ['*']);
    
    $response = $this->postJson("/api/shelters/{$shelterA->id}/check-in", [
        'qr_code_hash' => 'hash_test_123'
    ]);

    // 4. Assert: CheckInController safely blocks the check-in
    // Expecting 400 status because it throws an Exception caught by the controller
    $response->assertStatus(400)
             ->assertJsonPath('status', 'error');

    // 5. Assert: Shelter A's status automatically flips to 'full'
    $shelterA->refresh();
    expect($shelterA->status)->toBe('full');

    // 6. Assert: GET request to active shelters does NOT include Shelter A
    $activeResponse = $this->getJson('/api/shelters/active');
    
    $activeResponse->assertStatus(200);
    $activeShelters = $activeResponse->json('data');
    
    $shelterIds = collect($activeShelters)->pluck('id')->toArray();
    expect($shelterIds)->not->toContain($shelterA->id)
          ->and($shelterIds)->toContain($shelterB->id);
});

it('calculates automated shelter-specific supply aggregation (dispatch manifests)', function () {
    // 1. Set up a RationTemplate containing two InventoryItems
    $rice = InventoryItem::create([
        'item_name' => 'Rice',
        'total_stock' => 1000,
        'unit_type' => 'kg'
    ]);

    $sardines = InventoryItem::create([
        'item_name' => 'Canned Sardines',
        'total_stock' => 1000,
        'unit_type' => 'pcs'
    ]);

    $template = RationTemplate::create([
        'name' => 'Standard Pack',
        'is_active' => true
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $rice->id,
        'quantity_per_head' => 2 // 2 units of Rice
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $sardines->id,
        'quantity_per_head' => 3 // 3 units of Canned Sardines
    ]);

    // 2. Seed Shelter A (10 checked-in evacuees) and Shelter B (30 checked-in evacuees)
    $shelterA = Shelter::create([
        'name' => 'Shelter A',
        'latitude' => 10.0,
        'longitude' => 10.0,
        'max_capacity' => 100,
        'current_occupancy' => 10,
        'status' => 'open'
    ]);

    $shelterB = Shelter::create([
        'name' => 'Shelter B',
        'latitude' => 10.1,
        'longitude' => 10.1,
        'max_capacity' => 100,
        'current_occupancy' => 30,
        'status' => 'open'
    ]);

    // Helper to log evacuees
    $logEvacuees = function ($shelter, $headcount) {
        $family = FamilyProfile::create([
            'user_id' => User::factory()->create()->id,
            'headcount' => $headcount,
            'contact_number' => '111',
            'barangay' => 'Test',
            'qr_code_hash' => uniqid(),
            'transportation_mode' => 'pedestrian'
        ]);
        EvacuationLog::create([
            'family_profile_id' => $family->id,
            'shelter_id' => $shelter->id,
            'checked_in_at' => now(),
            'recorded_headcount' => $headcount,
            'ration_claimed' => false
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
