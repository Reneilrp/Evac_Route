import assert from 'node:assert';
import {
  ZAMBOANGA_RESCUER_BASE,
  ZAMBOANGA_VICTIM_DEFAULT,
  ZAMBOANGA_SHELTER_DEFAULT,
  ZAMBOANGA_WMSU,
  ZAMBOANGA_TETUAN,
  isValidZamboangaLocation,
  clampToZamboanga,
  createHazardRoadCorridorLine,
  buildHazardGeoJSONFeature,
  getNearestBarangay,
} from './zamboangaGeo.js';

console.log('🧪 Starting Zamboanga Geo & Emulator Clamping Tests...\n');

// 1. Strategic Landmarks Verification
console.log('📍 1. Testing strategic reference landmarks...');
assert.deepStrictEqual(ZAMBOANGA_WMSU, [122.0614, 6.9152], 'ZAMBOANGA_WMSU coords mismatch');
assert.deepStrictEqual(ZAMBOANGA_TETUAN, [122.0865, 6.9214], 'ZAMBOANGA_TETUAN coords mismatch');
assert(isValidZamboangaLocation(ZAMBOANGA_WMSU), 'WMSU should be valid Zamboanga location');
assert(isValidZamboangaLocation(ZAMBOANGA_TETUAN), 'Tetuan should be valid Zamboanga location');
assert(isValidZamboangaLocation(ZAMBOANGA_RESCUER_BASE), 'Base should be valid Zamboanga location');
assert(isValidZamboangaLocation(ZAMBOANGA_VICTIM_DEFAULT), 'Victim default should be valid Zamboanga location');
assert(isValidZamboangaLocation(ZAMBOANGA_SHELTER_DEFAULT), 'Shelter default should be valid Zamboanga location');
console.log('✅ Strategic landmarks are inside Zamboanga bounds.\n');

// 2. Emulator / California Detection
console.log('🌐 2. Testing detection of out-of-bounds coordinates (e.g. Android Emulator / Googleplex)...');
const GOOGLE_HQ_CALIFORNIA = [-122.084, 37.422];
const MANILA_COORDS = [120.9842, 14.5995];
const NULL_ISLAND = [0, 0];

assert.strictEqual(isValidZamboangaLocation(GOOGLE_HQ_CALIFORNIA), false, 'Google HQ should not be inside Zamboanga');
assert.strictEqual(isValidZamboangaLocation(MANILA_COORDS), false, 'Manila should not be inside Zamboanga bounds');
assert.strictEqual(isValidZamboangaLocation(NULL_ISLAND), false, '0,0 should not be valid Zamboanga');
assert.strictEqual(isValidZamboangaLocation(null), false, 'null should not be valid');
assert.strictEqual(isValidZamboangaLocation([]), false, 'empty array should not be valid');
console.log('✅ Out-of-bounds emulator coordinates correctly identified as invalid.\n');

// 3. Automatic Clamping to ZAMBOANGA_WMSU
console.log('🔒 3. Testing automatic clamping fallback to ZAMBOANGA_WMSU...');
const clampedGoogleHQ = clampToZamboanga(GOOGLE_HQ_CALIFORNIA, ZAMBOANGA_WMSU);
assert.deepStrictEqual(clampedGoogleHQ, ZAMBOANGA_WMSU, 'Google HQ must clamp to ZAMBOANGA_WMSU');

const clampedManila = clampToZamboanga({ latitude: 14.5995, longitude: 120.9842 }, ZAMBOANGA_WMSU);
assert.deepStrictEqual(clampedManila, ZAMBOANGA_WMSU, 'Manila object coords must clamp to ZAMBOANGA_WMSU');

const clampedNull = clampToZamboanga(null, ZAMBOANGA_WMSU);
assert.deepStrictEqual(clampedNull, ZAMBOANGA_WMSU, 'null coords must clamp to ZAMBOANGA_WMSU');

// 4. In-bounds coordinates preserved
console.log('🎯 4. Testing that valid Zamboanga coordinates are preserved...');
const localCoord = [122.0712, 6.9189];
const clampedLocal = clampToZamboanga(localCoord, ZAMBOANGA_WMSU);
assert.deepStrictEqual(clampedLocal, localCoord, 'Local coordinate should not be changed');

