// --- Helper: Generate Circle Polygons for real-world meters ---
export function createCirclePolygon(center, radiusInMeters, points = 64) {
  const [lng, lat] = center;
  const coords = [];
  const distanceX = radiusInMeters / (111320 * Math.cos((lat * Math.PI) / 180));
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
      coordinates: [coords],
    },
  };
}

// --- Helper: Geodesic Haversine Distance (meters) ---
export function getHaversineDistance(c1, c2) {
  const lat1 = Array.isArray(c1) ? c1[1] : c1.lat ?? c1.latitude;
  const lng1 = Array.isArray(c1) ? c1[0] : c1.lng ?? c1.longitude;
  const lat2 = Array.isArray(c2) ? c2[1] : c2.lat ?? c2.latitude;
  const lng2 = Array.isArray(c2) ? c2[0] : c2.lng ?? c2.longitude;

  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- Helper: Compute total length in meters of a LineString coordinate array ---
export function getPolylineLengthMeters(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += getHaversineDistance(coords[i], coords[i + 1]);
  }
  return total;
}

// --- Helper: Project point [lng, lat] onto segment [a -> b] ---
function projectPointOnSegment(pt, a, b) {
  const [px, py] = pt;
  const [ax, ay] = a;
  const [bx, by] = b;
  const cosLat = Math.cos((py * Math.PI) / 180);
  const dx = (bx - ax) * cosLat;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 1e-16) {
    t = (((px - ax) * cosLat) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const projPt = [ax + t * (bx - ax), ay + t * (by - ay)];
  const distMeters = getHaversineDistance(pt, projPt);
  return { point: projPt, t, distMeters };
}

// --- Helper: Slice a LineString between startDistMeters and endDistMeters along its arc length ---
export function sliceLineStringByDistance(coords, startDistMeters, endDistMeters) {
  if (!Array.isArray(coords) || coords.length < 2) return coords || [];
  const totalLen = getPolylineLengthMeters(coords);
  if (totalLen <= 0) return coords;

  const dMin = Math.max(0, Math.min(startDistMeters, endDistMeters));
  const dMax = Math.min(totalLen, Math.max(startDistMeters, endDistMeters));
  if (dMax - dMin < 1) {
    return [coords[0], coords[coords.length - 1]];
  }

  const sliced = [];
  let accum = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const segLen = getHaversineDistance(a, b);
    const nextAccum = accum + segLen;

    if (segLen > 0) {
      // Interpolate start point if it falls within this segment
      if (sliced.length === 0 && nextAccum >= dMin) {
        const tStart = Math.max(0, Math.min(1, (dMin - accum) / segLen));
        sliced.push([a[0] + tStart * (b[0] - a[0]), a[1] + tStart * (b[1] - a[1])]);
      }

      // If we are inside the slice range, add end of segment or interpolate dMax
      if (sliced.length > 0) {
        if (nextAccum >= dMax) {
          const tEnd = Math.max(0, Math.min(1, (dMax - accum) / segLen));
          const endPt = [a[0] + tEnd * (b[0] - a[0]), a[1] + tEnd * (b[1] - a[1])];
          const prev = sliced[sliced.length - 1];
          if (!prev || prev[0] !== endPt[0] || prev[1] !== endPt[1]) {
            sliced.push(endPt);
          }
          break;
        } else {
          sliced.push(b);
        }
      }
    }
    accum = nextAccum;
  }

  if (sliced.length === 1 && coords.length >= 2) {
    sliced.push(coords[coords.length - 1]);
  }

  return startDistMeters <= endDistMeters ? sliced : sliced.reverse();
}

