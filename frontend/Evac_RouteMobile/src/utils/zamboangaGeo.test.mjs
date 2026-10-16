import assert from 'node:assert';
import {
  ZAMBOANGA_BOUNDS,
  ZAMBOANGA_RESCUER_BASE,
  ZAMBOANGA_VICTIM_DEFAULT,
  ZAMBOANGA_SHELTER_DEFAULT,
  ZAMBOANGA_WMSU,
  ZAMBOANGA_TETUAN,
  isValidZamboangaLocation,
  clampToZamboanga,
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
console.log('🎉 ALL ZAMBOANGA GEO & EMULATOR CLAMPING TESTS PASSED!');
