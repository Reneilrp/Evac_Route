<?php

use App\Models\ApiKey;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // 1. Create a valid testing API key
    $this->validKey = ApiKey::generate('Partner Project Test')->key;

    // 2. Seed test shelters across District I & District II, primary & secondary
    Shelter::create([
        'name' => 'Sta. Maria Cluster Evacuation Center',
        'barangay' => 'Pasonanca',
        'district' => 'District I',
        'floor_area' => 1200.00,
        'latitude' => 6.951678,
        'longitude' => 122.071942,
        'max_capacity' => 175,
        'current_occupancy' => 25,
        'status' => 'open',
        'type' => 'primary',
        'facility_type' => 'Evacuation Center',
        'is_secured_facility' => true,
    ]);

    Shelter::create([
        'name' => 'Covered Court at Ayala',
        'barangay' => 'Ayala',
        'district' => 'District I',
        'floor_area' => 1200.00,
        'latitude' => 6.960100,
        'longitude' => 122.010200,
        'max_capacity' => 342,
        'current_occupancy' => 0,
        'status' => 'closed',
        'type' => 'secondary',
        'facility_type' => 'Covered Court',
        'is_secured_facility' => false,
    ]);

    Shelter::create([
        'name' => 'Curuan Cluster Evacuation Center',
        'barangay' => 'Curuan',
        'district' => 'District II',
        'floor_area' => 1500.00,
        'latitude' => 7.210011,
        'longitude' => 122.231289,
        'max_capacity' => 375,
        'current_occupancy' => 100,
        'status' => 'open',
        'type' => 'primary',
        'facility_type' => 'Evacuation Center',
        'is_secured_facility' => true,
    ]);

    Shelter::create([
        'name' => 'Covered Court at Tetuan',
        'barangay' => 'Tetuan',
        'district' => 'District II',
        'floor_area' => 748.00,
        'latitude' => 6.920000,
        'longitude' => 122.090000,
        'max_capacity' => 213,
        'current_occupancy' => 50,
        'status' => 'open',
        'type' => 'secondary',
        'facility_type' => 'Covered Court',
        'is_secured_facility' => false,
    ]);
});

// ─────────────────────────────────────────────────────────────
// 🔒 API KEY SECURITY TESTS
// ─────────────────────────────────────────────────────────────

test('shelter endpoints reject requests without API key with 401 Unauthorized', function () {
    $response = $this->getJson('/api/shelters');

    $response->assertUnauthorized()
        ->assertJson([
            'status' => 'error',
        ]);
});

test('shelter endpoints reject requests with invalid API key', function () {
    $response = $this->withHeaders(['X-API-KEY' => 'invalid_fake_key_12345'])
        ->getJson('/api/shelters');

    $response->assertUnauthorized()
        ->assertJson([
            'status' => 'error',
        ]);
});

test('shelter endpoints reject deactivated API keys', function () {
    $deactivated = ApiKey::create([
        'name' => 'Deactivated Project',
        'key' => 'evac_live_deactivated_key',
        'is_active' => false,
    ]);

    $response = $this->withHeaders(['X-API-KEY' => $deactivated->key])
        ->getJson('/api/shelters');

    $response->assertUnauthorized()
        ->assertJson([
            'status' => 'error',
        ]);
});

test('shelter endpoints reject expired API keys', function () {
    $expired = ApiKey::create([
        'name' => 'Expired Project',
        'key' => 'evac_live_expired_key',
        'is_active' => true,
        'expires_at' => now()->subDay(),
    ]);

    $response = $this->withHeaders(['X-API-KEY' => $expired->key])
        ->getJson('/api/shelters');

    $response->assertUnauthorized()
        ->assertJson([
            'status' => 'error',
        ]);
});

test('shelters can be accessed via X-API-KEY header', function () {
    $response = $this->withHeaders(['X-API-KEY' => $this->validKey])
        ->getJson('/api/shelters');

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'count' => 4,
        ]);
});

