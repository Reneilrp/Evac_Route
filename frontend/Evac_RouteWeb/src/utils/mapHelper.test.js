/* global describe, test, expect */
import { createCirclePolygon, tilePixelToLngLat, getHaversineDistance } from './mapHelper';

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
