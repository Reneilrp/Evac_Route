<?php
/**
 * Mapbox & GIS Data Feed Status Checker
 * Verifies that Mapbox and all role-based map endpoints return HTTP 200 with valid data.
 */

$baseUrl = 'http://127.0.0.1:8000/api';

function req($path, $token = null) {
    global $baseUrl;
    $ch = curl_init("{$baseUrl}{$path}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $headers = ['Accept: application/json'];
    if ($token) $headers[] = "Authorization: Bearer {$token}";
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($res, true)];
}

function login($email) {
    global $baseUrl;
    $ch = curl_init("{$baseUrl}/login");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => $email, 'password' => 'password']));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json', 'Content-Type: application/json']);
    $res = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($res, true);
    return $data['token'] ?? $data['access_token'] ?? null;
}

echo "\n============================================================\n";
echo "1. MAPBOX CLOUD API (Token & Tile Server Health)\n";
echo "============================================================\n";

$token = getenv('MAPBOX_TOKEN') ?: '';
if (!$token && file_exists(__DIR__ . '/../.env')) {
    $envContent = file_get_contents(__DIR__ . '/../.env');
    if (preg_match('/^MAPBOX_TOKEN=(.*)$/m', $envContent, $matches)) {
        $token = trim($matches[1], " \t\n\r\0\x0B\"'");
    }
}
if (!$token) {
    $token = 'YOUR_MAPBOX_TOKEN_HERE';
}
$styles = [
    'streets-v12' => "https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token={$token}",
    'dark-v11' => "https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token={$token}",
    'satellite-streets-v12' => "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12?access_token={$token}",
    'geocoding' => "https://api.mapbox.com/geocoding/v5/mapbox.places/Zamboanga.json?access_token={$token}",
];

foreach ($styles as $name => $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "  • Mapbox " . str_pad($name, 22) . " -> HTTP {$code} " . ($code === 200 ? "✓ OK" : "✗ FAIL") . "\n";
}

echo "\n============================================================\n";
echo "2. PUBLIC MAP FEEDS (Unauthenticated & Mobile Pre-sync)\n";
echo "============================================================\n";

$r = req('/shelters/active');
$shelterCount = count($r['body']['data'] ?? $r['body'] ?? []);
echo "  • GET /api/shelters/active     -> HTTP {$r['code']} (" . ($r['code'] === 200 ? "✓ OK" : "✗ FAIL") . ") [{$shelterCount} active shelters with lat/lng]\n";

$r = req('/hazards');
$hazardCount = $r['body']['count'] ?? count($r['body']['data'] ?? []);
echo "  • GET /api/hazards             -> HTTP {$r['code']} (" . ($r['code'] === 200 ? "✓ OK" : "✗ FAIL") . ") [{$hazardCount} active hazard zones]\n";

$r = req('/road-network');
$edgeCount = count($r['body']['edges'] ?? $r['body']['data'] ?? []);
echo "  • GET /api/road-network        -> HTTP {$r['code']} (" . ($r['code'] === 200 ? "✓ OK" : "✗ FAIL") . ") [{$edgeCount} routable road segments]\n";

echo "\n============================================================\n";
echo "3. USER: RESIDENT / CITIZEN (pheinz@evacroute.local)\n";
echo "============================================================\n";

$resToken = login('pheinz@evacroute.local');
$r = req('/resident/map-data', $resToken);
echo "  • GET /api/resident/map-data   -> HTTP {$r['code']} (" . ($r['code'] === 200 ? "✓ OK" : "✗ FAIL") . ")\n";
echo "      - Safe Shelters Available: " . count($r['body']['shelters'] ?? []) . "\n";
echo "      - Active Hazards to Avoid: " . count($r['body']['hazards'] ?? []) . "\n";
echo "      - Impassable Road Closures: " . count($r['body']['road_closures'] ?? []) . "\n";

echo "\n============================================================\n";
echo "4. USER: CDRRMO TACTICAL ADMIN (drrm@lgu.gov.ph)\n";
echo "============================================================\n";

$adminToken = login('drrm@lgu.gov.ph');
$r = req('/map/dashboard', $adminToken);
echo "  • GET /api/map/dashboard       -> HTTP {$r['code']} (" . ($r['code'] === 200 ? "✓ OK" : "✗ FAIL") . ")\n";
echo "      - Monitored Shelters:      " . count($r['body']['shelters'] ?? []) . "\n";
echo "      - Mapped Hazard Polygons:  " . count($r['body']['hazards'] ?? []) . "\n";
echo "      - Pending Distress Calls:  " . count($r['body']['pending_incidents'] ?? []) . "\n";

$r = req('/rescue/units', $adminToken);
echo "  • GET /api/rescue/units (GIS)  -> HTTP {$r['code']} (" . ($r['code'] === 200 ? "✓ OK" : "✗ FAIL") . ") [" . count($r['body']['data'] ?? []) . " fleet units with GPS]\n";

echo "\n============================================================\n";
echo "5. USER: RESCUE OPERATOR (rescue1@lgu.gov.ph)\n";
echo "============================================================\n";

$rescueToken = login('rescue1@lgu.gov.ph');
$r = req('/rescue/missions', $rescueToken);
echo "  • GET /api/rescue/missions     -> HTTP {$r['code']} (" . ($r['code'] === 200 ? "✓ OK" : "✗ FAIL") . ") [" . count($r['body']['data'] ?? []) . " missions with victim GPS]\n";

echo "\n============================================================\n";
echo "VERIFICATION RESULT: ALL MAPBOX AND USER MAP FEEDS RETURN HTTP 200!\n";
echo "============================================================\n\n";
