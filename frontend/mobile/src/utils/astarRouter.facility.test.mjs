import { determineTargetFacility } from './astarRouter.js';

console.log('🧪 Starting A* Earthquake Exclusion & Facility Target Tests...');

const mockFacilities = [
  {
    id: 1,
    name: 'Tetuan Barangay Covered Court',
    facility_type: 'covered_court',
    latitude: 6.9180,
    longitude: 122.0880,
    max_capacity: 500,
    current_occupancy: 50,
    status: 'open',
    allowed_hazards: ['flood', 'fire'],
  },
  {
    id: 2,
    name: 'Baliwasan Multi-Story Building Gym',
    facility_type: 'multi_story_building',
    latitude: 6.9150,
    longitude: 122.0550,
    max_capacity: 800,
    current_occupancy: 100,
    status: 'open',
    allowed_hazards: ['flood', 'tsunami'],
  },
  {
    id: 3,
    name: 'WMSU Grandstand Open Athletic Field',
    facility_type: 'open_field',
    latitude: 6.9135,
    longitude: 122.0600,
    max_capacity: 2500,
    current_occupancy: 0,
    status: 'open',
    allowed_hazards: ['earthquake', 'flood'],
  },
  {
    id: 4,
    name: 'Pasonanca Park Open Safe Zone',
    facility_type: 'safe_zone',
    latitude: 6.9450,
    longitude: 122.0700,
    max_capacity: 1000,
    current_occupancy: 0,
    status: 'open',
    allowed_hazards: ['earthquake', 'flood'],
  },
];

// Test 1: Earthquake active -> Must strictly select open field, never covered court or building
const earthquakeHazards = [
  {
    hazard_type: 'earthquake',
    severity_level: 'high',
    name: 'Magnitude 6.9 Epicenter Zone',
    latitude: 6.9380,
    longitude: 122.0740,
    is_active: true,
  },
];

const selectedForEarthquake = determineTargetFacility(6.9130, 122.0590, mockFacilities, earthquakeHazards);

if (!selectedForEarthquake) {
  throw new Error('Failed: Expected facility to be selected for earthquake.');
}

const target = selectedForEarthquake.facility;

if (!target) {
  throw new Error('Failed: Expected facility object inside return payload.');
}

if (target.facility_type === 'covered_court' || target.facility_type === 'multi_story_building') {
  throw new Error(`CRITICAL FAILURE: Earthquake routed to unsafe structure: ${target.facility_type} (${target.name})`);
}

if (target.id !== 3 && target.id !== 4) {
  throw new Error(`Failed: Expected Open Field safe zone (id 3 or 4), got id ${target.id}`);
}

if (!selectedForEarthquake.reason || !selectedForEarthquake.reason.includes('EARTHQUAKE ACTIVE')) {
  throw new Error('Failed: Custom reason missing earthquake notice.');
}

console.log('✅ 1. Earthquake hazard strictly excludes covered courts and enclosed structures, routing only to open fields.');

// Test 2: General/Flood scenario -> Can route to covered court or building normally
const floodHazards = [
  {
    hazard_type: 'flood',
    severity_level: 'medium',
    latitude: 6.9400,
    longitude: 122.0700,
    is_active: true,
  },
];

const selectedForFlood = determineTargetFacility(6.9179, 122.0879, mockFacilities, floodHazards);
if (!selectedForFlood) {
  throw new Error('Failed: Expected facility for flood.');
}
const floodTarget = selectedForFlood.facility;
if (!floodTarget || floodTarget.id !== 1) {
  throw new Error(`Expected closest shelter (Tetuan Covered Court id 1), got id ${floodTarget?.id}`);
}

console.log('✅ 2. Standard/Flood hazards route to closest shelter without earthquake restriction.');
console.log('🎉 ALL A* EARTHQUAKE EXCLUSION TESTS PASSED!');
