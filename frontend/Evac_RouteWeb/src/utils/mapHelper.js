// --- Helper: Generate Circle Polygons for real-world meters ---
export function createCirclePolygon(center, radiusInMeters, points = 64) {
  const [lng, lat] = center;
  const coords = [];
  const distanceX = radiusInMeters / (111320 * Math.cos(lat * Math.PI / 180));
  const distanceY = radiusInMeters / 110540;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
}

// --- Helper: Convert Web Mercator pixel coordinates to Lng/Lat ---
export function tilePixelToLngLat(tx, ty, px, py, zoom) {
  const n = Math.pow(2, zoom);
  const lng = ((tx + px / 256) / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (ty + py / 256) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lng, lat };
}

// --- Helper: Geodesic Haversine Distance (meters) ---
export function getHaversineDistance(c1, c2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLon = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
