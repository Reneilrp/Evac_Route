import assert from 'node:assert';
import {
  getHaversineDistanceMeters,
  getRescuerCapabilityProfile,
  evaluateHazardsForRescuer,
} from './tacticalRescueRouter.js';

console.log('🧪 Starting Tactical Rescue Router & Roadblock Engine Tests...\n');

// 1. Test Rescuer Capability Profile
const boatProfile = getRescuerCapabilityProfile({ unit_type: 'marine_boat' }, { rescue_role: 'boat_pilot' });
assert.strictEqual(boatProfile.isWaterCraft, true, 'Marine unit should be water craft');
assert.strictEqual(boatProfile.isHighClearanceTruck, false);

const truckProfile = getRescuerCapabilityProfile({ unit_type: 'high_clearance_4x4' }, { rescue_role: 'heavy_driver' });
assert.strictEqual(truckProfile.isHighClearanceTruck, true, '4x4 unit should be high clearance');
assert.strictEqual(truckProfile.isWaterCraft, false);

console.log('✅ 1. Rescuer capability profiling verified.');

// 2. Test Hazard Differentiation (Floods vs Roadblocks)
const mockHazards = [
  { id: 1, name: 'San Jose Flood', hazard_type: 'flood', severity_level: 'medium', latitude: 6.915, longitude: 122.075, radius_meters: 100 },
  { id: 2, name: 'Baliwasan Deep Flood', hazard_type: 'flood', severity_level: 'high', latitude: 6.918, longitude: 122.078, radius_meters: 150 },
  { id: 3, name: 'Armed Hostage Zone', hazard_type: 'siege', severity_level: 'critical', latitude: 6.920, longitude: 122.080, radius_meters: 200 },
];

// Boat pilot: All floods are passable water channels
const boatEvalWithoutBlockades = evaluateHazardsForRescuer(mockHazards, boatProfile, []);
assert.strictEqual(boatEvalWithoutBlockades.passableFloods.length, 2, 'Boat can traverse both medium and deep floods');
assert.strictEqual(boatEvalWithoutBlockades.criticalObstacles.length, 1, 'Only siege is critical obstacle');

// Truck driver: Medium flood passable, high flood impassable
const truckEvalWithoutBlockades = evaluateHazardsForRescuer(mockHazards, truckProfile, []);
assert.strictEqual(truckEvalWithoutBlockades.passableFloods.length, 1, '4x4 truck can wade medium flood');
assert.strictEqual(truckEvalWithoutBlockades.criticalObstacles.length, 2, 'High flood and siege are critical obstacles');

console.log('✅ 2. Flood penetrability verified: boats navigate all floods, 4x4 trucks wade medium floods.');

// 3. Test Multi-Roadblock Injection
const customRoadblocks = [
  { id: 'rb-1', number: 1, label: 'Roadblock #1 (Collapsed Wall)', latitude: 6.913, longitude: 122.073, radius_meters: 50 },
  { id: 'rb-2', number: 2, label: 'Roadblock #2 (Downed Bridge)', latitude: 6.914, longitude: 122.074, radius_meters: 60 },
  { id: 'rb-3', number: 3, label: 'Roadblock #3 (Concrete Debris)', latitude: 6.916, longitude: 122.076, radius_meters: 45 },
];

// Boat pilot WITH Roadblocks
const boatEvalWithBlockades = evaluateHazardsForRescuer(mockHazards, boatProfile, customRoadblocks);
assert.strictEqual(boatEvalWithBlockades.criticalObstacles.length, 1 + 3, 'All 3 custom roadblocks must be added as critical obstacles');
assert.ok(boatEvalWithBlockades.criticalObstacles.some(o => o.name.includes('Roadblock #1')));
assert.ok(boatEvalWithBlockades.criticalObstacles.some(o => o.name.includes('Roadblock #2')));
assert.ok(boatEvalWithBlockades.criticalObstacles.some(o => o.name.includes('Roadblock #3')));

// Truck driver WITH Roadblocks
const truckEvalWithBlockades = evaluateHazardsForRescuer(mockHazards, truckProfile, customRoadblocks);
assert.strictEqual(truckEvalWithBlockades.criticalObstacles.length, 2 + 3, 'Both existing critical obstacles + 3 roadblocks');

console.log('✅ 3. Multi-roadblock injection verified: All chained field roadblocks are enforced as absolute critical detours for ALL units.');

// 4. Test Haversine Distance
const d = getHaversineDistanceMeters(6.9126, 122.0729, 6.9150, 122.0750);
assert.ok(d > 300 && d < 400, `Distance should be ~350m, got ${d}`);

console.log('✅ 4. Haversine distance engine verified.');

console.log('\n🎉 ALL TACTICAL RESCUE ROUTER & ROADBLOCK ENGINE TESTS PASSED!');
