<?php

/**
 * Pre-Flight End-to-End Test for Shelters API & Partner API Key Infrastructure
 * Run via: DB_CONNECTION=sqlite DB_DATABASE=/home/pheinz/Evac_Route/backend/database/database.sqlite php backend/tests/verify_shelter_api_e2e.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\ApiKey;
use App\Models\ApiKeyLog;
use App\Models\Shelter;
use Illuminate\Http\Request;

echo "\n========================================================================\n";
echo "🧪 PRE-FLIGHT END-TO-END VERIFICATION: SHELTERS API & API KEY SYSTEM\n";
echo "========================================================================\n\n";

$passCount = 0;
$failCount = 0;

function assertCheck($label, $condition, $details = "") {
    global $passCount, $failCount;
    if ($condition) {
        $passCount++;
        echo "  ✅ PASS: {$label}" . ($details ? " -> {$details}" : "") . "\n";
    } else {
        $failCount++;
        echo "  ❌ FAIL: {$label}" . ($details ? " -> {$details}" : "") . "\n";
    }
}

function dispatchRequest($uri, $method = 'GET', $headers = []) {
    global $app;
    $req = Request::create($uri, $method);
    foreach ($headers as $k => $v) {
        $req->headers->set($k, $v);
    }
    return $app->handle($req);
}

// -----------------------------------------------------------------------------
// TEST 1: Database Seed Verification
// -----------------------------------------------------------------------------
echo "Step 1: Checking Shelter Database Records & Columns...\n";
$totalShelters = Shelter::count();
$district1Count = Shelter::where('district', 'District I')->count();
$district2Count = Shelter::where('district', 'District II')->count();
$officialShelters = Shelter::whereNotNull('district')->count();
$hasFloorArea = Shelter::whereNotNull('floor_area')->count();

assertCheck("Total facilities in database", $totalShelters >= 112, "Count: {$totalShelters} (including emergency infrastructure)");
assertCheck("Official Evacuation Centers & Covered Courts seeded", $officialShelters === 112, "Count: {$officialShelters}");
assertCheck("District I shelters mapped", $district1Count === 48, "Count: {$district1Count}/48");
assertCheck("District II shelters mapped", $district2Count === 64, "Count: {$district2Count}/64");
assertCheck("Floor areas (sq.m.) populated for official shelters", $hasFloorArea === 112, "Count: {$hasFloorArea}/112");

// -----------------------------------------------------------------------------
// TEST 2: Security Gate (No API Key)
// -----------------------------------------------------------------------------
echo "\nStep 2: Testing Security Enforcement without API Key...\n";
$unauthRes = dispatchRequest('/api/shelters');
assertCheck("GET /api/shelters without key returns 401 Unauthorized", $unauthRes->getStatusCode() === 401, "Status: {$unauthRes->getStatusCode()}");

$unauthMapRes = dispatchRequest('/api/shelters/map');
assertCheck("GET /api/shelters/map without key returns 401 Unauthorized", $unauthMapRes->getStatusCode() === 401, "Status: {$unauthMapRes->getStatusCode()}");

// -----------------------------------------------------------------------------
// TEST 3: Generate Live API Key & Test Access
// -----------------------------------------------------------------------------
echo "\nStep 3: Generating Test API Key & Testing Authentication...\n";
$keyRecord = ApiKey::generate('Pre-Flight Verification Partner');
assertCheck("API Key generated successfully", !empty($keyRecord->key), "Key: {$keyRecord->masked_key}");

$authRes = dispatchRequest('/api/shelters', 'GET', ['X-API-KEY' => $keyRecord->key]);
assertCheck("GET /api/shelters with X-API-KEY returns 200 OK", $authRes->getStatusCode() === 200, "Status: {$authRes->getStatusCode()}");

$body = json_decode($authRes->getContent(), true);
assertCheck("Response contains all operational facilities", ($body['count'] ?? 0) === $totalShelters, "Received: " . ($body['count'] ?? 0));

$first = $body['data'][0] ?? [];
assertCheck("Shelter record contains all requested fields", 
    isset($first['name'], $first['barangay'], $first['district'], $first['floor_area'], $first['capacity'], $first['coordinates']),
    "Name: '{$first['name']}', Brgy: '{$first['barangay']}', Area: {$first['floor_area']}m², Cap: {$first['capacity']}"
);

// -----------------------------------------------------------------------------
// TEST 4: Query Parameters & Filtering
// -----------------------------------------------------------------------------
echo "\nStep 4: Testing Query Filtering (District & Type)...\n";
$d1Res = dispatchRequest("/api/shelters?district=I&api_key={$keyRecord->key}");
$d1Body = json_decode($d1Res->getContent(), true);
assertCheck("Filter ?district=I returns District I only", $d1Res->getStatusCode() === 200 && ($d1Body['count'] ?? 0) === $district1Count, "Found {$d1Body['count']} in District I");

$courtRes = dispatchRequest("/api/shelters?type=court&api_key={$keyRecord->key}");
$courtBody = json_decode($courtRes->getContent(), true);
assertCheck("Filter ?type=court returns covered courts", $courtRes->getStatusCode() === 200 && ($courtBody['count'] ?? 0) > 0, "Found {$courtBody['count']} covered courts");

// -----------------------------------------------------------------------------
// TEST 5: GeoJSON Map Rendering Endpoint
// -----------------------------------------------------------------------------
echo "\nStep 5: Testing GeoJSON Map Rendering (/api/shelters/map)...\n";
$mapRes = dispatchRequest("/api/shelters/map?api_key={$keyRecord->key}");
$geoJson = json_decode($mapRes->getContent(), true);
assertCheck("GET /api/shelters/map returns FeatureCollection", ($geoJson['type'] ?? '') === 'FeatureCollection', "Type: {$geoJson['type']}");
assertCheck("Features array has all facility map points", count($geoJson['features'] ?? []) === $totalShelters, "Features: " . count($geoJson['features'] ?? []));

$feat1 = $geoJson['features'][0] ?? [];
$coords = $feat1['geometry']['coordinates'] ?? [];
assertCheck("Geometry coordinates are RFC 7946 [lng, lat]", is_array($coords) && count($coords) === 2 && $coords[0] > 120 && $coords[1] > 6, "Coordinates: [" . implode(', ', $coords) . "]");

// -----------------------------------------------------------------------------
// TEST 6: Real-Time Usage Monitoring & Request Counter
// -----------------------------------------------------------------------------
echo "\nStep 6: Verifying Usage Telemetry & Request Counters...\n";
$keyRecord->refresh();
assertCheck("Request counter incremented", $keyRecord->requests_count >= 4, "Total Hits: {$keyRecord->requests_count}");
assertCheck("Last used timestamp recorded", !empty($keyRecord->last_used_at), "Timestamp: " . $keyRecord->last_used_at->toDateTimeString());

$latestLog = ApiKeyLog::where('api_key_id', $keyRecord->id)->orderByDesc('id')->first();
assertCheck("ApiKeyLog recorded request details", !empty($latestLog), "Endpoint: {$latestLog?->endpoint}, Latency: {$latestLog?->duration_ms}ms, IP: {$latestLog?->ip_address}");

// -----------------------------------------------------------------------------
// TEST 7: Access Control Revocation & Reactivation
// -----------------------------------------------------------------------------
echo "\nStep 7: Testing Key Revocation & Reactivation...\n";
$keyRecord->update(['is_active' => false]);
$revokedRes = dispatchRequest("/api/shelters?api_key={$keyRecord->key}");
assertCheck("Revoked key rejected with 401 Unauthorized", $revokedRes->getStatusCode() === 401, "Status: {$revokedRes->getStatusCode()}");

$keyRecord->update(['is_active' => true]);
$reactivatedRes = dispatchRequest("/api/shelters?api_key={$keyRecord->key}");
assertCheck("Reactivated key accepted with 200 OK", $reactivatedRes->getStatusCode() === 200, "Status: {$reactivatedRes->getStatusCode()}");

// Cleanup
$keyRecord->delete();

echo "\n========================================================================\n";
echo "🏁 PRE-FLIGHT TEST SUMMARY: {$passCount} Passed, {$failCount} Failed\n";
echo "========================================================================\n\n";

exit($failCount > 0 ? 1 : 0);
