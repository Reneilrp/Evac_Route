import * as SQLite from 'expo-sqlite';
import { getDistanceMeters } from '../services/offlineDb';

let db = null;

function getDb() {
  if (!db) {
    try {
      db = SQLite.openDatabaseSync('evac_route.db');
    } catch (e) {
      console.error('Failed to open SQLite database for router:', e);
    }
  }
  return db;
}

/**
 * Fetches real-time Polyline Road-Snapped Route from Mapbox Directions API.
 * Ensures turn-by-turn road curves, highways, and street geometry fit precisely on Mapbox vector maps.
 */
function sanitizePathFromHazards(pathCoords, activeHazards) {
  if (!activeHazards || activeHazards.length === 0 || !pathCoords || pathCoords.length < 2) {
    return pathCoords;
  }

  const cleanCoords = [];
  for (let i = 0; i < pathCoords.length; i++) {
    const pt = pathCoords[i];
    let insideHazard = null;

    for (const h of activeHazards) {
      const hLat = parseFloat(h.latitude);
      const hLng = parseFloat(h.longitude);
      const rad = parseFloat(h.radius_meters || 150);
      const dist = getDistanceMeters(pt[1], pt[0], hLat, hLng);
      if (dist <= rad + 10) {
        insideHazard = { lat: hLat, lng: hLng, rad };
        break;
      }
    }

    if (!insideHazard) {
      cleanCoords.push(pt);
    } else {
      // Calculate point pushed OUTSIDE the circle radius (at radius + 50 meters clearance)
      const dLat = pt[1] - insideHazard.lat;
      const dLng = pt[0] - insideHazard.lng;
      let angle = Math.atan2(dLat, dLng);
      if (isNaN(angle)) angle = 0;

      const safeRad = insideHazard.rad + 50; // 50m safe buffer outside circle
      const deltaLat = (safeRad / 111320) * Math.sin(angle);
      const cosLat = Math.cos((insideHazard.lat * Math.PI) / 180);
      const deltaLng = (safeRad / (111320 * (cosLat > 0 ? cosLat : 1))) * Math.cos(angle);

      const pushedPt = [insideHazard.lng + deltaLng, insideHazard.lat + deltaLat];
      cleanCoords.push(pushedPt);
    }
  }

  return cleanCoords;
}

