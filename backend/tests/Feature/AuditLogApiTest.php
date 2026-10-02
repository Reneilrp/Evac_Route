<?php

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guest cannot access audit logs', function () {
    $this->getJson('/api/audit-logs')->assertStatus(401);
});

test('non-admin staff cannot access audit logs', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'general', 'status' => 'active']);

    $this->actingAs($staff, 'sanctum')
        ->getJson('/api/audit-logs')
        ->assertStatus(403);
});

test('admin can retrieve paginated audit logs with user details and filtering', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $officer = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'logistics', 'status' => 'active']);

    AuditLog::create([
        'user_id' => $officer->id,
        'action' => 'inventory_adjust_stock',
        'ip_address' => '192.168.1.50',
        'old_values' => ['stock' => 10],
        'new_values' => ['stock' => 20],
    ]);

    AuditLog::create([
        'user_id' => $admin->id,
        'action' => 'staff_create',
        'ip_address' => '127.0.0.1',
        'old_values' => null,
        'new_values' => ['name' => 'New Rescuer'],
    ]);

    $response = $this->actingAs($admin, 'sanctum')
        ->getJson('/api/audit-logs');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonStructure([
            'status',
            'data' => [
                'data' => [
                    '*' => [
                        'id',
                        'user_id',
                        'action',
                        'ip_address',
                        'old_values',
                        'new_values',
                        'created_at',
                        'user' => ['id', 'name', 'email', 'role', 'operator_type'],
                    ],
                ],
                'total',
            ],
        ]);

    expect($response->json('data.total'))->toBe(2);

    // Filter by action
    $filtered = $this->actingAs($admin, 'sanctum')
        ->getJson('/api/audit-logs?action=inventory');

    expect($filtered->json('data.total'))->toBe(1);
    expect($filtered->json('data.data.0.action'))->toBe('inventory_adjust_stock');
});
