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

// --- Zamboanga City Administrative Boundaries & Map Clamping ---
export const ZAMBOANGA_CENTER = {
  longitude: 122.0729,
  latitude: 6.9126,
  zoom: 12.5,
  pitch: 45,
  bearing: -15,
};

// Tight bounding box enclosing all 98 barangays, coastal buffer, and Santa Cruz islands
// [[minLng, minLat], [maxLng, maxLat]]
export const ZAMBOANGA_MAX_BOUNDS = [
  [121.80, 6.75], // Southwest limit (West Coast / Santa Cruz Islands / Basilan Strait buffer)
  [122.45, 7.50], // Northeast limit (Vitali / Licomo border with Zamboanga Sibugay)
];

export const ZAMBOANGA_MIN_ZOOM = 10.2;
export const ZAMBOANGA_MAX_ZOOM = 19.5;

// Perimeter coordinates tracing the administrative territory of Zamboanga City
export const ZAMBOANGA_PERIMETER_COORDS = [
  [122.0300, 6.8400], // South of Great Santa Cruz Island in Basilan Strait
  [121.9900, 6.9100], // Southwest coastal approach
  [121.9600, 6.9450], // Recodo / Sinunuc offshore
  [121.9300, 6.9600], // Ayala / Cawit offshore
  [121.9100, 7.0200], // Talisayan offshore
  [121.8800, 7.0800], // Labuan offshore
  [121.8600, 7.1400], // Patalon offshore
  [121.8500, 7.2000], // Limpapa offshore
  [121.8700, 7.2500], // Limpapa river basin border with Sibuco
  [121.9200, 7.3000], // Mount Dapiak / northern mountain border
  [122.0000, 7.3400], // Sibuco watershed ridge
  [122.1000, 7.3700], // Central Zamboanga Peninsula cordillera
  [122.2000, 7.4000], // Tungawan / Sirawai border crest
  [122.2800, 7.4300], // Upper Vitali ridge
  [122.3600, 7.4500], // Licomo mountain ridge
  [122.4100, 7.4200], // Licomo coastal border with Tungawan, Zamboanga Sibugay
  [122.4000, 7.3500], // Vitali Island / Taguiti Bay
  [122.3400, 7.2500], // Curuan / Mangusu offshore
  [122.3000, 7.1800], // Buenavista / Quiniput offshore
  [122.2700, 7.1000], // Sangali / Bolong offshore
  [122.2450, 7.0400], // Manicahan / Victoria offshore
  [122.2100, 6.9850], // Taluksangay / Cabaluay offshore
  [122.1850, 6.9450], // Mercedes / Talabaan offshore
  [122.1550, 6.8950], // Mampang / Talon-Talon coast
  [122.1200, 6.8600], // South of Talon-Talon / Arena Blanco
  [122.0800, 6.8400], // South of Rio Hondo / Fort Pilar
  [122.0300, 6.8400], // Closed ring
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