export async function fetchMapboxDirectionsRoute(userLocation, shelterLocation, mapboxToken, mode = 'pedestrian', hazards = []) {
  if (!mapboxToken || !userLocation || !shelterLocation) return null;
  
  const activeHazards = (hazards || []).filter(h => h.longitude && h.latitude && (h.is_active === true || h.is_active === 1 || h.is_active === '1'));
  
  let excludeParam = '';
  if (activeHazards.length > 0) {
    const excludePoints = [];
    for (const h of activeHazards.slice(0, 3)) {
      const cLng = parseFloat(h.longitude);
      const cLat = parseFloat(h.latitude);
      const radMeters = parseFloat(h.radius_meters || 150);
      
      const deltaLat = radMeters / 111320;
      const cosLat = Math.cos((cLat * Math.PI) / 180);
      const deltaLng = radMeters / (111320 * (cosLat > 0 ? cosLat : 1));

      // Center point + North, South, East, West perimeter points to block entire circular danger radius
      excludePoints.push(`point(${cLng} ${cLat})`);
      excludePoints.push(`point(${cLng} ${(cLat + deltaLat).toFixed(6)})`);
      excludePoints.push(`point(${cLng} ${(cLat - deltaLat).toFixed(6)})`);
      excludePoints.push(`point(${(cLng + deltaLng).toFixed(6)} ${cLat})`);
      excludePoints.push(`point(${(cLng - deltaLng).toFixed(6)} ${cLat})`);
    }

    if (excludePoints.length > 0) {
      excludeParam = `&exclude=${encodeURIComponent(excludePoints.slice(0, 10).join(','))}`;
    }
  }

  // Mapbox Directions API only respects exclude parameter for driving & cycling profiles
  let profile = mode === 'pedestrian' ? 'walking' : mode === '4_wheel' ? 'driving' : 'cycling';
  if (excludeParam && profile === 'walking') {
    profile = 'driving';
  }

  // Helper to build Mapbox Directions API URL
  const buildUrl = (waypoints, useProfile, excludeStr) => {
    const wpStr = waypoints.map(w => `${w[0]},${w[1]}`).join(';');
    return `https://api.mapbox.com/directions/v5/mapbox/${useProfile}/${wpStr}?geometries=geojson&overview=full&steps=true${excludeStr}&access_token=${mapboxToken}`;
  };

  try {
    let url = buildUrl([userLocation, shelterLocation], profile, excludeParam);
    let res = await fetch(url);
    let data = await res.json();

    // Check if initial route cuts inside any active hazard circle radius
    if (data.code === 'Ok' && data.routes && data.routes.length > 0 && activeHazards.length > 0) {
      const coords = data.routes[0].geometry.coordinates;
      let intersectedHazard = null;

      for (const pt of coords) {
        for (const h of activeHazards) {
          const hLat = parseFloat(h.latitude);
          const hLng = parseFloat(h.longitude);
          const rad = parseFloat(h.radius_meters || 150);
          const dist = getDistanceMeters(pt[1], pt[0], hLat, hLng);
          if (dist <= rad + 15) { // 15m buffer zone
            intersectedHazard = { lat: hLat, lng: hLng, rad };
            break;
          }
        }
        if (intersectedHazard) break;
      }

      // If initial route cuts inside hazard circle, calculate a tangent detour waypoint outside circle
      if (intersectedHazard) {
        const midLat = (userLocation[1] + shelterLocation[1]) / 2;
        const midLng = (userLocation[0] + shelterLocation[0]) / 2;
        let dx = midLng - intersectedHazard.lng;
        let dy = midLat - intersectedHazard.lat;
        let len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.0001) { dx = 1; dy = 1; len = Math.sqrt(2); }

        const safeDist = intersectedHazard.rad + 120; // 120m clearance outside circle
        const deltaLat = (safeDist / 111320) * (dy / len);
        const cosLat = Math.cos((intersectedHazard.lat * Math.PI) / 180);
        const deltaLng = (safeDist / (111320 * (cosLat > 0 ? cosLat : 1))) * (dx / len);
        const detourWaypoint = [intersectedHazard.lng + deltaLng, intersectedHazard.lat + deltaLat];

        // Re-fetch Mapbox Directions API with detour waypoint outside circle
        const detourUrl = buildUrl([userLocation, detourWaypoint, shelterLocation], 'driving', '');
        const detourRes = await fetch(detourUrl);
        const detourData = await detourRes.json();
        if (detourData.code === 'Ok' && detourData.routes && detourData.routes.length > 0) {
          data = detourData;
        }
      }
    }

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const routeData = data.routes[0];
      const rawPath = routeData.geometry.coordinates;
      const sanitizedPath = sanitizePathFromHazards(rawPath, activeHazards);

      const allSteps = [];
      if (routeData.legs) {
        for (const leg of routeData.legs) {
          if (leg.steps) {
            allSteps.push(...leg.steps);
          }
        }
      }
      return {
        status: 'success',
        path: sanitizedPath,
        distanceMeters: routeData.distance,
        durationSeconds: routeData.duration,
        steps: allSteps.map(s => {
          let rawInst = s.maneuver?.instruction || 'Proceed Forward';
          let cleanInst = rawInst
            .replace(/head\s+(north|south|east|west|northwest|northeast|southwest|southeast)/gi, 'Proceed Forward')
            .replace(/\b(north|south|east|west|northwest|northeast|southwest|southeast)\b/gi, 'Forward')
            .replace(/make a u-turn/gi, 'Turn Around (Backward)')
            .replace(/u-turn/gi, 'Turn Around (Backward)');

          return {
            instruction: cleanInst,
            type: s.maneuver?.type || 'straight',
            modifier: s.maneuver?.modifier || '',
            distanceMeters: Math.round(s.distance || 0),
            name: s.name || '',
            location: s.maneuver?.location || null,
          };
        }),
      };
    }
  } catch (err) {
    console.warn('Mapbox Directions API fetch failed, falling back to A* graph:', err);
  }
  return null;
}

/**
 * Finds the nearest node to a given lat/lng coordinate.
 * Operates in memory if nodesList is provided, otherwise falls back to SQLite DB.
 */
