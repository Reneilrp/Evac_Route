import { calculateOfflineRoute } from './astarRouter';
import { getDistanceMeters } from '../services/offlineDb';

// Mock the offlineDb service
jest.mock('../services/offlineDb', () => ({
  getDistanceMeters: jest.fn(),
}));

// Mock expo-sqlite since we'll use preloadedData for in-memory testing
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    getAllSync: jest.fn(),
  })),
}));

describe('A* Offline Router Multi-Hazard Context-Aware Pathfinding', () => {
  const userLocation = [122.0729, 6.9126];
  const shelterLocation = [122.0800, 6.9200];

  const mockNodes = {
    'start': { id: 'start', lat: 6.9126, lng: 122.0729 },
    'end': { id: 'end', lat: 6.9200, lng: 122.0800 }
  };

  const mockEdges = {
    'start': [{
      target_node: 'end',
      distance: 1,
      geometry: [[122.0729, 6.9126], [122.0800, 6.9200]]
    }]
  };

  const setupData = (hazardType, severityLevel) => {
    return {
      nodesMap: mockNodes,
      edgesBySource: mockEdges,
      hazards: [{
        latitude: 6.9150,
        longitude: 122.0750,
        radius_meters: 500,
        hazard_type: hazardType,
        severity_level: severityLevel
      }]
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock behavior for distance: return 0 if points match hazard, else return large distance
    // But for simplicity in these unit tests, we'll force the distance to be within the radius
    getDistanceMeters.mockReturnValue(100); 
  });

  test('Pedestrian Blocked by Low Flood', () => {
    const data = setupData('flood', 'low');
    
    // Act
    const result = calculateOfflineRoute(userLocation, shelterLocation, data, 'pedestrian');

    // Assert: status should be 'no_safe_route' because the only edge is blocked
    expect(result.status).toBe('no_safe_route');
    expect(result.path).toEqual([]);
  });

  test('2-Wheel Vehicle Passes Low Flood', () => {
    const data = setupData('flood', 'low');
    
    // Act
    const result = calculateOfflineRoute(userLocation, shelterLocation, data, '2_wheel');

    // Assert: status should be 'success'
    expect(result.status).toBe('success');
    expect(result.path.length).toBeGreaterThan(0);
  });

  test('4-Wheel Vehicle Passes Medium Flood and 2-Wheel is Blocked', () => {
    const data = setupData('flood', 'medium');
    
    // Act & Assert for 4-Wheel (Passes)
    const result4W = calculateOfflineRoute(userLocation, shelterLocation, data, '4_wheel');
    expect(result4W.status).toBe('success');

    // Act & Assert for 2-Wheel (Blocked)
    const result2W = calculateOfflineRoute(userLocation, shelterLocation, data, '2_wheel');
    expect(result2W.status).toBe('no_safe_route');
  });
});