// --- Helper: Snap a [lng, lat] point to the nearest road LineString ---
export function snapPointToRoadLines(point, roadLineStrings = [], maxSnapMeters = 300) {
  if (!point || !Array.isArray(roadLineStrings) || roadLineStrings.length === 0) return null;

  let bestMatch = null;
  let minDist = maxSnapMeters;

  for (let lineIdx = 0; lineIdx < roadLineStrings.length; lineIdx++) {
    const line = roadLineStrings[lineIdx];
    if (!Array.isArray(line) || line.length < 2) continue;

    let accumDist = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const segLen = getHaversineDistance(a, b);
      const proj = projectPointOnSegment(point, a, b);

      if (proj.distMeters < minDist) {
        minDist = proj.distMeters;
        bestMatch = {
          snappedPoint: proj.point,
          lineCoords: line,
          lineIndex: lineIdx,
          distanceAlongLine: accumDist + proj.t * segLen,
          totalLineLength: getPolylineLengthMeters(line),
          distanceToRoad: proj.distMeters,
          segmentBearingDx: b[0] - a[0],
          segmentBearingDy: b[1] - a[1],
        };
      }
      accumDist += segLen;
    }
  }

  return bestMatch;
}

// --- Helper: Trace road corridor between two points using available road LineStrings ---
export function traceRoadSegmentBetweenPoints(startPt, endPt, roadLineStrings = []) {
  if (!startPt || !endPt) return null;

  const snapStart = snapPointToRoadLines(startPt, roadLineStrings, 350);
  const snapEnd = snapPointToRoadLines(endPt, roadLineStrings, 350);

  // Case 1: Both points snap onto the same road polyline -> slice exact road curvature
  if (snapStart && snapEnd && snapStart.lineIndex === snapEnd.lineIndex) {
    const sliced = sliceLineStringByDistance(
      snapStart.lineCoords,
      snapStart.distanceAlongLine,
      snapEnd.distanceAlongLine
    );
    if (sliced && sliced.length >= 2) {
      return sliced;
    }
  }

  // Case 2: Start point snaps onto a road -> project endPt onto that same road polyline so it stays on the road
  if (snapStart) {
    const projOnStartRoad = snapPointToRoadLines(endPt, [snapStart.lineCoords], 1500);
    if (projOnStartRoad) {
      const sliced = sliceLineStringByDistance(
        snapStart.lineCoords,
        snapStart.distanceAlongLine,
        projOnStartRoad.distanceAlongLine
      );
      if (sliced && sliced.length >= 2) {
        return sliced;
      }
    }
  }

  return null;
}

// --- Helper: Fetch exact road-snapped corridor from Mapbox Directions API ---
export async function fetchMapboxRoadCorridor(startPt, endPt, mapboxToken, roadLineStrings = []) {
  const localTrace = traceRoadSegmentBetweenPoints(startPt, endPt, roadLineStrings);

  if (mapboxToken && startPt && endPt) {
    const [sLng, sLat] = startPt;
    const [eLng, eLat] = endPt;
    const directDist = getHaversineDistance(startPt, endPt);

    if (directDist >= 5) {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${sLng},${sLat};${eLng},${eLat}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length >= 2) {
          const coords = data.routes[0].geometry.coordinates;
          const dist = Math.round(data.routes[0].distance || getPolylineLengthMeters(coords));
          return {
            coordinates: coords,
            distanceMeters: Math.max(10, dist),
          };
        }
      } catch {
        // Fall back to local road network trace
      }
    }
  }

  if (localTrace && localTrace.length >= 2) {
    return {
      coordinates: localTrace,
      distanceMeters: Math.max(10, Math.round(getPolylineLengthMeters(localTrace))),
    };
  }

  return null;
}

// --- Helper: Road Hazard Corridor Line Generator (Snapped to Road Network or Saved Corridor Coordinates) ---
export function createHazardRoadCorridorLine(center, radiusInMeters = 50, roadLineStrings = [], savedCorridorCoords = null) {
  // 1. If explicit road-snapped coordinates were saved with the hazard, use them directly
  let parsedCoords = savedCorridorCoords;
  if (typeof parsedCoords === 'string') {
    try {
      parsedCoords = JSON.parse(parsedCoords);
    } catch {
      parsedCoords = null;
    }
  }
  if (Array.isArray(parsedCoords) && parsedCoords.length >= 2) {
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: parsedCoords,
      },
    };
  }

  const [lng, lat] = center;
  const radius = Math.max(25, radiusInMeters || 50);

  // 2. If road network geometries are available, snap center to nearest road and slice along that road
  if (Array.isArray(roadLineStrings) && roadLineStrings.length > 0) {
    const snapped = snapPointToRoadLines([lng, lat], roadLineStrings, 350);
    if (snapped) {
      const sliced = sliceLineStringByDistance(
        snapped.lineCoords,
        Math.max(0, snapped.distanceAlongLine - radius),
        Math.min(snapped.totalLineLength, snapped.distanceAlongLine + radius)
      );
      if (sliced && sliced.length >= 2) {
        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: sliced,
          },
        };
      }
    }
  }

  // 3. Fallback when no road network is passed (e.g. isolated unit test)
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

