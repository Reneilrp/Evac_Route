<?php

use App\Models\User;
use App\Models\Shelter;
use App\Models\FamilyProfile;
use App\Models\EvacuationLog;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guest cannot access residents registry', function () {
    $response = $this->getJson('/api/residents');
    $response->assertStatus(401);
});

test('resident cannot access residents registry', function () {
    $resident = User::factory()->create(['role' => 'resident', 'status' => 'active']);
    
    $response = $this->actingAs($resident, 'sanctum')
        ->getJson('/api/residents');
        
    $response->assertStatus(403);
});

test('admin can access residents registry and get paginated list with correct stay history & statistics', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    
    // Create shelter
    $shelter1 = Shelter::create([
        'name' => 'North Gym',
        'latitude' => 6.9,
        'longitude' => 122.0,
        'max_capacity' => 100,
        'current_occupancy' => 0,
        'status' => 'open'
    ]);

    $shelter2 = Shelter::create([
        'name' => 'South Gym',
        'latitude' => 6.95,
        'longitude' => 122.05,
        'max_capacity' => 100,
        'current_occupancy' => 0,
        'status' => 'open'
    ]);

    // Create resident user and family profile
    $residentUser = User::factory()->create(['name' => 'John Doe', 'role' => 'resident', 'status' => 'active']);
    $family = FamilyProfile::create([
        'user_id' => $residentUser->id,
        'headcount' => 4,
        'contact_number' => '09112233445',
        'barangay' => 'San Jose',
        'transportation_mode' => 'pedestrian',
        'qr_code_hash' => 'family_hash_abc'
    ]);

    // Create a past check-in that was resolved (checked out)
    EvacuationLog::create([
        'family_profile_id' => $family->id,
        'shelter_id' => $shelter1->id,
        'recorded_headcount' => 4,
        'ration_claimed' => true,
        'ration_claimed_at' => now()->subDays(2),
        'checked_in_at' => now()->subDays(2),
        'checked_out_at' => now()->subDays(1),
    ]);

    // Create an active check-in (no check-out)
    EvacuationLog::create([
        'family_profile_id' => $family->id,
        'shelter_id' => $shelter2->id,
        'recorded_headcount' => 4,
        'ration_claimed' => false,
        'checked_in_at' => now()->subHours(5),
    ]);

    $response = $this->actingAs($admin, 'sanctum')
        ->getJson('/api/residents');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonStructure([
            'status',
            'data' => [
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'headcount',
                        'contact_number',
                        'barangay',
                        'qr_code_hash',
                        'transportation_mode',
                        'total_checkins',
                        'total_rations_claimed',
                        'current_status',
                        'current_shelter',
                        'history' => [
                            '*' => [
                                'id',
                                'shelter_name',
                                'checked_in_at',
                                'checked_out_at',
                                'recorded_headcount',
                                'ration_claimed',
                                'ration_claimed_at',
                                'claimed_ration_items'
                            ]
                        ]
                    ]
                ]
            ]
        ]);

    $data = $response->json('data.data');
    expect($data)->toHaveCount(1);
    
    $residentData = $data[0];
    expect($residentData['name'])->toBe('John Doe');
    expect($residentData['barangay'])->toBe('San Jose');
    expect($residentData['total_checkins'])->toBe(2);
    expect($residentData['total_rations_claimed'])->toBe(1);
    expect($residentData['current_status'])->toBe('checked_in');
    expect($residentData['current_shelter'])->toBe('South Gym');
    expect($residentData['history'])->toHaveCount(2);
});

test('residents registry search filter works correctly', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    
    // Create resident 1
    $user1 = User::factory()->create(['name' => 'Alice Miller', 'role' => 'resident']);
    FamilyProfile::create([
        'user_id' => $user1->id,
        'headcount' => 3,
        'contact_number' => '09999999999',
        'barangay' => 'Guiwan',
        'qr_code_hash' => 'hash_alice'
    ]);

    // Create resident 2
    $user2 = User::factory()->create(['name' => 'Bob Smith', 'role' => 'resident']);
    FamilyProfile::create([
        'user_id' => $user2->id,
        'headcount' => 5,
        'contact_number' => '09888888888',
        'barangay' => 'Talon-Talon',
        'qr_code_hash' => 'hash_bob'
    ]);

    // Search by name "Alice"
    $response = $this->actingAs($admin, 'sanctum')
        ->getJson('/api/residents?search=Alice');
    
    $response->assertStatus(200);
    $data = $response->json('data.data');
    expect($data)->toHaveCount(1);
    expect($data[0]['name'])->toBe('Alice Miller');

    // Search by barangay "Talon"
    $response = $this->actingAs($admin, 'sanctum')
        ->getJson('/api/residents?search=Talon');
    
    $response->assertStatus(200);
    $data = $response->json('data.data');
    expect($data)->toHaveCount(1);
    expect($data[0]['name'])->toBe('Bob Smith');
});
