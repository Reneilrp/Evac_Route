/* global describe, test, expect */
import {
  createCirclePolygon,
  tilePixelToLngLat,
  getHaversineDistance,
  getZamboangaIsolationMaskGeoJSON,
  getZamboangaBoundaryLineGeoJSON,
  ZAMBOANGA_MAX_BOUNDS,
  ZAMBOANGA_MIN_ZOOM,
} from './mapHelper';

describe('createCirclePolygon', () => {
  test('returns a valid GeoJSON Polygon Feature', () => {
    const center = [122.06, 6.91];
    const radius = 100;
    const polygon = createCirclePolygon(center, radius, 32);

    expect(polygon.type).toBe('Feature');
    expect(polygon.geometry.type).toBe('Polygon');
    expect(polygon.geometry.coordinates).toBeInstanceOf(Array);
    
    const coords = polygon.geometry.coordinates[0];
    // 32 points + 1 closing point = 33 points
    expect(coords).toHaveLength(33);
    // Start and end points must be identical
    expect(coords[0]).toEqual(coords[32]);
  });
});

describe('tilePixelToLngLat', () => {
  test('correctly converts tile and pixel offset to coordinates at zoom level 15', () => {
    const result = tilePixelToLngLat(27493, 14828, 128, 128, 15);
    expect(result.lng).toBeCloseTo(122.05, 2);
    expect(result.lat).toBeCloseTo(16.84, 2);
  });
});

describe('getHaversineDistance', () => {
  test('calculates correct distance between two points', () => {
    const p1 = { lat: 6.91, lng: 122.06 };
    const p2 = { lat: 6.91, lng: 122.07 };
    
    const dist = getHaversineDistance(p1, p2);
    expect(dist).toBeGreaterThan(1000); // approx ~1.1km
    expect(dist).toBeLessThan(1200);
  });

  test('returns 0 distance for the same coordinate', () => {
    const p = { lat: 6.91, lng: 122.06 };
    expect(getHaversineDistance(p, p)).toBe(0);
  });
});

describe('Zamboanga City Map Isolation Constraints & GeoJSON Helpers', () => {
  test('exports valid geographical bounds enclosing Zamboanga City', () => {
    const [[minLng, minLat], [maxLng, maxLat]] = ZAMBOANGA_MAX_BOUNDS;
    expect(minLng).toBeLessThan(121.90);
    expect(maxLng).toBeGreaterThan(122.40);
    expect(minLat).toBeLessThan(6.85);
    expect(maxLat).toBeGreaterThan(7.40);
    expect(ZAMBOANGA_MIN_ZOOM).toBeGreaterThanOrEqual(10);
  });

  test('creates inverted polygon mask covering external world with Zamboanga hole', () => {
    const mask = getZamboangaIsolationMaskGeoJSON();
    expect(mask.type).toBe('FeatureCollection');
    expect(mask.features).toHaveLength(1);
    
    const geom = mask.features[0].geometry;
    expect(geom.type).toBe('Polygon');
    // Outer ring + inner hole ring
    expect(geom.coordinates).toHaveLength(2);
    // Outer world ring
    expect(geom.coordinates[0]).toEqual([
      [-180, -90],
      [180, -90],
      [180, 90],
      [-180, 90],
      [-180, -90],
    ]);
    // Inner ring is closed perimeter
    const innerRing = geom.coordinates[1];
    expect(innerRing.length).toBeGreaterThan(20);
    expect(innerRing[0]).toEqual(innerRing[innerRing.length - 1]);
  });

  test('creates boundary LineString for administrative glowing perimeter', () => {
    const line = getZamboangaBoundaryLineGeoJSON();
    expect(line.type).toBe('FeatureCollection');
    expect(line.features[0].geometry.type).toBe('LineString');
    const coords = line.features[0].geometry.coordinates;
    expect(coords.length).toBeGreaterThan(20);
    expect(coords[0]).toEqual(coords[coords.length - 1]);
  });
});
