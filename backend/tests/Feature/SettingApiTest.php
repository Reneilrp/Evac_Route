<?php

use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('staff and admin can fetch system settings with defaults', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'general', 'status' => 'active']);

    $response = $this->actingAs($staff, 'sanctum')
        ->getJson('/api/settings');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.master_emergency_active', true)
        ->assertJsonPath('data.active_emergency_title', 'ACTIVE EMERGENCY DISASTER RESPONSE MODE')
        ->assertJsonPath('data.active_disaster_type', 'all');
});

test('non-admin cannot update system settings', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'general', 'status' => 'active']);

    $this->actingAs($staff, 'sanctum')
        ->postJson('/api/settings', [
            'master_emergency_active' => false,
        ])
        ->assertStatus(403);
});

test('admin can update system settings and it logs to audit trail', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/settings', [
            'master_emergency_active' => false,
            'active_emergency_title' => 'STANDBY PEACETIME MONITORING',
            'active_disaster_type' => 'natural',
            'capacity_warning_threshold' => 90,
            'low_stock_threshold' => 150,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success');

    expect(Setting::get('active_emergency_title'))->toBe('STANDBY PEACETIME MONITORING')
        ->and(Setting::get('active_disaster_type'))->toBe('natural')
        ->and((int) Setting::get('capacity_warning_threshold'))->toBe(90);

    $log = AuditLog::where('action', 'settings_update')->first();
    expect($log)->not->toBeNull()
        ->and($log->user_id)->toBe($admin->id)
        ->and($log->new_values['active_emergency_title'])->toBe('STANDBY PEACETIME MONITORING');
});

test('admin can generate and download database backup', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    $response = $this->actingAs($admin, 'sanctum')
        ->post('/api/settings/backup');

    $response->assertStatus(200)
        ->assertHeader('content-type', 'application/sql');

    expect($response->getContent())->toContain('-- Evac_Route Automated Database Backup');
});

test('admin can perform housekeeping and prune old audit logs', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    // Set retention days to 30
    Setting::set('audit_log_retention_days', 30);

    // Old log created 45 days ago
    $oldLog = AuditLog::create([
        'user_id' => $admin->id,
        'action' => 'old_test_action',
        'ip_address' => '127.0.0.1',
    ]);
    $oldLog->timestamps = false;
    $oldLog->created_at = now()->subDays(45);
    $oldLog->save();

    // Recent log created 5 days ago
    $recentLog = AuditLog::create([
        'user_id' => $admin->id,
        'action' => 'recent_test_action',
        'ip_address' => '127.0.0.1',
    ]);
    $recentLog->timestamps = false;
    $recentLog->created_at = now()->subDays(5);
    $recentLog->save();

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/settings/housekeeping');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success');

    expect(AuditLog::find($oldLog->id))->toBeNull()
        ->and(AuditLog::find($recentLog->id))->not->toBeNull();

    $housekeepingLog = AuditLog::where('action', 'settings_housekeeping')->first();
    expect($housekeepingLog)->not->toBeNull()
        ->and($housekeepingLog->user_id)->toBe($admin->id);
});
