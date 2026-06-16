<?php

use App\Models\User;
use App\Models\Setting;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guest cannot access settings endpoints', function () {
    $this->getJson('/api/settings')->assertStatus(401);
    $this->postJson('/api/settings')->assertStatus(401);
    $this->postJson('/api/settings/backup')->assertStatus(401);
    $this->postJson('/api/settings/housekeeping')->assertStatus(401);
});

test('staff cannot access settings endpoints', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff', 'status' => 'active']);

    $this->actingAs($staff, 'sanctum')->getJson('/api/settings')->assertStatus(403);
    $this->actingAs($staff, 'sanctum')->postJson('/api/settings', [])->assertStatus(403);
    $this->actingAs($staff, 'sanctum')->postJson('/api/settings/backup')->assertStatus(403);
    $this->actingAs($staff, 'sanctum')->postJson('/api/settings/housekeeping')->assertStatus(403);
});

test('admin can retrieve settings with default fallbacks merged', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    // Set one settings in db to check merging
    Setting::set('low_stock_threshold', 250);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/settings');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonStructure([
            'status',
            'data' => [
                'map_center_lat',
                'map_center_lng',
                'map_zoom',
                'capacity_warning_threshold',
                'low_stock_threshold',
                'audio_alerts_enabled',
                'siren_volume',
                'audit_log_retention_days',
            ]
        ]);

    $data = $response->json('data');
    expect($data['low_stock_threshold'])->toBe(250);
    expect($data['map_zoom'])->toBe(13); // fallback default
    expect($data['audio_alerts_enabled'])->toBe(true); // fallback default
});

test('admin can save settings and record audit logs', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    $payload = [
        'map_zoom' => 15,
        'capacity_warning_threshold' => 90,
        'low_stock_threshold' => 50,
        'audio_alerts_enabled' => false,
        'siren_volume' => 45,
        'audit_log_retention_days' => 120,
    ];

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/settings', $payload);

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success');

    // Assert written to DB
    expect(Setting::get('map_zoom'))->toBe(15);
    expect(Setting::get('capacity_warning_threshold'))->toBe(90);
    expect(Setting::get('low_stock_threshold'))->toBe(50);
    expect(filter_var(Setting::get('audio_alerts_enabled'), FILTER_VALIDATE_BOOLEAN))->toBe(false);

    // Assert Audit Log was created
    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'action' => 'settings_update',
    ]);
});

test('admin can download database backup sql script', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/settings/backup');

    $response->assertStatus(200)
        ->assertHeader('Content-Type', 'application/sql')
        ->assertHeader('Content-Disposition', 'attachment; filename="evac_route_backup_' . now()->format('Y_m_d_His') . '.sql"');

    $content = $response->getContent();
    expect($content)->toContain('-- Evac_Route Automated Database Backup');
    expect($content)->toContain('DROP TABLE IF EXISTS `users`');
});

test('admin can clear older audit logs based on settings', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    // Configure retention to 30 days
    Setting::set('audit_log_retention_days', 30);

    // Create an audit log 45 days ago
    $oldLog = AuditLog::create([
        'user_id' => $admin->id,
        'action' => 'old_action',
        'ip_address' => '127.0.0.1',
    ]);
    // Force set created_at timestamp
    DB::table('audit_logs')->where('id', $oldLog->id)->update(['created_at' => now()->subDays(45)]);

    // Create a recent audit log 2 days ago
    $newLog = AuditLog::create([
        'user_id' => $admin->id,
        'action' => 'recent_action',
        'ip_address' => '127.0.0.1',
    ]);
    DB::table('audit_logs')->where('id', $newLog->id)->update(['created_at' => now()->subDays(2)]);

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/settings/housekeeping');

    $response->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonFragment([
            'message' => 'Housekeeping finished. Cleared 1 older log entries.',
        ]);

    // Verify old log deleted, new log retained
    $this->assertDatabaseMissing('audit_logs', ['id' => $oldLog->id]);
    $this->assertDatabaseHas('audit_logs', ['id' => $newLog->id]);
});
