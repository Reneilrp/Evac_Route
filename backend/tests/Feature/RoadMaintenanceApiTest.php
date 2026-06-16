<?php

use App\Models\User;
use App\Models\RoadMaintenance;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authorized users can report and resolve road maintenance blocks', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $resident = User::factory()->create(['role' => 'resident', 'status' => 'active']);

    $payload = [
        'description' => 'Tetuan Bridge Repair',
        'start_latitude' => 6.9192,
        'start_longitude' => 122.0886,
        'end_latitude' => 6.9195,
        'end_longitude' => 122.0890,
        'estimated_duration_hours' => 24,
    ];

    // Act 1: Unauthorized user (resident role) tries to create a road block
    $response = $this->actingAs($resident)
        ->postJson('/api/road-maintenance', $payload);

    $response->assertStatus(403); // Forbidden

    // Act 2: Authorized user (admin role) creates a road block
    $response = $this->actingAs($admin)
        ->postJson('/api/road-maintenance', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'success');

    $this->assertDatabaseHas('road_maintenances', [
        'description' => 'Tetuan Bridge Repair',
        'is_active' => true,
        'estimated_duration_hours' => 24,
        'reported_by' => $admin->id,
    ]);

    $roadBlockId = $response->json('data.id');

    // Act 3: Retrieve active road maintenance blocks
    $response = $this->actingAs($admin)
        ->getJson('/api/road-maintenance');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $roadBlockId);

    // Act 4: Resolve the road block
    $response = $this->actingAs($admin)
        ->putJson("/api/road-maintenance/{$roadBlockId}/resolve");

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success');

    $this->assertDatabaseHas('road_maintenances', [
        'id' => $roadBlockId,
        'is_active' => false,
    ]);
});

test('authorized users can report road maintenance blocks using multi-point coordinates in a single request', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    $payload = [
        'description' => 'Multi-Point Repair Route',
        'coordinates' => [
            [122.0886, 6.9192], // P1
            [122.0890, 6.9195], // P2
            [122.0895, 6.9200], // P3
        ],
        'estimated_duration_hours' => 48,
    ];

    $response = $this->actingAs($admin)
        ->postJson('/api/road-maintenance', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'success');

    // Should create 2 segments in database
    $this->assertDatabaseHas('road_maintenances', [
        'description' => 'Multi-Point Repair Route',
        'start_longitude' => 122.0886,
        'start_latitude' => 6.9192,
        'end_longitude' => 122.0890,
        'end_latitude' => 6.9195,
        'estimated_duration_hours' => 48,
    ]);

    $this->assertDatabaseHas('road_maintenances', [
        'description' => 'Multi-Point Repair Route',
        'start_longitude' => 122.0890,
        'start_latitude' => 6.9195,
        'end_longitude' => 122.0895,
        'end_latitude' => 6.9200,
        'estimated_duration_hours' => 48,
    ]);
});

