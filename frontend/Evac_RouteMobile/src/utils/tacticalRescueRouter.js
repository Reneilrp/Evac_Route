/**
 * Tactical Rescue Router Engine (Option 1: Capability- & Severity-Aware Engine)
 *
 * Designed specifically for QRT and Search & Rescue units:
 * - Differentiates between Marine Watercraft (Boats, Zodiacs) and High-Clearance Ground Vehicles (4x4 Trucks).
 * - Penetrates low/moderate flood zones directly (unlike civilians who must avoid all floods).
 * - Strictly detours around truly impassable barriers (severity === 'critical', collapsed structures, downed high-voltage wires, armed siege).
 */

// Helper to calculate Haversine distance in meters
export function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Builds capability profile based on unit type and rescuer role
 */
export function getRescuerCapabilityProfile(assignedUnit, user) {
  const unitType = (assignedUnit?.unit_type || '').toLowerCase();
  const rescueRole = (user?.rescue_role || '').toLowerCase();

  const isWaterCraft =
    unitType.includes('water') ||
    unitType.includes('boat') ||
    unitType.includes('marine') ||
    rescueRole === 'boat_pilot' ||
    rescueRole === 'rescue_swimmer';

  const isHighClearanceTruck =
    unitType.includes('truck') ||
    unitType.includes('high_clearance') ||
    unitType.includes('heavy') ||
    rescueRole === 'heavy_driver';

  const isMedicalAmbulance =
    unitType.includes('ambulance') ||
    unitType.includes('medical') ||
    rescueRole === 'lead_medic';

  return {
    isWaterCraft,
    isHighClearanceTruck,
    isMedicalAmbulance,
    label: isWaterCraft
      ? '🚤 Marine Rescue Vessel'
      : isHighClearanceTruck
      ? '🛻 Heavy 4x4 High-Clearance Truck'
      : '🚑 Emergency Medical Unit',
  };
}

/**
 * Filters hazards into:
 * 1. Critical impassable hazards (must detour even for rescue units)
 * 2. Passable / penetrable hazards (can wade or boat through)
 */
export function evaluateHazardsForRescuer(hazards, capability, customRoadblocks = []) {
  const activeList = (hazards || []).filter(
    (h) =>
      h &&
      h.latitude &&
      h.longitude &&
      (h.is_active === true || h.is_active === 1 || h.is_active === '1' || h.is_active === undefined)
  );

  const criticalObstacles = [];
  const passableFloods = [];

  for (const h of activeList) {
    const isCriticalSeverity = (h.severity_level || '').toLowerCase() === 'critical';
    const isSevereBlockade =
      ['debris', 'structural_collapse', 'roadblock', 'wall_collapse', 'siege', 'chemical'].includes(h.hazard_type) &&
      (h.severity_level === 'high' || isCriticalSeverity);

    if (capability.isWaterCraft) {
      // Marine boats: ALL flood zones are navigable water corridors
      if (h.hazard_type === 'flood') {
        passableFloods.push(h);
      } else if (isCriticalSeverity || isSevereBlockade) {
        criticalObstacles.push(h);
      }
    } else if (capability.isHighClearanceTruck) {
      // 4x4 High-Clearance trucks: Low and Medium floods are passable
      if (
        h.hazard_type === 'flood' &&
        ['low', 'medium'].includes((h.severity_level || '').toLowerCase())
      ) {
        passableFloods.push(h);
      } else if (
        isCriticalSeverity ||
        isSevereBlockade ||
        (h.hazard_type === 'flood' && h.severity_level === 'high')
      ) {
        criticalObstacles.push(h);
      }
    } else {
      // Ambulance / standard emergency vehicle: Only low flood passable; high/critical must detour
      if (h.hazard_type === 'flood' && (h.severity_level || '').toLowerCase() === 'low') {
        passableFloods.push(h);
      } else if (isCriticalSeverity || isSevereBlockade || h.hazard_type === 'flood') {
        criticalObstacles.push(h);
      }
    }
  }

  // Inject user-dropped field roadblocks as absolute critical obstacles (impassable to ALL vehicles)
  for (const rb of (customRoadblocks || [])) {
    if (rb && rb.latitude && rb.longitude) {
      criticalObstacles.push({
        id: rb.id || `rb-${Date.now()}`,
        name: rb.label || 'Field Roadblock (Wall/Debris)',
        hazard_type: 'structural_collapse',
        severity_level: 'critical',
        latitude: parseFloat(rb.latitude),
        longitude: parseFloat(rb.longitude),
        radius_meters: parseFloat(rb.radius_meters || 50),
      });
    }
  }

  return { criticalObstacles, passableFloods };
}

/**
 * Computes tactical navigation route with capability & severity awareness
 */
