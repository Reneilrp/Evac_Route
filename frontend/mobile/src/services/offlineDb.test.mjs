import assert from 'node:assert';
import {
  initDb,
  getDb,
  getCacheSyncStatus,
  saveShelters,
  getOfflineShelters,
  saveHazards,
  getOfflineHazards,
  saveHazardsExtended,
  getOfflineHazardsExtended,
  isCoordinateUnsafe,
  getDistanceMeters,
  syncRoadNetworkFromApi,
  getOfflineNodes,
  getOfflineEdges,
} from './offlineDb.js';

console.log('🧪 Starting Mobile SQLite Offline Database Engine Tests...\n');

// 1. Database Initialization & Seeding
console.log('📦 1. Testing SQLite database initialization and graph seeding...');
initDb();
const db = getDb();
assert.ok(db, 'Database instance must be initialized');

const seededNodes = getOfflineNodes();
assert.ok(seededNodes.length >= 7, `Expected at least 7 seeded nodes, got ${seededNodes.length}`);
assert.ok(seededNodes.some((n) => n.id === 1 && n.lat === 6.915 && n.lng === 122.085));

const seededEdges = getOfflineEdges();
assert.ok(seededEdges.length >= 10, `Expected at least 10 seeded edges (bidirectional), got ${seededEdges.length}`);
assert.ok(seededEdges.some((e) => e.source_node === 1 && e.target_node === 2));
console.log(`✅ Database schema & graph seeded successfully (${seededNodes.length} nodes, ${seededEdges.length} edges).\n`);

// 2. Haversine Distance Helper
console.log('📐 2. Testing Haversine distance engine (getDistanceMeters)...');
const distance = getDistanceMeters(6.9152, 122.0614, 6.9214, 122.0865); // WMSU to Tetuan
assert.ok(distance > 2800 && distance < 3500, `Expected ~3100m, got ${distance}`);

const zeroDistance = getDistanceMeters(6.9152, 122.0614, 6.9152, 122.0614);
assert.strictEqual(Math.round(zeroDistance), 0);
console.log('✅ Haversine distance calculation verified.\n');

// 3. Shelter Offline Caching
console.log('🏠 3. Testing shelter offline caching (saveShelters & getOfflineShelters)...');
const mockShelters = [
  {
    id: 101,
    name: 'Tetuan Central School Evacuation Center',
    latitude: '6.9205',
    longitude: '122.0845',
    max_capacity: 450,
    current_occupancy: 120,
    status: 'open',
    facility_type: 'evacuation_center',
    is_secured_facility: 1,
    emergency_contact: '0917-111-2222',
    elevation_meters: 6.5,
    is_permanent: 0,
  },
  {
    id: 102,
    name: 'Pasonanca Permanent Safe Shelter',
    latitude: '6.9450',
    longitude: '122.0710',
    max_capacity: 1200,
    current_occupancy: 0,
    status: 'open',
    facility_type: 'permanent_shelter',
    is_secured_facility: 1,
    emergency_contact: '0917-333-4444',
    elevation_meters: 25.0,
    is_permanent: 1,
  },
];

saveShelters(mockShelters);
const cachedShelters = getOfflineShelters();
assert.strictEqual(cachedShelters.length, 2, 'Should have exactly 2 cached shelters');

const tetuan = cachedShelters.find((s) => s.id === 101);
assert.ok(tetuan, 'Tetuan shelter must exist');
assert.strictEqual(tetuan.latitude, 6.9205);
assert.strictEqual(tetuan.longitude, 122.0845);
assert.strictEqual(tetuan.elevation_meters, 6.5);
assert.strictEqual(tetuan.is_permanent, 0);

const pasonanca = cachedShelters.find((s) => s.id === 102);
assert.ok(pasonanca, 'Pasonanca shelter must exist');
assert.strictEqual(pasonanca.is_permanent, 1);
assert.strictEqual(pasonanca.elevation_meters, 25.0);
console.log('✅ Shelter offline caching and elevation metadata verified.\n');

// 4. Hazard Offline Caching & Unsafe Coordinate Boundary Check
console.log('⚠️ 4. Testing hazard offline caching and coordinate safety check...');
const mockHazards = [
  {
    id: 201,
    name: 'Tetuan River Rising Flood',
    latitude: '6.9210',
    longitude: '122.0850',
    radius_meters: '150',
    disaster_category: 'natural',
    hazard_type: 'flood',
    severity_level: 'high',
  },
];

saveHazards(mockHazards);
const cachedHazards = getOfflineHazards();
assert.strictEqual(cachedHazards.length, 1);
assert.strictEqual(cachedHazards[0].id, 201);
assert.strictEqual(cachedHazards[0].radius_meters, 150);

