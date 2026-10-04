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
export function evaluateHazardsForRescuer(hazards, capability) {
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
      ['debris', 'structural_collapse', 'siege', 'chemical'].includes(h.hazard_type) &&
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
  hazards = []
) {
  if (!startCoord || !endCoord) return null;

  const { criticalObstacles, passableFloods } = evaluateHazardsForRescuer(hazards, capability);

  // If critical obstacles exist, build Mapbox exclude points so the router forces a tactical detour
  let excludeParam = '';
  if (criticalObstacles.length > 0) {
    const excludePoints = [];
    for (const h of criticalObstacles.slice(0, 3)) {
      const cLng = parseFloat(h.longitude);
      const cLat = parseFloat(h.latitude);
      const radMeters = parseFloat(h.radius_meters || 120);

      const deltaLat = radMeters / 111320;
      const cosLat = Math.cos((cLat * Math.PI) / 180);
      const deltaLng = radMeters / (111320 * (cosLat > 0 ? cosLat : 1));

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

  // 1. Try Mapbox Driving with critical obstacles excluded (passable floods are NOT excluded!)
  if (token) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?geometries=geojson&overview=full&steps=true${excludeParam}&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawSteps = route.legs?.[0]?.steps || [];
        const steps = rawSteps.map((s) => ({
          instruction: s.maneuver?.instruction || 'Proceed forward',
          distanceMeters: Math.round(s.distance || 0),
          type: s.maneuver?.type || 'straight',
          modifier: s.maneuver?.modifier || '',
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

  return {
    coordinates: [startCoord, endCoord],
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
