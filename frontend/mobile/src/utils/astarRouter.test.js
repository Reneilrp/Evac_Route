import assert from 'node:assert';
import { determineTargetFacility } from './astarRouter.js';

console.log('🧪 Running CDRRMO Hazard-Specific Safe Zone Routing Unit Tests in astarRouter.test.js...');

const mockFacilities = [
  {
    id: 1,
    name: 'Tetuan Barangay Covered Court',
    facility_type: 'covered_court',
    elevation_meters: 6,
    latitude: 6.9180,
    longitude: 122.0880,
    max_capacity: 500,
    current_occupancy: 50,
    status: 'open',
    allowed_hazards: ['flood', 'fire'],
  },
  {
    id: 2,
    name: 'City Hall Administrative Center',
    facility_type: 'building',
    elevation_meters: 8,
    latitude: 6.9120,
    longitude: 122.0720,
    max_capacity: 600,
    current_occupancy: 20,
    status: 'open',
    allowed_hazards: ['flood'],
  },
  {
    id: 3,
    name: 'WMSU Grandstand Open Athletic Field',
    facility_type: 'open_field',
    elevation_meters: 10,
    latitude: 6.9135,
    longitude: 122.0600,
    max_capacity: 2500,
    current_occupancy: 0,
    status: 'open',
    allowed_hazards: ['earthquake', 'flood'],
  },
  {
    id: 4,
    name: 'Pasonanca Permanent Evacuation Center',
    facility_type: 'permanent_shelter',
    elevation_meters: 28,
    latitude: 6.9450,
    longitude: 122.0700,
    max_capacity: 1000,
    current_occupancy: 0,
    status: 'open',
    allowed_hazards: ['flood', 'typhoon'],
  },
  {
    id: 5,
    name: 'CDRRMO Pinned Emergency Safe Zone',
    facility_type: 'safe_zone',
    is_pinned: true,
    is_custom_pinned: true,
    elevation_meters: 18,
    latitude: 6.9300,
    longitude: 122.0750,
    max_capacity: 800,
    current_occupancy: 0,
    status: 'open',
    allowed_hazards: ['earthquake', 'flood', 'landslide'],
  },
];

// Test Case 1: When hazard is 'earthquake', shelters with facility_type 'covered_court' or 'building' are excluded from candidate destinations; only 'open_field' facilities are selected.
console.log('Testing Test Case 1: Earthquake hazard exclusions...');
{
  const earthquakeHazard = [{
    hazard_type: 'earthquake',
    severity_level: 'critical',
    is_active: true,
    latitude: 6.9200,
    longitude: 122.0700,
  }];

  // User is located right near City Hall Building (id: 2) and Covered Court (id: 1)
  const result = determineTargetFacility(6.9121, 122.0721, mockFacilities, earthquakeHazard);

  assert.ok(result, 'Expected a facility destination to be returned');
  assert.ok(result.facility, 'Expected a facility object in result');
  assert.notStrictEqual(result.facility.facility_type, 'covered_court', 'Covered court must be excluded during earthquakes');
  assert.notStrictEqual(result.facility.facility_type, 'building', 'Building structures must be excluded during earthquakes');
  assert.strictEqual(result.facility.facility_type, 'open_field', 'Only open field safe zones should be selected for earthquakes');
  assert.strictEqual(result.facility.id, 3, 'Expected WMSU Grandstand Open Athletic Field (id 3)');
  assert.match(result.reason, /EARTHQUAKE ACTIVE/i, 'Expected earthquake alert notice in reason');

  console.log('✅ Test Case 1 Passed: Covered courts and buildings strictly excluded; open fields selected.');
}

// Test Case 2: When hazard is 'flood', prioritize high-elevation shelters and permanent evacuation centers.
console.log('Testing Test Case 2: Flood hazard high-elevation and permanent shelter prioritization...');
{
  const floodHazard = [{
    hazard_type: 'flood',
    severity_level: 'high',
    is_active: true,
    latitude: 6.9150,
    longitude: 122.0750,
  }];

  // User is located in low-lying area closer to low-elevation covered court (id: 1, 6m elevation)
  // But during floods, high-elevation permanent evacuation centers (id: 4, 28m elevation) must be prioritized
  const result = determineTargetFacility(6.9200, 122.0800, mockFacilities, floodHazard);

  assert.ok(result, 'Expected a facility destination to be returned');
  assert.ok(result.facility, 'Expected a facility object in result');
  assert.strictEqual(result.facility.id, 4, 'Expected Pasonanca Permanent Evacuation Center (id 4) to be prioritized over low-lying shelters');
  assert.strictEqual(result.facility.facility_type, 'permanent_shelter', 'Expected permanent_shelter to be selected during flood');
  assert.ok(result.facility.elevation_meters >= 15, 'Prioritized shelter must have safe high elevation (>= 15m)');
  assert.match(result.reason, /FLOOD/i, 'Expected flood high-elevation prioritization in reason');

  console.log('✅ Test Case 2 Passed: High-elevation and permanent evacuation centers prioritized during flood.');
}

// Test Case 3: Verify dynamic CDRRMO custom-pinned safe zone overrides default nearest shelter.
console.log('Testing Test Case 3: Dynamic CDRRMO custom-pinned safe zone override...');
{
  // User is located next to WMSU Grandstand (id: 3, ~50m away)
  // No active hazard, but CDRRMO has custom-pinned an emergency safe zone (id: 5)
  const result = determineTargetFacility(6.9136, 122.0601, mockFacilities, []);

  assert.ok(result, 'Expected a facility destination to be returned');
  assert.ok(result.facility, 'Expected a facility object in result');
  assert.strictEqual(result.facility.id, 5, 'Dynamic CDRRMO custom-pinned safe zone must override default nearest shelter');
  assert.ok(result.facility.is_pinned || result.facility.is_custom_pinned, 'Selected facility must be pinned by CDRRMO');
  assert.match(result.reason, /CDRRMO.*PINNED/i, 'Reason must state CDRRMO custom-pinned safe zone override');

  console.log('✅ Test Case 3 Passed: Dynamic CDRRMO custom-pinned safe zone overrides default nearest shelter.');
}

console.log('🎉 ALL CDRRMO HAZARD-SPECIFIC ROUTING UNIT TESTS COMPLETED SUCCESSFULLY!');
