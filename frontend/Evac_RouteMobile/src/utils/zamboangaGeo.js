import Constants from 'expo-constants';

export const FALLBACK_MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  process.env.MAPBOX_TOKEN ||
  '';

export const MAPBOX_PUBLIC_TOKEN =
  Constants.expoConfig?.extra?.mapboxToken ||
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