export function findNearestNode(lat, lng, nodesList = null) {
  if (nodesList && nodesList.length > 0) {
    let nearestNode = null;
    let minDistanceSq = Infinity;
    for (const node of nodesList) {
      const dLat = node.lat - lat;
      const dLng = node.lng - lng;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        nearestNode = node;
      }
    }
    return nearestNode;
  }

  const database = getDb();
  if (!database) return null;

  try {
    // Quick squared-distance approximation in SQL to find nearest node
    const result = database.getAllSync(
      `SELECT id, lat, lng, 
              ((lat - ?)*(lat - ?) + (lng - ?)*(lng - ?)) as dist_sq 
       FROM nodes 
       ORDER BY dist_sq ASC 
       LIMIT 1`,
      [lat, lat, lng, lng]
    );

    return result.length > 0 ? result[0] : null;
  } catch (e) {
    console.error('Error finding nearest node:', e);
    return null;
  }
}

/**
 * Calculates a cost multiplier for a road segment (an array of coordinate pairs [lng, lat]) 
 * based on active hazard zones and the user's transportation mode.
 * Uses 2D bounding box pre-filtering to avoid heavy trigonometric calculations.
 */
function getHazardCostMultiplier(geometryCoords, hazardsWithBounds, transportationMode) {
  if (!hazardsWithBounds || hazardsWithBounds.length === 0) return 1;

  let maxMultiplier = 1;

  // Handle single-point geometry fallback
  if (geometryCoords.length < 2) {
    const coord = geometryCoords[0];
    if (!coord) return 1;
    for (const h of hazardsWithBounds) {
      if (coord[1] >= h.minLat && coord[1] <= h.maxLat && coord[0] >= h.minLng && coord[0] <= h.maxLng) {
        if (getDistanceMeters(coord[1], coord[0], h.lat, h.lng) <= h.radius) {
          return 99999; // Fallback instead of Infinity
        }
      }
    }
    return 1;
  }

  for (let i = 0; i < geometryCoords.length - 1; i++) {
    const start = geometryCoords[i];
    const end = geometryCoords[i + 1];
    
    const segmentDist = getDistanceMeters(start[1], start[0], end[1], end[0]);
    const numSteps = Math.max(2, Math.ceil(segmentDist / 20)); // check every 20 meters

    for (let step = 0; step <= numSteps; step++) {
      const fraction = step / numSteps;
      const edgeLng = start[0] + (end[0] - start[0]) * fraction;
      const edgeLat = start[1] + (end[1] - start[1]) * fraction;

      for (const h of hazardsWithBounds) {
        if (
          edgeLat >= h.minLat &&
          edgeLat <= h.maxLat &&
          edgeLng >= h.minLng &&
          edgeLng <= h.maxLng
        ) {
          const dist = getDistanceMeters(edgeLat, edgeLng, h.lat, h.lng);
          if (dist <= h.radius) {
            if (h.hazard_type === 'earthquake' || h.hazard_type === 'maintenance' || h.hazard_type === 'siege' || h.hazard_type === 'chemical_spill' || h.severity_level === 'high') {
              return 99999;
            }
            if (h.hazard_type === 'flood') {
              if (h.severity_level === 'medium') {
                if (transportationMode === 'pedestrian' || transportationMode === '2_wheel') return 99999;
                maxMultiplier = Math.max(maxMultiplier, 2.5);
              } else if (h.severity_level === 'low') {
                if (transportationMode === 'pedestrian') return 99999;
                maxMultiplier = Math.max(maxMultiplier, 1.5);
              }
            }
          }
        }
      }
    }
  }
  return maxMultiplier;
}

/**
 * Selects the optimal target facility based on active hazards and threat types (REV-02).
 * e.g., Hostile threats (siege, war, active shooter) -> Police Stations / Military Outposts.
 * Chemical/Gas spills -> Hospitals / Medical Facilities.
 * Building Fire -> Fire Stations / Safe Zones.
 */