const localObjCoord = { latitude: 6.9189, longitude: 122.0712 };
const clampedLocalObj = clampToZamboanga(localObjCoord, ZAMBOANGA_WMSU);
assert.deepStrictEqual(clampedLocalObj, [122.0712, 6.9189], 'Local object coordinate should be preserved as [lng, lat]');

console.log('✅ In-bounds coordinates properly preserved.\n');

// 5. Testing Nearest Barangay Geocoding
console.log('🏘️ 5. Testing nearest barangay geocoding from lat/lng...');
const bgyTetuan = getNearestBarangay(122.0886, 6.9192);
assert.strictEqual(bgyTetuan, 'Tetuan', 'Coordinate [122.0886, 6.9192] should resolve to Tetuan');

const bgyBaliwasan = getNearestBarangay(122.0571, 6.9150);
assert.strictEqual(bgyBaliwasan, 'Baliwasan', 'Coordinate [122.0571, 6.9150] should resolve to Baliwasan');

const bgySantaMaria = getNearestBarangay(122.0789, 6.9322);
assert.strictEqual(bgySantaMaria, 'Santa Maria', 'Coordinate [122.0789, 6.9322] should resolve to Santa Maria');
console.log('✅ Nearest barangay lookup correctly identifies Zamboanga City barangays.\n');

// 6. Testing Road Corridor Line Generation (Line instead of Circle)
console.log('🛣️ 6. Testing road hazard corridor line generator (line instead of circle)...');
const hazardLine = createHazardRoadCorridorLine([122.0750, 6.9210], 75);
assert.strictEqual(hazardLine.type, 'Feature', 'Must return GeoJSON Feature');
assert.strictEqual(hazardLine.geometry.type, 'LineString', 'Must be LineString instead of Polygon');
assert.strictEqual(hazardLine.geometry.coordinates.length, 2, 'LineString must have 2 corridor endpoints');
assert(hazardLine.geometry.coordinates[0][0] < hazardLine.geometry.coordinates[1][0], 'Coordinates should span west-to-east along roadway');

// 6b. Testing Road Corridor with multi-point curvature coordinates (e.g. San Roque street curve)
const sampleRoadCorridor = [
  [122.055483, 6.927206],
  [122.0562, 6.927263],
  [122.056328, 6.927276],
  [122.057651, 6.927391],
  [122.057679, 6.926887],
  [122.057696, 6.926653],
];
const curvedHazardLine = createHazardRoadCorridorLine([122.056, 6.927], 50, { severity: 'high' }, sampleRoadCorridor);
assert.strictEqual(curvedHazardLine.geometry.type, 'LineString');
assert.strictEqual(curvedHazardLine.geometry.coordinates.length, 6, 'Should retain all 6 road curvature coordinates');
assert.strictEqual(curvedHazardLine.properties.severity, 'high');

// 6c. Testing buildHazardGeoJSONFeature with stringified corridor_coordinates
const sampleHazardObj = {
  id: 46,
  name: 'Baha',
  latitude: 6.9272,
  longitude: 122.0562,
  radius_meters: 50,
  hazard_type: 'flood',
  severity_level: 'High',
  geometry_type: 'road_corridor',
  corridor_coordinates: JSON.stringify(sampleRoadCorridor),
};
const builtFeature = buildHazardGeoJSONFeature(sampleHazardObj);
assert.strictEqual(builtFeature.geometry.type, 'LineString');
assert.strictEqual(builtFeature.geometry.coordinates.length, 6, 'buildHazardGeoJSONFeature must parse and preserve road curvature points');
assert.strictEqual(builtFeature.properties.severity, 'high', 'Severity must be normalized to lowercase');
console.log('✅ Road hazard corridor line correctly outputs GeoJSON LineString with multi-point curvature.\n');

console.log('🎉 ALL ZAMBOANGA GEO & EMULATOR CLAMPING TESTS PASSED!');
