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

// --- Helper: Road Hazard Corridor Line Generator (High-Visibility Road Line instead of Circle) ---
export function createHazardRoadCorridorLine(center, radiusInMeters = 50) {
  const [lng, lat] = center;
  const radius = Math.max(30, radiusInMeters);
  const distanceX = radius / (111320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radius / 110540;

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [lng - distanceX * 0.9, lat - distanceY * 0.45],
        [lng + distanceX * 0.9, lat + distanceY * 0.45],
      ],
    },
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

// Zamboanga City Centroid Coordinates by Barangay
export const BARANGAY_COORDS = {
  'Tetuan': [122.0886, 6.9192],
  'Baliwasan': [122.0571, 6.9150],
  'Tugbungan': [122.0975, 6.9231],
  'San Jose': [122.0673, 6.9118],
  'Santa Maria': [122.0789, 6.9322],
  'Pasonanca': [122.0677, 6.9458],
  'Tumaga': [122.0742, 6.9367],
  'San Roque': [122.0583, 6.9361],
  'Guiwan': [122.0972, 6.9278],
  'Putik': [122.1128, 6.9389],
  'Divisoria': [122.1283, 6.9492],
  'Boalan': [122.1211, 6.9442],
  'Sta. Catalina': [122.0850, 6.9078],
  'Zone I (Poblacion)': [122.0750, 6.9056],
  'Zone II (Poblacion)': [122.0780, 6.9070],
  'Zone III (Poblacion)': [122.0730, 6.9090],
  'Zone IV (Poblacion)': [122.0690, 6.9080],
  'Canelar': [122.0689, 6.9142],
  'Calarian': [122.0306, 6.9242],
  'Ayala': [121.9619, 6.9639],
  'Recodo': [121.9483, 6.9744],
  'Cawit': [121.9286, 6.9856],
  'Labuan': [121.9028, 7.0861],
  'Mercedes': [122.1481, 6.9639],
  'Culianan': [122.1642, 6.9750],
  'Vitali': [122.2858, 7.3736],
  'Curuan': [122.2389, 7.2389],
  'Manicahan': [122.1956, 7.0372],
  'Sangali': [122.2306, 7.0989],
  'Taluksangay': [122.1742, 6.9878],
  'Arena Blanco': [122.1333, 6.9028],
  'Rio Hondo': [122.0833, 6.9000],
  'Mampang': [122.1139, 6.9167],
  'Talon-Talon': [122.1000, 6.8972]
};

/**
 * Returns the nearest Zamboanga City barangay name for given lng and lat.
 */
export function getNearestBarangay(lng, lat) {
  const numLng = Number(lng);
  const numLat = Number(lat);
  if (isNaN(numLng) || isNaN(numLat)) return 'Zamboanga City';

  let closest = 'Zamboanga City';
  let minDist = Infinity;
  for (const [name, coords] of Object.entries(BARANGAY_COORDS)) {
    const dLng = coords[0] - numLng;
    const dLat = coords[1] - numLat;
    const distSq = dLng * dLng + dLat * dLat;
    if (distSq < minDist) {
      minDist = distSq;
      closest = name;
    }
  }
  return closest;
}