export function determineTargetFacility(userLat, userLng, facilities, activeHazards, requestedCategory = 'all') {
  if (!facilities || facilities.length === 0) return null;

  // Direct category preference (REV-03: Resident choice of Safe Zone vs Assembly Point vs Shelter)
  if (requestedCategory && requestedCategory !== 'all') {
    let filtered = [];
    if (requestedCategory === 'safe_zone') {
      filtered = facilities.filter(f => f.facility_type === 'safe_zone');
    } else if (requestedCategory === 'assembly_point') {
      filtered = facilities.filter(f => f.facility_type === 'assembly_point');
    } else if (requestedCategory === 'shelter') {
      filtered = facilities.filter(f => f.facility_type === 'evacuation_center' || !f.facility_type);
    }
    if (filtered.length > 0) {
      return findClosestFacility(userLat, userLng, filtered, `Targeting requested ${requestedCategory.replace('_', ' ')}.`);
    }
  }

  // Check for hostile man-made threats (siege, war, active shooter, etc.)
  const hostileThreat = (activeHazards || []).find(h => 
    ['siege', 'war', 'active_shooter', 'civil_unrest'].includes(h.hazard_type) ||
    (h.disaster_category === 'man_made' && h.severity_level === 'high')
  );

  if (hostileThreat) {
    const policeOrMilitary = facilities.filter(f => 
      ['police_station', 'military_base'].includes(f.facility_type) || f.is_secured_facility === 1 || f.is_secured_facility === true
    );
    if (policeOrMilitary.length > 0) {
      return findClosestFacility(userLat, userLng, policeOrMilitary, '👮 HOSTILE THREAT ACTIVE: Rerouting to nearest Police Station / Military Base for armed protection.');
    }
  }

  // Check for chemical or toxic gas spills
  const chemicalThreat = (activeHazards || []).find(h => 
    ['chemical_spill', 'gas_leak'].includes(h.hazard_type)
  );

  if (chemicalThreat) {
    const hospitals = facilities.filter(f => f.facility_type === 'hospital');
    if (hospitals.length > 0) {
      return findClosestFacility(userLat, userLng, hospitals, '🧪 TOXIC HAZARD DETECTED: Rerouting to Medical Decontamination Hospital.');
    }
  }

  // Check for building fires
  const fireThreat = (activeHazards || []).find(h => 
    ['building_fire', 'explosion'].includes(h.hazard_type)
  );

  if (fireThreat) {
    const fireDepots = facilities.filter(f => ['fire_station', 'safe_zone'].includes(f.facility_type));
    if (fireDepots.length > 0) {
      return findClosestFacility(userLat, userLng, fireDepots, '🔥 FIRE HAZARD DETECTED: Rerouting to Fire Station / Assembly Safe Zone.');
    }
  }

  // Fallback to closest open evacuation center / shelter
  const openFacilities = facilities.filter(f => f.status === 'open' || !f.status);
  const pool = openFacilities.length > 0 ? openFacilities : facilities;
  return findClosestFacility(userLat, userLng, pool, null);
}

function findClosestFacility(userLat, userLng, pool, customReason) {
  let closest = pool[0];
  let minDistance = Infinity;

  for (const f of pool) {
    const fLat = parseFloat(f.latitude ?? f.lat);
    const fLng = parseFloat(f.longitude ?? f.lng);
    const dist = getDistanceMeters(userLat, userLng, fLat, fLng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = f;
    }
  }

  return {
    facility: closest,
    reason: customReason,
    distanceMeters: minDistance
  };
}

/**
 * Calculates a hazard-avoiding route from userLocation [lng, lat] to shelterLocation [lng, lat]
 * using the local SQLite road network graph. If preloadedData is provided, A* runs
 * entirely in memory with O(1) adjacency lookups.
 * 
 * Runs the A* (A-Star) pathfinding algorithm.
 */