test('shelters can be accessed via api_key query parameter', function () {
    $response = $this->getJson("/api/shelters?api_key={$this->validKey}");

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'count' => 4,
        ]);
});

test('shelters can be accessed via Authorization Bearer token header', function () {
    $response = $this->withHeaders(['Authorization' => "Bearer {$this->validKey}"])
        ->getJson('/api/shelters');

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'count' => 4,
        ]);
});

test('API key usage updates last_used_at timestamp', function () {
    $keyRecord = ApiKey::where('key', $this->validKey)->first();
    expect($keyRecord->last_used_at)->toBeNull();

    $this->withHeaders(['X-API-KEY' => $this->validKey])->getJson('/api/shelters');

    $keyRecord->refresh();
    expect($keyRecord->last_used_at)->not->toBeNull();
});

test('authenticated Sanctum user bypasses API key check', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/shelters');

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'count' => 4,
        ]);
});

test('artisan command api-key:generate creates an active API key', function () {
    $this->artisan('api-key:generate', ['name' => 'Command Test Key'])
        ->assertSuccessful();

    $record = ApiKey::where('name', 'Command Test Key')->first();
    expect($record)->not->toBeNull();
    expect($record->is_active)->toBeTrue();
    expect($record->key)->toStartWith('evac_live_');
});

// ─────────────────────────────────────────────────────────────
// 🏗️ SHELTER FUNCTIONAL TESTS (WITH API KEY)
// ─────────────────────────────────────────────────────────────

test('GET /api/shelters returns list of all shelters with complete attributes', function () {
    $response = $this->withHeaders(['X-API-KEY' => $this->validKey])
        ->getJson('/api/shelters');

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'count' => 4,
        ])
        ->assertJsonStructure([
            'status',
            'count',
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'barangay',
                    'location',
                    'district',
                    'floor_area',
                    'floor_area_sqm',
                    'latitude',
                    'longitude',
                    'coordinates',
                    'capacity',
                    'max_capacity',
                    'current_occupancy',
                    'available_capacity',
                    'status',
                    'type',
                    'facility_type',
                ],
            ],
        ]);

    $data = $response->json('data');
    expect($data)->toHaveCount(4);

    $staMaria = collect($data)->firstWhere('name', 'Sta. Maria Cluster Evacuation Center');
    expect($staMaria['district'])->toBe('District I');
    expect($staMaria['floor_area'])->toEqual(1200.0);
    expect($staMaria['max_capacity'])->toBe(175);
    expect($staMaria['capacity'])->toBe(175);
    expect($staMaria['current_occupancy'])->toBe(25);
    expect($staMaria['available_capacity'])->toBe(150);
    expect($staMaria['coordinates'])->toBe([122.071942, 6.951678]);
    expect($staMaria['barangay'])->toBe('Pasonanca');
});

test('GET /api/shelters/:id returns single shelter by ID', function () {
    $shelter = Shelter::where('name', 'Curuan Cluster Evacuation Center')->first();

    $response = $this->withHeaders(['X-API-KEY' => $this->validKey])
        ->getJson("/api/shelters/{$shelter->id}");

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'data' => [
                'id' => $shelter->id,
                'name' => 'Curuan Cluster Evacuation Center',
                'barangay' => 'Curuan',
                'district' => 'District II',
                'floor_area' => 1500.0,
                'max_capacity' => 375,
                'current_occupancy' => 100,
                'available_capacity' => 275,
                'type' => 'primary',
            ],
        ]);
});

test('GET /api/shelters/:id with invalid ID returns 404', function () {
    $response = $this->withHeaders(['X-API-KEY' => $this->validKey])
        ->getJson('/api/shelters/999999');

    $response->assertNotFound()
        ->assertJson([
            'status' => 'error',
            'message' => 'Shelter not found.',
        ]);
});

test('GET /api/shelters?district=I filters shelters in District I', function () {
    $response = $this->withHeaders(['X-API-KEY' => $this->validKey])
        ->getJson('/api/shelters?district=I');

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'count' => 2,
        ]);

    $data = $response->json('data');
    foreach ($data as $item) {
        expect($item['district'])->toContain('District I');
    }
});