// Zamboanga City Centroid Coordinates by Barangay
export const BARANGAY_COORDS = {
  'Arena Blanco': [122.1536, 6.9174],
  'Ayala': [121.9483, 6.9712],
  'Baliwasan': [122.0577, 6.9155],
  'Baluno': [122.0099, 7.0008],
  'Barangay Zone I': [122.0725, 6.906],
  'Barangay Zone II': [122.0743, 6.9081],
  'Barangay Zone III': [122.0762, 6.9043],
  'Barangay Zone IV': [122.0785, 6.9099],
  'Boalan': [122.1199, 6.9492],
  'Bolong': [122.2303, 7.1137],
  'Buenavista': [122.2566, 7.2298],
  'Bunguiao': [122.1575, 7.1245],
  'Busay': [122.2469, 6.9893],
  'Cabaluay': [122.1706, 6.9937],
  'Cabatangan': [122.0569, 6.9465],
  'Cacao': [122.1485, 7.0268],
  'Calabasa': [122.2266, 7.2618],
  'Calarian': [122.0334, 6.9253],
  'Camino Nuevo': [122.0767, 6.9152],
  'Campo Islam': [122.0463, 6.9145],
  'Canelar': [122.0669, 6.9172],
  'Capisan': [122.031, 6.9739],
  'Cawit': [121.9725, 6.9631],
  'Culianan': [122.1483, 6.981],
  'Curuan': [122.1994, 7.214],
  'Dita': [122.2516, 7.1678],
  'Divisoria': [122.1079, 6.9407],
  'Dulian (Upper Bunguiao)': [122.172, 7.1542],
  'Dulian (Upper Pasonanca)': [122.043, 6.982],
  'Guisao': [122.1527, 6.9998],
  'Guiwan': [122.093, 6.9278],
  'Kasanyangan': [122.0948, 6.9053],
  'La Paz': [121.996, 7.0482],
  'Labuan': [121.9167, 7.0998],
  'Lamisahan': [122.1667, 7.0679],
  'Landang Gua': [122.2358, 6.9518],
  'Landang Laum': [122.2304, 6.9671],
  'Lanzones': [122.1329, 7.0001],
  'Lapakan': [122.1582, 7.0451],
  'Latuan': [122.2018, 7.2398],
  'Licomo': [122.313, 7.4524],
  'Limaong': [122.3377, 7.3616],
  'Limpapa': [121.9227, 7.1283],
  'Lubigan': [122.2249, 7.1475],
  'Lumayang': [122.0946, 6.9931],
  'Lumbangan': [122.1002, 6.9701],
  'Lunzuran': [122.0941, 6.9586],
  'Maasin': [121.9919, 6.9536],
  'Malagutay': [122.0226, 6.9426],
  'Mampang': [122.1376, 6.915],
  'Manalipa': [122.2834, 6.8833],
  'Mangusu': [122.3006, 7.3458],
  'Manicahan': [122.1897, 7.0235],
  'Mariki': [122.0985, 6.8993],
  'Mercedes': [122.1529, 6.9489],
  'Muti': [122.2655, 7.275],
  'Pamucutan': [121.9652, 7.0231],
  'Pangapuyan': [122.1817, 6.9163],
  'Panubigan': [122.2501, 7.128],
  'Pasilmanta': [122.273, 6.9833],
  'Pasobolong': [122.1321, 6.9735],
  'Pasonanca': [122.0752, 6.9682],
  'Patalon': [121.9173, 7.0596],
  'Putik': [122.0985, 6.9382],
  'Quiniput': [122.2159, 7.1823],
  'Recodo': [121.9613, 6.9564],
  'Rio Hondo': [122.087, 6.9],
  'Salaan': [122.1076, 7.0194],
  'San Jose Cawa-cawa': [122.066, 6.9123],
  'San Jose Gusu': [122.0531, 6.9214],
  'San Roque': [122.0421, 6.9412],
  'Sangali': [122.2031, 7.0753],
  'Santa Barbara': [122.0683, 6.877],
  'Santa Catalina': [122.0867, 6.9062],
  'Santa Maria': [122.0699, 6.9315],
  'Santo Niño': [122.0699, 6.9086],
  'Sibulao': [122.2204, 7.3371],
  'Sinubung': [121.9389, 7.031],
  'Sinunoc': [122.01, 6.9496],
  'Sta. Catalina': [122.0867, 6.9062],
  'Sta. Maria': [122.0699, 6.9315],
  'Tagasilay': [122.2482, 7.3028],
  'Taguiti': [122.297, 7.3077],
  'Talabaan': [122.1731, 6.9578],
  'Talisayan': [121.939, 6.9985],
  'Talon-talon': [122.1142, 6.9052],
  'Taluksangay': [122.1797, 6.9551],
  'Tetuan': [122.0877, 6.9201],
  'Tictapul': [122.3017, 7.4188],
  'Tigbalabag': [122.2689, 7.3288],
  'Tigtabon': [122.1488, 6.8843],
  'Tolosa': [122.1263, 7.0618],
  'Tugbungan': [122.1066, 6.9213],
  'Tulungatung': [121.965, 6.9755],
  'Tumaga': [122.0816, 6.9399],
  'Tumalutab': [122.3521, 6.9831],
  'Tumitus': [122.3701, 7.3844],
  'Victoria': [122.1985, 7.0457],
  'Vitali': [122.2702, 7.3808],
  'Zambowood': [122.1311, 6.9435],
  'Zone I (Poblacion)': [122.0725, 6.906],
  'Zone II (Poblacion)': [122.0743, 6.9081],
  'Zone III (Poblacion)': [122.0762, 6.9043],
  'Zone IV (Poblacion)': [122.0785, 6.9099],
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

// --- Zamboanga City Administrative Boundaries & Map Clamping ---
export const ZAMBOANGA_CENTER = {
  longitude: 122.0729,
  latitude: 6.9126,
  zoom: 12.5,
  pitch: 45,
  bearing: -15,
};

// Tight bounding box enclosing all 98 barangays, coastal buffer, and Santa Cruz islands
// Tight bounding box enclosing all 98 barangays, coastal buffer, Sacol, Manalipa, and Santa Cruz islands
// [[minLng, minLat], [maxLng, maxLat]]
export const ZAMBOANGA_MAX_BOUNDS = [
  [121.75, 6.70], // Southwest limit (West Coast / Santa Cruz Islands / Basilan Strait buffer)
  [122.45, 7.52], // Northeast limit (Vitali / Licomo border with Zamboanga Sibugay)
];

export const ZAMBOANGA_MIN_ZOOM = 10.0;
export const ZAMBOANGA_MAX_ZOOM = 19.5;

// Perimeter coordinates tracing the administrative territory of Zamboanga City
// Encompasses Licomo (northeast tip), Sacol Island, Tumalutap, and Manalipa Island (east)
export const ZAMBOANGA_PERIMETER_COORDS = [
  [122.0500, 6.8000], // South of Great Santa Cruz Island in Basilan Strait
  [122.0100, 6.8200], // Basilan Strait western channel
  [121.9800, 6.8900], // Southwest coastal approach
  [121.9600, 6.9450], // Recodo / Sinunuc offshore
  [121.9300, 6.9600], // Ayala / Cawit offshore
  [121.9100, 7.0200], // Talisayan offshore
  [121.8800, 7.0800], // Labuan offshore
  [121.8600, 7.1400], // Patalon offshore
  [121.8400, 7.2000], // Limpapa offshore
  [121.8600, 7.2500], // Limpapa river basin border with Sibuco
  [121.9200, 7.3000], // Mount Dapiak / northern mountain border
  [122.0000, 7.3400], // Sibuco watershed ridge
  [122.1000, 7.3700], // Central Zamboanga Peninsula cordillera
  [122.2000, 7.4000], // Tungawan / Sirawai border crest
  [122.2800, 7.4300], // Upper Vitali ridge
  [122.3400, 7.4600], // Licomo mountain ridge
  [122.3800, 7.4800], // Licomo northern apex / Tungawan Sibugay border
  [122.4300, 7.4500], // Licomo coastal border with Tungawan, Zamboanga Sibugay
  [122.4200, 7.3500], // Vitali Island / Taguiti Bay offshore
  [122.3900, 7.2800], // Tumitus / Mangusu offshore
  [122.3400, 7.2000], // Buenavista / Quiniput offshore
  [122.3200, 7.1000], // Sangali / Bolong offshore
  [122.3800, 7.0100], // East of Tumalutab Island & Sacol Island (Sibuguey Bay)
  [122.3700, 6.9500], // East of Sacol Island / Pasilmanta offshore
  [122.3200, 6.8700], // East of Manalipa Island
  [122.2700, 6.8400], // South of Manalipa Island
  [122.1900, 6.8200], // South of Tigtabon Island
  [122.1200, 6.8000], // South of Talon-Talon / Arena Blanco
  [122.0500, 6.8000], // South of Great Santa Cruz Island (closed ring)
];

/**
 * Returns an inverted polygon GeoJSON FeatureCollection.
 * The outer ring covers the world; the inner ring is Zamboanga City's perimeter.
 * When rendered with a fill layer, everything OUTSIDE Zamboanga City is dimmed.
 */
export function getZamboangaIsolationMaskGeoJSON() {
  const worldOuterRing = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
  ];

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Zamboanga Isolation Mask' },
        geometry: {
          type: 'Polygon',
          coordinates: [worldOuterRing, ZAMBOANGA_PERIMETER_COORDS],
        },
      },
    ],
  };
}