export function calculateOfflineRoute(userLocation, shelterLocation, preloadedData = null, transportationMode = 'car') {
  if (!userLocation || !shelterLocation) {
    return null;
  }

  const [userLng, userLat] = userLocation;
  const [shelterLng, shelterLat] = shelterLocation;

  try {
    let nodesMap = null;
    let edgesBySource = null;
    let startNode = null;
    let endNode = null;
    let hazards = [];

    if (preloadedData) {
      nodesMap = preloadedData.nodesMap;
      edgesBySource = preloadedData.edgesBySource;
      hazards = preloadedData.hazards || [];
      
      const nodesList = Object.values(nodesMap);
      startNode = findNearestNode(userLat, userLng, nodesList);
      endNode = findNearestNode(shelterLat, shelterLng, nodesList);
    } else {
      const database = getDb();
      if (!database) return { status: 'error', path: [userLocation, shelterLocation] };
      startNode = findNearestNode(userLat, userLng);
      endNode = findNearestNode(shelterLat, shelterLng);
      hazards = database.getAllSync('SELECT lat AS latitude, lng AS longitude, radius AS radius_meters FROM hazards');
    }

    if (!startNode || !endNode) {
      console.warn('Could not map GPS points to offline road network nodes. Returning direct route fallback.');
      return { 
        status: 'success', 
        path: [userLocation, shelterLocation],
        warnings: ['Direct route trajectory (Road graph sync pending)']
      };
    }

    // Pre-calculate hazard bounds for fast 2D collision checks
    const hazardsWithBounds = hazards.map(h => {
      const rad = parseFloat(h.radius_meters ?? 0);
      const hLat = parseFloat(h.latitude ?? 0);
      const hLng = parseFloat(h.longitude ?? 0);
      
      const deltaLat = rad / 111320;
      const cosLat = Math.cos(hLat * Math.PI / 180);
      const deltaLng = rad / (111320 * (cosLat > 0 ? cosLat : 1));
      
      return {
        lat: hLat,
        lng: hLng,
        radius: rad,
        minLat: hLat - deltaLat,
        maxLat: hLat + deltaLat,
        minLng: hLng - deltaLng,
        maxLng: hLng + deltaLng
      };
    });

    // A* Pathfinder Data Structures
    const openSet = [startNode.id];
    const cameFrom = {}; // Map node ID -> parent edge & parent node info
    const gScore = {}; // Cost from start node to current node
    const fScore = {}; // Estimated total cost (gScore + heuristic)

    gScore[startNode.id] = 0;
    fScore[startNode.id] = getDistanceMeters(startNode.lat, startNode.lng, endNode.lat, endNode.lng) / 1000; // in km

    const MAX_ASTAR_ITERATIONS = 4000; // Cap to prevent UI freeze on isolated graph targets
    let iterations = 0;

    while (openSet.length > 0) {
      iterations++;
      if (iterations > MAX_ASTAR_ITERATIONS) {
        console.warn(`A* search exceeded max iteration limit (${MAX_ASTAR_ITERATIONS}). Returning direct trajectory fallback.`);
        return { 
          status: 'success', 
          path: [userLocation, shelterLocation], 
          warnings: ['Direct route trajectory (Surrounding hazard avoidance)'] 
        };
      }

      // Sort openSet by fScore to get the node with the lowest estimate
      openSet.sort((a, b) => (fScore[a] ?? Infinity) - (fScore[b] ?? Infinity));
      const currentId = openSet.shift();

      // If we reached the destination node, reconstruct the path
      if (currentId === endNode.id) {
        const path = reconstructPath(cameFrom, currentId, userLocation, shelterLocation);
        const warnings = getPathWarnings(path, hazards, transportationMode);
        return { status: 'success', path, warnings };
      }

      // Query adjacent edges connecting to other nodes
      let edges = [];
      if (edgesBySource) {
        edges = edgesBySource[currentId] || [];
      } else {
        const database = getDb();
        edges = database ? database.getAllSync(
          'SELECT target_node, distance, geometry FROM edges WHERE source_node = ?',
          [currentId]
        ) : [];
      }

      for (const edge of edges) {
        const neighborId = edge.target_node;
        const edgeGeometry = typeof edge.geometry === 'string' ? JSON.parse(edge.geometry) : edge.geometry;

        // DYNAMIC HAZARD AVOIDANCE
        // Calculate penalty based on intersecting hazards and transportation mode
        const hazardMultiplier = getHazardCostMultiplier(edgeGeometry, hazardsWithBounds, transportationMode);
        
        // Remove Infinity check to allow "least dangerous" escape paths through 99999 penalty
        const tentativeGScore = gScore[currentId] + (edge.distance * hazardMultiplier);

        if (tentativeGScore < (gScore[neighborId] ?? Infinity)) {
          // Record path step
          cameFrom[neighborId] = {
            fromNode: currentId,
            geometry: edgeGeometry
          };
          gScore[neighborId] = tentativeGScore;

          // Compute H (heuristic distance to destination)
          let neighborNode = null;
          if (nodesMap) {
            neighborNode = nodesMap[neighborId];
          } else {
            const database = getDb();
            neighborNode = database ? database.getAllSync('SELECT lat, lng FROM nodes WHERE id = ?', [neighborId])[0] : null;
          }

          const h = neighborNode 
            ? getDistanceMeters(neighborNode.lat, neighborNode.lng, endNode.lat, endNode.lng) / 1000 
            : 0;

          fScore[neighborId] = tentativeGScore + h;

          if (!openSet.includes(neighborId)) {
            openSet.push(neighborId);
          }
        }
      }
    }

    console.warn('A* pathfinding failed to find a safe path. Intersected by hazards?');
    return { status: 'no_safe_route', path: [] };
  } catch (e) {
    console.error('Error during A* offline routing calculation:', e);
    return { status: 'error', path: [] };
  }
}