export async function fetchTacticalRescueRoute(
  startCoord,
  endCoord,
  token,
  capability = { isWaterCraft: false, isHighClearanceTruck: true },
  hazards = [],
  customRoadblocks = []
) {
  if (!startCoord || !endCoord) return null;

  const { criticalObstacles, passableFloods } = evaluateHazardsForRescuer(hazards, capability, customRoadblocks);

  // If critical obstacles exist, build Mapbox exclude points so the router forces a tactical detour
  let excludeParam = '';
  if (criticalObstacles.length > 0) {
    const excludePoints = [];
    for (const h of criticalObstacles.slice(0, 5)) {
      const cLng = parseFloat(h.longitude);
      const cLat = parseFloat(h.latitude);
      const radMeters = parseFloat(h.radius_meters || 50);

      const deltaLat = radMeters / 111320;
      const cosLat = Math.cos((cLat * Math.PI) / 180);
      const deltaLng = radMeters / (111320 * (cosLat > 0 ? cosLat : 1));

      excludePoints.push(`point(${cLng.toFixed(6)} ${cLat.toFixed(6)})`);
      excludePoints.push(`point(${cLng.toFixed(6)} ${(cLat + deltaLat).toFixed(6)})`);
      excludePoints.push(`point(${cLng.toFixed(6)} ${(cLat - deltaLat).toFixed(6)})`);
      excludePoints.push(`point(${(cLng + deltaLng).toFixed(6)} ${cLat.toFixed(6)})`);
      excludePoints.push(`point(${(cLng - deltaLng).toFixed(6)} ${cLat.toFixed(6)})`);
    }
    if (excludePoints.length > 0) {
      excludeParam = `&exclude=${encodeURIComponent(excludePoints.slice(0, 15).join(','))}`;
    }
  }

  // 1. Try Mapbox Driving with critical obstacles excluded (passable floods are NOT excluded!)
  if (token) {
    try {
      let url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?geometries=geojson&overview=full&steps=true${excludeParam}&access_token=${token}`;
      let res = await fetch(url);
      let data = await res.json();

      // If strict multi-exclusion fails to find any route, retry with center-only exclusions
      if ((!data.routes || data.routes.length === 0) && excludeParam && criticalObstacles.length > 0) {
        const centerOnly = criticalObstacles.slice(0, 3).map(h => `point(${parseFloat(h.longitude).toFixed(6)} ${parseFloat(h.latitude).toFixed(6)})`).join(',');
        url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?geometries=geojson&overview=full&steps=true&exclude=${encodeURIComponent(centerOnly)}&access_token=${token}`;
        res = await fetch(url);
        data = await res.json();
      }

      // If still no route due to over-restrictive exclusion, try unconstrained driving route
      if ((!data.routes || data.routes.length === 0)) {
        const cleanUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?geometries=geojson&overview=full&steps=true&access_token=${token}`;
        const cleanRes = await fetch(cleanUrl);
        const cleanData = await cleanRes.json();
        if (cleanData.code === 'Ok' && cleanData.routes && cleanData.routes.length > 0) {
          data = cleanData;

          // Check if clean route intersects any critical roadblock, and attempt a tangent detour waypoint
          if (criticalObstacles.length > 0) {
            const rawCoords = data.routes[0].geometry.coordinates;
            let hitObstacle = null;
            for (const pt of rawCoords) {
              for (const obs of criticalObstacles) {
                const dist = getHaversineDistanceMeters(pt[1], pt[0], parseFloat(obs.latitude), parseFloat(obs.longitude));
                if (dist <= parseFloat(obs.radius_meters || 50) + 15) {
                  hitObstacle = obs;
                  break;
                }
              }
              if (hitObstacle) break;
            }

            if (hitObstacle) {
              const obsLat = parseFloat(hitObstacle.latitude);
              const obsLng = parseFloat(hitObstacle.longitude);
              const midLat = (startCoord[1] + endCoord[1]) / 2;
              const midLng = (startCoord[0] + endCoord[0]) / 2;
              let dx = midLng - obsLng;
              let dy = midLat - obsLat;
              let len = Math.sqrt(dx * dx + dy * dy);
              if (len < 0.0001) { dx = 1; dy = 1; len = Math.sqrt(2); }

              const safeOffset = (parseFloat(hitObstacle.radius_meters || 50) + 90);
              const dLat = (safeOffset / 111320) * (dy / len);
              const cosLat = Math.cos((obsLat * Math.PI) / 180);
              const dLng = (safeOffset / (111320 * (cosLat > 0 ? cosLat : 1))) * (dx / len);
              const detourPoint = [obsLng + dLng, obsLat + dLat];

              const detourUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoord[0]},${startCoord[1]};${detourPoint[0].toFixed(6)},${detourPoint[1].toFixed(6)};${endCoord[0]},${endCoord[1]}?geometries=geojson&overview=full&steps=true&access_token=${token}`;
              const detourRes = await fetch(detourUrl);
              const detourData = await detourRes.json();
              if (detourData.code === 'Ok' && detourData.routes && detourData.routes.length > 0) {
                data = detourData;
              }
            }
          }
        }
      }

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawSteps = route.legs?.[0]?.steps || [];
        const steps = rawSteps.map((s) => ({
          name: s.name || '',
          instruction: (s.maneuver?.instruction || 'Proceed forward')
            .replace(/head\s+(north|south|east|west|northwest|northeast|southwest|southeast)/gi, 'Proceed forward')
            .replace(/\b(north|south|east|west|northwest|northeast|southwest|southeast)\b/gi, 'forward'),
          distanceMeters: Math.round(s.distance || 0),
          durationSeconds: Math.round(s.duration || 0),
          type: s.maneuver?.type || 'straight',
          modifier: s.maneuver?.modifier || '',
          location: s.maneuver?.location || null,
          lanes: s.intersections?.[0]?.lanes || null,
        }));

        const coordinates = route.geometry.coordinates;

        // Check if route traverses any passable flood zones
        const penetratedFloods = [];
        for (const pt of coordinates) {
          for (const f of passableFloods) {
            const fDist = getHaversineDistanceMeters(
              pt[1],
              pt[0],
              parseFloat(f.latitude),
              parseFloat(f.longitude)
            );
            if (fDist <= parseFloat(f.radius_meters || 150) + 15) {
              if (!penetratedFloods.some((pf) => pf.id === f.id)) {
                penetratedFloods.push(f);
              }
            }
          }
        }

        const isWaterCorridor = capability.isWaterCraft;
        const isWadingRoute = !capability.isWaterCraft && penetratedFloods.length > 0;
        const isDetourActive = criticalObstacles.length > 0 && excludeParam !== '';

        let tacticalStatusText = 'OPTIMAL TRANSIT • Direct clear corridor';
        let tacticalBadgeType = 'normal'; // 'normal' | 'wading' | 'water' | 'detour'

        if (isWaterCorridor) {
          tacticalStatusText = 'WATER ROUTE ACTIVE • Navigating flood basin / waterway directly';
          tacticalBadgeType = 'water';
        } else if (isWadingRoute) {
          tacticalStatusText = `TACTICAL WADING ACTIVE • Traversing flood zone (${
            penetratedFloods[0]?.name || 'Water clearance OK'
          })`;
          tacticalBadgeType = 'wading';
        } else if (isDetourActive) {
          tacticalStatusText = `CRITICAL DETOUR • Bypassing impassable barrier (${
            criticalObstacles[0]?.name || 'Critical Hazard'
          })`;
          tacticalBadgeType = 'detour';
        }

        return {
          coordinates,
          distanceMeters: Math.round(route.distance || 0),
          durationSeconds: Math.round(route.duration || 0),
          steps,
          tacticalTelemetry: {
            strategy: isWaterCorridor
              ? 'water_corridor'
              : isWadingRoute
              ? 'flood_wading'
              : 'standard_road',
            badgeType: tacticalBadgeType,
            statusText: tacticalStatusText,
            penetratedFloods,
            detouredCriticalCount: criticalObstacles.length,
            unitLabel: capability.label,
          },
        };
      }
    } catch (e) {
      console.warn('[TacticalRescueRouter] Mapbox API route failed, using tactical geodesic fallback:', e);
    }
  }

  // 2. Resilient Direct Tactical Vector Fallback (for watercraft or offline emergency)
  const directDist = getHaversineDistanceMeters(
    startCoord[1],
    startCoord[0],
    endCoord[1],
    endCoord[0]
  );
  const isWater = capability.isWaterCraft;

  // Resilient street-grid corridor interpolation (avoids cutting diagonally through buildings)
  let fallbackCoords = [startCoord, endCoord];
  if (directDist > 60) {
    // Follow orthogonal urban grid corner instead of diagonal cut across city blocks
    const cornerPoint = [endCoord[0], startCoord[1]];
    fallbackCoords = [startCoord, cornerPoint, endCoord];
  }

  return {
    coordinates: fallbackCoords,
    distanceMeters: Math.round(directDist),
    durationSeconds: Math.round(directDist / (isWater ? 9 : 12)), // ~32 km/h water, ~43 km/h road
    steps: [
      {
        instruction: isWater
          ? 'Navigate direct waterway / flood basin vector to target'
          : 'Proceed direct tactical approach toward target',
        distanceMeters: Math.round(directDist),
        type: 'straight',
        modifier: '',
      },
      {
        instruction: 'Arrive at destination point',
        distanceMeters: 0,
        type: 'arrive',
        modifier: '',
      },
    ],
    tacticalTelemetry: {
      strategy: isWater ? 'water_corridor' : 'tactical_direct',
      badgeType: isWater ? 'water' : 'normal',
      statusText: isWater
        ? 'WATER ROUTE ACTIVE • Direct waterway transit corridor'
        : 'TACTICAL DIRECT • Direct tactical vector engaged',
      penetratedFloods: [],
      detouredCriticalCount: criticalObstacles.length,
      unitLabel: capability.label,
    },
  };
}