/**
 * Returns a GeoJSON FeatureCollection with a LineString tracing Zamboanga City's perimeter.
 */
export function getZamboangaBoundaryLineGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Zamboanga City Administrative Boundary' },
        geometry: {
          type: 'LineString',
          coordinates: ZAMBOANGA_PERIMETER_COORDS,
        },
      },
    ],
  };
}

export const ZAMBOANGA_BARANGAYS = [
  "Arena Blanco", "Ayala", "Baliwasan", "Boalan", "Buenavista", "Cabaluay", "Calarian",
  "Canelar", "Cawit", "Culianan", "Curuan", "Divisoria", "Guiwan",
  "Labuan", "Landang Gua", "Licomo", "Limaong", "Manalipa", "Manicahan", "Mampang", "Mercedes", "Pasonanca",
  "Pasilmanta", "Putik", "Recodo", "Rio Hondo", "San Jose", "San Roque", "Santa Catalina",
  "Santa Maria", "Talon-Talon", "Taluksangay", "Tetuan", "Tictapul", "Tugbungan",
  "Tumaga", "Tumalutab", "Vitali", "Zone I (Poblacion)", "Zone II (Poblacion)",
  "Zone III (Poblacion)", "Zone IV (Poblacion)"
];

export const ZAMBOANGA_BARANGAY_CENTROIDS = {
  "Tetuan": { lat: 6.9194, lng: 122.0840 },
  "Baliwasan": { lat: 6.9159, lng: 122.0599 },
  "Canelar": { lat: 6.9165, lng: 122.0696 },
  "San Jose Cawa-Cawa": { lat: 6.9140, lng: 122.0650 },
  "San Jose Gusu": { lat: 6.9197, lng: 122.0532 },
  "Pasonanca": { lat: 6.9471, lng: 122.0728 },
  "Tumaga": { lat: 6.9380, lng: 122.0720 },
  "Guiwan": { lat: 6.9289, lng: 122.0922 },
  "Putik": { lat: 6.9350, lng: 122.1050 },
  "Tugbungan": { lat: 6.9150, lng: 122.0800 },
  "Santa Maria": { lat: 6.9300, lng: 122.0700 },
  "Calarian": { lat: 6.9245, lng: 122.0246 },
  "Mampang": { lat: 6.9157, lng: 122.1339 },
  "Talon-Talon": { lat: 6.8950, lng: 122.1000 },
  "Ayala": { lat: 6.9592, lng: 121.9498 },
  "Recodo": { lat: 6.9700, lng: 121.9700 },
  "Cawit": { lat: 6.9556, lng: 121.9739 },
  "Labuan": { lat: 7.0918, lng: 121.9027 },
  "Vitali": { lat: 7.3777, lng: 122.2893 },
  "Licomo": { lat: 7.4484, lng: 122.3358 },
  "Manalipa": { lat: 6.8917, lng: 122.2744 },
  "Tumalutab": { lat: 6.9827, lng: 122.3501 },
  "Landang Gua": { lat: 6.9568, lng: 122.2555 },
  "Pasilmanta": { lat: 6.9921, lng: 122.2741 },
  "Buenavista": { lat: 7.2400, lng: 122.2597 },
  "Tictapul": { lat: 7.4177, lng: 122.3256 },
  "Limaong": { lat: 7.3909, lng: 122.3350 },
  "Curuan": { lat: 7.2100, lng: 122.2313 },
  "Manicahan": { lat: 7.0200, lng: 122.1500 },
  "Cabaluay": { lat: 6.9800, lng: 122.1700 },
  "Mercedes": { lat: 6.9500, lng: 122.1400 },
  "Boalan": { lat: 6.9450, lng: 122.1150 },
  "Culianan": { lat: 6.9700, lng: 122.1400 },
  "Zone I (Poblacion)": { lat: 6.9052, lng: 122.0738 },
  "Zone II (Poblacion)": { lat: 6.9060, lng: 122.0750 },
  "Zone III (Poblacion)": { lat: 6.9070, lng: 122.0760 },
  "Zone IV (Poblacion)": { lat: 6.9080, lng: 122.0770 },
  "Rio Hondo": { lat: 6.9000, lng: 122.0650 },
  "Campo Islam": { lat: 6.9145, lng: 122.0462 },
  "Arena Blanco": { lat: 6.8850, lng: 122.0900 },
  "Santa Catalina": { lat: 6.9100, lng: 122.0850 },
  "Santa Barbara": { lat: 6.9080, lng: 122.0800 },
  "Camino Nuevo": { lat: 6.9123, lng: 122.0762 },
  "San Roque": { lat: 6.9400, lng: 122.0600 },
  "Cabatangan": { lat: 6.9440, lng: 122.0544 },
};

export function resolveBarangayFromCoords(lat, lng, shelters = []) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return null;

  let closestBarangay = null;
  let minDistance = Infinity;

  // 1. Check official shelters (dense ground-truth in Zamboanga)
  if (Array.isArray(shelters)) {
    for (const shelter of shelters) {
      const sLat = parseFloat(shelter.latitude);
      const sLng = parseFloat(shelter.longitude);
      const bgy = shelter.barangay || shelter.location;
      if (!isNaN(sLat) && !isNaN(sLng) && bgy) {
        const dist = getHaversineDistance({ lat: latNum, lng: lngNum }, { lat: sLat, lng: sLng });
        if (dist < minDistance) {
          minDistance = dist;
          closestBarangay = bgy;
        }
      }
    }
  }

  // 2. Also compare against known Barangay centroids
  for (const [bgy, c] of Object.entries(ZAMBOANGA_BARANGAY_CENTROIDS)) {
    const dist = getHaversineDistance({ lat: latNum, lng: lngNum }, { lat: c.lat, lng: c.lng });
    if (dist < minDistance) {
      minDistance = dist;
      closestBarangay = bgy;
    }
  }

  return closestBarangay || 'Tetuan';
}
