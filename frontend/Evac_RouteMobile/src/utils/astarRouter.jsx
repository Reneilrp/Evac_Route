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
            if (h.hazard_type === 'earthquake' || h.hazard_type === 'maintenance' || h.severity_level === 'high') {
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
      console.warn('Could not map GPS points to offline road network nodes.');
      return { status: 'no_safe_route', path: [] };
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
        console.warn(`A* search exceeded max iteration limit (${MAX_ASTAR_ITERATIONS}). Target facility likely isolated by hazards.`);
        return { 
          status: 'isolated_target', 
          path: [], 
          reason: 'Target facility is isolated by surrounding hazard closures.' 
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
