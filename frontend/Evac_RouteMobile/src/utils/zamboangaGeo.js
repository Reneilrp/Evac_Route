export const FALLBACK_MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  process.env.MAPBOX_TOKEN ||
  '';

export const MAPBOX_PUBLIC_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  process.env.MAPBOX_TOKEN ||
  FALLBACK_MAPBOX_TOKEN;

// Zamboanga City Geographical Boundaries
export const ZAMBOANGA_BOUNDS = {
  minLng: 121.85,
  maxLng: 122.35,
  minLat: 6.75,
  maxLat: 7.30,
};

// Strategic Zamboanga City Reference Points
export const ZAMBOANGA_RESCUER_BASE = [122.0750, 6.9210]; // Gov. Camins / City Hall / CDRRMO EOC
export const ZAMBOANGA_VICTIM_DEFAULT = [122.0618, 6.9142]; // Baliwasan Coastal Flood Zone
export const ZAMBOANGA_SHELTER_DEFAULT = [122.0573, 6.9126]; // Baliwasan Gym Evacuation Center
export const ZAMBOANGA_WMSU = [122.0614, 6.9152]; // WMSU Campus (Baliwasan)
export const ZAMBOANGA_TETUAN = [122.0865, 6.9214]; // Tetuan Landmark

/**
 * Validates whether a given [longitude, latitude] coordinate is inside Zamboanga City.
 * Prevents emulators (e.g. Googleplex Mountain View, CA) from breaking local navigation.
 */
export function isValidZamboangaLocation(coords) {
  if (!coords) return false;
  let lng;
  let lat;
  if (Array.isArray(coords) && coords.length >= 2) {
    lng = Number(coords[0]);
    lat = Number(coords[1]);
  } else if (coords.latitude && coords.longitude) {
    lat = Number(coords.latitude);
    lng = Number(coords.longitude);
  } else {
    return false;
  }

  if (isNaN(lng) || isNaN(lat)) return false;

  return (
    lng >= ZAMBOANGA_BOUNDS.minLng &&
    lng <= ZAMBOANGA_BOUNDS.maxLng &&
    lat >= ZAMBOANGA_BOUNDS.minLat &&
    lat <= ZAMBOANGA_BOUNDS.maxLat
  );
}

/**
 * Normalizes and clamps GPS coordinates to strictly stay inside Zamboanga City.
 * If raw GPS is outside Zamboanga (e.g. testing on Android emulator or laptop),
 * returns the designated Zamboanga City base location.
 */
export function clampToZamboanga(rawCoords, fallback = ZAMBOANGA_RESCUER_BASE) {
  if (!rawCoords) return fallback;

  let lng;
  let lat;
  if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
    const a = Number(rawCoords[0]);
    const b = Number(rawCoords[1]);
    if (a > 100) {
      lng = a;
      lat = b;
    } else {
      lng = b;
      lat = a;
    }
  } else if (rawCoords.latitude && rawCoords.longitude) {
    lat = Number(rawCoords.latitude);
    lng = Number(rawCoords.longitude);
  } else {
    return fallback;
  }

  if (isNaN(lng) || isNaN(lat)) return fallback;

  if (
    lng >= ZAMBOANGA_BOUNDS.minLng &&
    lng <= ZAMBOANGA_BOUNDS.maxLng &&
    lat >= ZAMBOANGA_BOUNDS.minLat &&
    lat <= ZAMBOANGA_BOUNDS.maxLat
  ) {
    return [lng, lat];
  }

  // Outside Zamboanga -> anchor inside Zamboanga for testing purpose
  return fallback;
}

/**
 * Creates a GeoJSON Feature representing a 20-meter square geofence perimeter around [lng, lat].
 * @param {[number, number]} center - [lng, lat]
 * @returns {object|null} GeoJSON Feature (Polygon)
 */
export function create20mGeofenceSquare(center) {
  if (!center || center.length < 2) return null;
  const lng = Number(center[0]);
  const lat = Number(center[1]);
  if (isNaN(lng) || isNaN(lat)) return null;

  // In Zamboanga (~6.9 deg N):
  // 20 meters latitude: 20 / 110574 = ~0.0001808 deg
  // 20 meters longitude: 20 / (110574 * cos(6.9 * pi / 180)) = ~0.0001822 deg
  const deltaLat = 20 / 110574;
  const deltaLng = 20 / (110574 * Math.cos((lat * Math.PI) / 180));

  return {
    type: 'Feature',
    properties: {
      radiusMeters: 20,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [lng - deltaLng, lat - deltaLat],
        [lng + deltaLng, lat - deltaLat],
        [lng + deltaLng, lat + deltaLat],
        [lng - deltaLng, lat + deltaLat],
        [lng - deltaLng, lat - deltaLat],
      ]],
    },
  };
}

/**
 * Creates a GeoJSON Feature representing a circular polygon of radiusInMeters around center [lng, lat].
 * @param {[number, number]} center - [lng, lat]
 * @param {number} radiusInMeters - radius in meters
 * @param {number} points - number of perimeter vertices
 * @param {object} properties - optional GeoJSON properties
 * @returns {object|null} GeoJSON Feature (Polygon)
 */
export function createCirclePolygon(center, radiusInMeters, points = 32, properties = {}) {
  if (!center || center.length < 2) return null;
  const lng = Number(center[0]);
  const lat = Number(center[1]);
  if (isNaN(lng) || isNaN(lat)) return null;

  const radius = Math.max(radiusInMeters || 30, 10);
  const coords = [];
  const distanceX = radius / (111320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radius / 110540;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature',
    properties: {
      radiusMeters: radius,
      ...properties,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

/**
 * Creates a GeoJSON Feature representing a road hazard corridor line segment (Line instead of Circle)
 * @param {[number, number]} center - [lng, lat]
 * @param {number} radiusInMeters - radius in meters
 * @param {object} properties - optional GeoJSON properties
 * @returns {object|null} GeoJSON Feature (LineString)
 */
export function createHazardRoadCorridorLine(center, radiusInMeters = 50, properties = {}) {
  if (!center || center.length < 2) return null;
  const lng = Number(center[0]);
  const lat = Number(center[1]);
  if (isNaN(lng) || isNaN(lat)) return null;

  const radius = Math.max(30, radiusInMeters || 50);
  const distanceX = radius / (111320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radius / 110540;

  return {
    type: 'Feature',
    properties: {
      radiusMeters: radius,
      ...properties,
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [lng - distanceX * 0.9, lat - distanceY * 0.45],
        [lng + distanceX * 0.9, lat + distanceY * 0.45],
      ],
    },
  };
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