// Point 20 meters from hazard center -> must be UNSAFE
const insideHazard = isCoordinateUnsafe(6.9211, 122.0851);
assert.strictEqual(insideHazard, true, 'Point inside hazard radius must be identified as unsafe');

// Point 500 meters away -> must be SAFE
const outsideHazard = isCoordinateUnsafe(6.9260, 122.0900);
assert.strictEqual(outsideHazard, false, 'Point outside hazard radius must be identified as safe');
console.log('✅ Hazard caching and boundary checking verified.\n');

// 5. Extended Hazard Caching (with Corridors & Road Geometry)
console.log('🛣️ 5. Testing extended hazards with road corridors...');
const mockExtendedHazards = [
  {
    id: 301,
    latitude: 6.9180,
    longitude: 122.0720,
    radius_meters: 100,
    geometry_type: 'corridor',
    corridor_coordinates: [
      [122.0710, 6.9175],
      [122.0720, 6.9180],
      [122.0730, 6.9185],
    ],
    hazard_type: 'flood',
    severity_level: 'critical',
  },
];

saveHazardsExtended(mockExtendedHazards);
const extendedCached = getOfflineHazardsExtended();
assert.strictEqual(extendedCached.length, 1);
assert.strictEqual(extendedCached[0].geometry_type, 'corridor');
assert.ok(extendedCached[0].corridor_coordinates.includes('122.071'));
console.log('✅ Extended hazard corridors and GeoJSON properties verified.\n');

// 6. Dynamic Road Network Sync from API
console.log('🌐 6. Testing dynamic road network synchronization from API...');
const dynamicApiPayload = {
  nodes: [
    { id: 10, lat: 6.9100, lng: 122.0600, elevation_meters: 5.0 },
    { id: 11, lat: 6.9120, lng: 122.0620, elevation_meters: 6.0 },
    { id: 12, lat: 6.9140, lng: 122.0640, elevation_meters: 7.0 },
  ],
  edges: [
    {
      source_node_id: 10,
      target_node_id: 11,
      distance_meters: 250,
      status: 'open',
      geometry: [[122.0600, 6.9100], [122.0620, 6.9120]],
      flood_susceptibility: 'low',
      min_elevation_meters: 5.0,
    },
    {
      source_node_id: 11,
      target_node_id: 12,
      distance_meters: 300,
      status: 'danger', // Should triple cost multiplier (900m)
      geometry: [[122.0620, 6.9120], [122.0640, 6.9140]],
      flood_susceptibility: 'high',
      min_elevation_meters: 4.5,
    },
    {
      source_node_id: 10,
      target_node_id: 12,
      distance_meters: 600,
      status: 'blocked', // Hard-block -> Must be completely excluded
      geometry: [[122.0600, 6.9100], [122.0640, 6.9140]],
      flood_susceptibility: 'critical',
      min_elevation_meters: 3.0,
    },
  ],
};

syncRoadNetworkFromApi(dynamicApiPayload);

const updatedNodes = getOfflineNodes();
assert.strictEqual(updatedNodes.length, 3, 'All 3 dynamic nodes must be cached');

const updatedEdges = getOfflineEdges();
// 2 valid edges * 2 directions = 4 edges. Blocked edge must be excluded.
assert.strictEqual(updatedEdges.length, 4, 'Only open and danger edges (4 directional edges) should be inserted');

// Blocked edge should NOT exist in edges table
const blockedEdge = updatedEdges.find(
  (e) => (e.source_node === 10 && e.target_node === 12) || (e.source_node === 12 && e.target_node === 10)
);
assert.strictEqual(blockedEdge, undefined, 'Blocked edges must be completely excluded from graph');

// Danger edge should have tripled distance
const dangerEdge = updatedEdges.find(
  (e) => e.source_node === 11 && e.target_node === 12
);
assert.ok(dangerEdge, 'Danger edge must exist');
assert.strictEqual(dangerEdge.distance, 900, 'Danger edge distance must have 3x penalty multiplier applied');
console.log('✅ Dynamic road network sync, blocked exclusion, and danger penalty verified.\n');

// 7. Cache Metadata
console.log('📊 7. Testing cache synchronization status metadata...');
const syncStatus = getCacheSyncStatus();
assert.ok(syncStatus.shelters, 'Shelters cache sync timestamp must be recorded');
assert.ok(syncStatus.hazards, 'Hazards cache sync timestamp must be recorded');
assert.ok(syncStatus.road_network, 'Road network cache sync timestamp must be recorded');
console.log('✅ Cache sync metadata verified.\n');

console.log('🎉 ALL MOBILE OFFLINE DATABASE ENGINE TESTS COMPLETED SUCCESSFULLY!');
