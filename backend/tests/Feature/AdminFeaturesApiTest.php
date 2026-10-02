<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can access sitrep report endpoint', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'operator_type' => 'admin',
    ]);

    $response = $this->actingAs($admin)
        ->getJson('/api/reports/sitrep');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonStructure([
            'status',
            'data' => [
                'meta',
                'hazards_summary',
                'population_summary',
                'cccm_summary',
                'srr_summary',
                'relief_summary',
            ],
        ]);
});

test('non-admin cannot access sitrep report endpoint', function () {
    $staff = User::factory()->create([
        'role' => 'lgu_staff',
        'operator_type' => 'logistics',
    ]);

    $response = $this->actingAs($staff)
        ->getJson('/api/reports/sitrep');

    $response->assertStatus(403);
});

test('admin can access system health endpoint', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'operator_type' => 'admin',
    ]);

    $response = $this->actingAs($admin)
        ->getJson('/api/system-health');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonStructure([
            'status',
            'data' => [
                'database',
                'websocket',
                'server',
                'cache_and_queues',
            ],
        ]);
});

test('admin can clear application cache via system health', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'operator_type' => 'admin',
    ]);

    $response = $this->actingAs($admin)
        ->postJson('/api/system-health/clear-cache');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success');
});