/**
 * Backtracks the A* parents map to compile the full sequence of coordinates.
 */
function reconstructPath(cameFrom, currentId, userLocation, shelterLocation) {
  let pathCoords = [];
  let curr = currentId;

  while (cameFrom[curr]) {
    const step = cameFrom[curr];
    // Add road geometries backwards
    pathCoords = [...step.geometry, ...pathCoords];
    curr = step.fromNode;
  }

  // If path is empty, return straight line fallback
  if (pathCoords.length === 0) {
    return [userLocation, shelterLocation];
  }

  // Prepend user actual GPS and append target shelter actual GPS to make the path start and end cleanly
  const finalPath = [userLocation, ...pathCoords, shelterLocation];
  
  // Deduplicate consecutive identical coordinates
  const cleanPath = [];
  for (let i = 0; i < finalPath.length; i++) {
    if (i === 0) {
      cleanPath.push(finalPath[i]);
    } else {
      const prev = cleanPath[cleanPath.length - 1];
      const curr = finalPath[i];
      if (prev[0] !== curr[0] || prev[1] !== curr[1]) {
        cleanPath.push(curr);
      }
    }
  }

  return cleanPath;
}

/**
 * Calculates context-specific path warnings if the route crosses warning-level hazards.
 */
function getPathWarnings(pathCoords, hazards, transportationMode) {
  if (!hazards || hazards.length === 0 || pathCoords.length === 0) return [];

  const warnings = new Set();
  
  const hazardsWithBounds = hazards.map(h => {
    const rad = parseFloat(h.radius_meters ?? 50);
    const hLat = parseFloat(h.latitude ?? 0);
    const hLng = parseFloat(h.longitude ?? 0);
    const deltaLat = rad / 111320;
    const cosLat = Math.cos(hLat * Math.PI / 180);
    const deltaLng = rad / (111320 * (cosLat > 0 ? cosLat : 1));
    return {
      name: h.name || 'Hazard Zone',
      hazard_type: h.hazard_type,
      severity_level: h.severity_level,
      lat: hLat,
      lng: hLng,
      radius: rad,
      minLat: hLat - deltaLat,
      maxLat: hLat + deltaLat,
      minLng: hLng - deltaLng,
      maxLng: hLng + deltaLng
    };
  });

  for (const coord of pathCoords) {
    const lng = coord[0];
    const lat = coord[1];

    for (const h of hazardsWithBounds) {
      if (lat >= h.minLat && lat <= h.maxLat && lng >= h.minLng && lng <= h.maxLng) {
        const dist = getDistanceMeters(lat, lng, h.lat, h.lng);
        if (dist <= h.radius) {
          if (h.hazard_type === 'flood') {
            if (h.severity_level === 'medium') {
              warnings.add(`Route passes through a medium flood zone at "${h.name}". Proceed with caution.`);
            } else if (h.severity_level === 'low') {
              warnings.add(`Route passes through a low flood zone at "${h.name}". Watch for minor flooding.`);
            }
          }
        }
      }
    }
  }

  return Array.from(warnings);
}
