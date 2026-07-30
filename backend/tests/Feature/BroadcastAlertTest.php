<?php

use App\Models\BroadcastAlert;
use App\Models\FamilyProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authorized users can broadcast and revoke emergency warnings', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $resident = User::factory()->create(['role' => 'resident', 'status' => 'active']);

    $payload = [
        'title' => 'Critical Flood Warning',
        'message' => 'Water levels in Tumaga River have breached danger levels. Evacuate immediately.',
        'severity' => 'critical',
        'scope' => 'barangay',
        'barangay' => 'Tumaga',
    ];

    // Act 1: Unauthorized user (resident role) tries to broadcast a warning
    $response = $this->actingAs($resident)
        ->postJson('/api/alerts', $payload);

    $response->assertStatus(403); // Forbidden

    // Act 2: Authorized user (admin role) broadcasts the warning
    $response = $this->actingAs($admin)
        ->postJson('/api/alerts', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'success');

    $this->assertDatabaseHas('broadcast_alerts', [
        'title' => 'Critical Flood Warning',
        'severity' => 'critical',
        'scope' => 'barangay',
        'barangay' => 'Tumaga',
        'created_by' => $admin->id,
    ]);

    $alertId = $response->json('data.id');

    // Act 3: Revoke/delete the warning
    $response = $this->actingAs($admin)
        ->deleteJson("/api/alerts/{$alertId}");

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success');

    $this->assertDatabaseMissing('broadcast_alerts', [
        'id' => $alertId,
    ]);
});

test('residents only receive emergency warnings matching their target area', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    // Create residents with profiles in different barangays
    $tumagaResidentUser = User::factory()->create(['role' => 'resident', 'status' => 'active']);
    $tumagaProfile = FamilyProfile::create([
        'user_id' => $tumagaResidentUser->id,
        'headcount' => 4,
        'contact_number' => '09123456789',
        'barangay' => 'Tumaga',
        'qr_code_hash' => 'hash_tumaga',
        'transportation_mode' => 'pedestrian',
    ]);

    $tetuanResidentUser = User::factory()->create(['role' => 'resident', 'status' => 'active']);
    $tetuanProfile = FamilyProfile::create([
        'user_id' => $tetuanResidentUser->id,
        'headcount' => 3,
        'contact_number' => '09987654321',
        'barangay' => 'Tetuan',
        'qr_code_hash' => 'hash_tetuan',
        'transportation_mode' => '4_wheel',
    ]);

    // Create 3 alerts:
    // 1. Zamboanga-wide alert (all)
    BroadcastAlert::create([
        'title' => 'General Weather Update',
        'message' => 'Heavy rain expected across Zamboanga City.',
        'severity' => 'info',
        'scope' => 'all',
        'created_by' => $admin->id,
    ]);

    // 2. Specific Tumaga alert
    BroadcastAlert::create([
        'title' => 'Tumaga Bridge Overflow',
        'message' => 'Bridge in Tumaga is currently impassable.',
        'severity' => 'warning',
        'scope' => 'barangay',
        'barangay' => 'Tumaga',
        'created_by' => $admin->id,
    ]);

    // 3. Specific Tetuan alert
    BroadcastAlert::create([
        'title' => 'Tetuan Power Outage',
        'message' => 'Scheduled power interruption in Tetuan.',
        'severity' => 'info',
        'scope' => 'barangay',
        'barangay' => 'Tetuan',
        'created_by' => $admin->id,
    ]);

    // Act 1: Tumaga Resident fetches alerts (should see "General Weather Update" and "Tumaga Bridge Overflow")
    $response = $this->actingAs($tumagaResidentUser)
        ->getJson('/api/alerts');

    $response->assertStatus(200);
    $alerts = $response->json('data');
    expect(count($alerts))->toBe(2);

    $titles = collect($alerts)->pluck('title')->toArray();
    expect($titles)->toContain('General Weather Update');
    expect($titles)->toContain('Tumaga Bridge Overflow');
    expect($titles)->not->toContain('Tetuan Power Outage');

    // Act 2: Tetuan Resident fetches alerts (should see "General Weather Update" and "Tetuan Power Outage")
    $response = $this->actingAs($tetuanResidentUser)
        ->getJson('/api/alerts');

    $response->assertStatus(200);
    $alerts = $response->json('data');
    expect(count($alerts))->toBe(2);

    $titles = collect($alerts)->pluck('title')->toArray();
    expect($titles)->toContain('General Weather Update');
    expect($titles)->toContain('Tetuan Power Outage');
    expect($titles)->not->toContain('Tumaga Bridge Overflow');
});