test('GET /api/shelters?district=II filters shelters in District II', function () {
    $response = $this->withHeaders(['X-API-KEY' => $this->validKey])
        ->getJson('/api/shelters?district=II');

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'count' => 2,
        ]);

    $data = $response->json('data');
    foreach ($data as $item) {
        expect($item['district'])->toContain('District II');
    }
});

test('GET /api/shelters?type=court filters covered courts', function () {
    $response = $this->withHeaders(['X-API-KEY' => $this->validKey])
        ->getJson('/api/shelters?type=court');

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'count' => 2,
        ]);

    $names = collect($response->json('data'))->pluck('name')->all();
    expect($names)->toContain('Covered Court at Ayala');
    expect($names)->toContain('Covered Court at Tetuan');
});

test('GET /api/shelters?type=ec filters evacuation centers', function () {
    $response = $this->withHeaders(['X-API-KEY' => $this->validKey])
        ->getJson('/api/shelters?type=ec');

    $response->assertOk()
        ->assertJson([
            'status' => 'success',
            'count' => 2,
        ]);

    $names = collect($response->json('data'))->pluck('name')->all();
    expect($names)->toContain('Sta. Maria Cluster Evacuation Center');
    expect($names)->toContain('Curuan Cluster Evacuation Center');
});

test('GET /api/shelters/map returns valid GeoJSON FeatureCollection', function () {
    $response = $this->withHeaders(['X-API-KEY' => $this->validKey])
        ->getJson('/api/shelters/map');

    $response->assertOk()
        ->assertJson([
            'type' => 'FeatureCollection',
            'count' => 4,
        ])
        ->assertJsonStructure([
            'type',
            'count',
            'features' => [
                '*' => [
                    'type',
                    'id',
                    'geometry' => [
                        'type',
                        'coordinates',
                    ],
                    'properties' => [
                        'id',
                        'name',
                        'barangay',
                        'district',
                        'floor_area',
                        'capacity',
                        'max_capacity',
                        'current_occupancy',
                        'available_capacity',
                        'type',
                        'facility_type',
                        'status',
                    ],
                ],
            ],
        ]);

    $features = $response->json('features');
    expect($features)->toHaveCount(4);

    $first = $features[0];
    expect($first['type'])->toBe('Feature');
    expect($first['geometry']['type'])->toBe('Point');
    expect($first['geometry']['coordinates'])->toBeArray();
    expect($first['geometry']['coordinates'])->toHaveCount(2);
});

test('GET /api/shelters/map works with query parameter api_key for easy map embed', function () {
    $response = $this->getJson("/api/shelters/map?api_key={$this->validKey}&district=I&type=court");

    $response->assertOk()
        ->assertJson([
            'type' => 'FeatureCollection',
            'count' => 1,
        ]);

    $feature = $response->json('features.0');
    expect($feature['properties']['name'])->toBe('Covered Court at Ayala');
    expect($feature['properties']['district'])->toBe('District I');
    expect($feature['geometry']['coordinates'])->toBe([122.0102, 6.9601]);
});

// ─────────────────────────────────────────────────────────────
// 📊 API KEY MONITORING & ADMIN MANAGEMENT TESTS
// ─────────────────────────────────────────────────────────────

test('API key usage increments request counter and stores client IP', function () {
    $keyRecord = ApiKey::where('key', $this->validKey)->first();
    expect($keyRecord->requests_count)->toBe(0);
    expect($keyRecord->last_ip)->toBeNull();

    $this->withHeaders(['X-API-KEY' => $this->validKey])->getJson('/api/shelters');
    $this->withHeaders(['X-API-KEY' => $this->validKey])->getJson('/api/shelters');

    $keyRecord->refresh();
    expect($keyRecord->requests_count)->toBe(2);
    expect($keyRecord->last_ip)->not->toBeNull();
});

