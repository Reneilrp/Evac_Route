<?php

use App\Models\User;
use App\Models\Shelter;
use App\Models\Hazard;
use App\Models\FamilyProfile;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\RationTemplateItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/**
 * 1. Validation Test: /api/hazards
 */
test('hazard creation requires hazard_type and severity_level', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    // Act: Send empty payload
    $response = $this->actingAs($admin)
        ->postJson('/api/hazards', []);

    // Assert: Fails with 422
    $response->assertStatus(422)
        ->assertJsonValidationErrors(['hazard_type', 'severity_level']);

    // Act: Send valid payload
    $validData = [
        'name' => 'Flooded Main St',
        'latitude' => 6.9126,
        'longitude' => 122.0729,
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'radius_meters' => 100
    ];

    $response = $this->actingAs($admin)
        ->postJson('/api/hazards', $validData);

    // Assert: Success with 201
    $response->assertStatus(201)
        ->assertJsonPath('status', 'success');
    
    $this->assertDatabaseHas('hazards', [
        'name' => 'Flooded Main St',
        'hazard_type' => 'flood',
        'severity_level' => 'high'
    ]);
});

/**
 * 2. Contextual Profile Test: /api/register/family
 */
test('family registration requires and saves transportation_mode', function () {
    $registrationData = [
        'name' => 'Dela Cruz Family',
        'headcount' => 4,
        'contact_number' => '09123456789',
        'barangay' => 'Tetuan',
        'transportation_mode' => '4_wheel'
    ];

    // Act
    $response = $this->postJson('/api/register/family', $registrationData);

    // Assert
    $response->assertStatus(201)
        ->assertJsonStructure(['access_token', 'qr_code_hash', 'family']);

    $this->assertDatabaseHas('family_profiles', [
        'barangay' => 'Tetuan',
        'transportation_mode' => '4_wheel'
    ]);
});

/**
 * 3. Concurrent Lock Simulation Test: /api/shelters/{id}/check-in
 * Logic verification for RationTemplate arithmetic and stock decrement.
 */
test('check-in processes ration template and decrements inventory stock accurately', function () {
    // Setup: Shelter and Resident
    $shelter = Shelter::create([
        'name' => 'Central School',
        'latitude' => 6.9,
        'longitude' => 122.0,
        'max_capacity' => 100,
        'current_occupancy' => 0,
        'status' => 'open'
    ]);

    $user = User::factory()->create(['role' => 'resident']);
    $family = FamilyProfile::create([
        'user_id' => $user->id,
        'headcount' => 5,
        'contact_number' => '09123',
        'barangay' => 'Tetuan',
        'transportation_mode' => 'pedestrian',
        'qr_code_hash' => 'test_qr_123'
    ]);

    // Setup: Inventory and Ration Template
    $rice = InventoryItem::create([
        'item_name' => 'Rice',
        'total_stock' => 1000,
        'unit_type' => 'kg'
    ]);

    $template = RationTemplate::create([
        'name' => 'Standard Disaster Kit',
        'is_active' => true
    ]);

    RationTemplateItem::create([
        'ration_template_id' => $template->id,
        'inventory_item_id' => $rice->id,
        'quantity_per_head' => 2 // 2kg per person
    ]);

    // Expected deduction: 5 people * 2kg = 10kg
    $expectedStock = 1000 - (5 * 2);

    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);

    // Act: Execute Check-in
    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/shelters/{$shelter->id}/check-in", [
            'qr_code_hash' => 'test_qr_123'
        ]);

    // Assert
    $response->assertStatus(200)
        ->assertJsonPath('status', 'success');

    // Verify Inventory accurately decremented
    expect(InventoryItem::find($rice->id)->total_stock)->toBe(990);
    
    // Verify Shelter Occupancy updated
    expect(Shelter::find($shelter->id)->current_occupancy)->toBe(5);

    // Verify Audit Trail created
    $this->assertDatabaseHas('evacuation_logs', [
        'family_profile_id' => $family->id,
        'shelter_id' => $shelter->id,
        'recorded_headcount' => 5,
        'ration_claimed' => true
    ]);
});