test('artisan command api-key:list outputs monitoring table', function () {
    $this->artisan('api-key:list')
        ->expectsOutputToContain('GENERATED SHELTERS API KEYS & TRAFFIC MONITORING')
        ->expectsOutputToContain('Partner Project Test')
        ->assertSuccessful();
});

test('artisan commands api-key:revoke and api-key:activate toggle active status', function () {
    $keyRecord = ApiKey::where('key', $this->validKey)->first();
    expect($keyRecord->is_active)->toBeTrue();

    // Revoke
    $this->artisan('api-key:revoke', ['id' => $keyRecord->id])
        ->expectsOutputToContain('REVOKED')
        ->assertSuccessful();

    $keyRecord->refresh();
    expect($keyRecord->is_active)->toBeFalse();

    // Activate
    $this->artisan('api-key:activate', ['id' => $keyRecord->id])
        ->expectsOutputToContain('REACTIVATED')
        ->assertSuccessful();

    $keyRecord->refresh();
    expect($keyRecord->is_active)->toBeTrue();
});

test('admin can view API keys and traffic metrics via GET /api/admin/api-keys', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/api-keys');

    $response->assertOk()
        ->assertJsonStructure([
            'status',
            'summary' => [
                'total_keys',
                'active_keys',
                'total_requests',
            ],
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'masked_key',
                    'is_active',
                    'status_label',
                    'requests_count',
                    'last_used_at',
                    'last_ip',
                ],
            ],
        ]);
});

test('admin can create a new API key via POST /api/admin/api-keys', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/api-keys', [
        'name' => 'WMSU Research Team',
        'days' => 30,
    ]);

    $response->assertCreated()
        ->assertJson([
            'status' => 'success',
            'data' => [
                'name' => 'WMSU Research Team',
                'is_active' => true,
            ],
        ]);

    expect(ApiKey::where('name', 'WMSU Research Team')->exists())->toBeTrue();
});

test('admin can toggle active status via PATCH /api/admin/api-keys/:id/toggle', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $keyRecord = ApiKey::where('key', $this->validKey)->first();

    $response = $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/api-keys/{$keyRecord->id}/toggle");

    $response->assertOk();
    $keyRecord->refresh();
    expect($keyRecord->is_active)->toBeFalse();
});

test('admin can delete an API key via DELETE /api/admin/api-keys/:id', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $keyRecord = ApiKey::where('key', $this->validKey)->first();

    $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/api-keys/{$keyRecord->id}");

    $response->assertOk();
    expect(ApiKey::find($keyRecord->id))->toBeNull();
});

test('API requests generate structured ApiKeyLog records', function () {
    $this->withHeaders(['X-API-KEY' => $this->validKey])->getJson('/api/shelters');

    $log = \App\Models\ApiKeyLog::orderByDesc('id')->first();
    expect($log)->not->toBeNull();
    expect($log->key_name)->toBe('Partner Project Test');
    expect($log->endpoint)->toContain('/api/shelters');
    expect($log->status_code)->toBe(200);
    expect($log->duration_ms)->toBeGreaterThanOrEqual(0);
});

test('admin can query API key access logs via GET /api/admin/api-keys/logs', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $this->withHeaders(['X-API-KEY' => $this->validKey])->getJson('/api/shelters');

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/api-keys/logs');

    $response->assertOk()
        ->assertJsonStructure([
            'status',
            'count',
            'data' => [
                '*' => [
                    'id',
                    'key_name',
                    'ip_address',
                    'method',
                    'endpoint',
                    'status_code',
                    'duration_ms',
                    'created_at',
                ],
            ],
        ]);
});

test('artisan command api-key:logs outputs recent requests', function () {
    $this->withHeaders(['X-API-KEY' => $this->validKey])->getJson('/api/shelters');

    $this->artisan('api-key:logs')
        ->expectsOutputToContain('RECENT PARTNER API KEY ACCESS LOGS')
        ->expectsOutputToContain('Partner Project Test')
        ->assertSuccessful();
});
