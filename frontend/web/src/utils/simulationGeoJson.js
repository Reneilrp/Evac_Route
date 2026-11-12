// Simulation GeoJSON generator helpers for scenario overlays and road networks
export function buildSimulationRoadGeoJSON(hazards = [], scenario) {
  if (!scenario || hazards.length === 0) return { type: 'FeatureCollection', features: [] };
  // Represent each hazard centroid as a tiny "blocked road" line for visual demo
  const features = hazards
    .filter(h => {
      if (scenario === 'rain' || scenario === 'flood') return h.hazard_type === 'flood';
      if (scenario === 'tremors' || scenario === 'earthquake') return h.hazard_type === 'earthquake';
      return true;
    })
    .map(h => {
      const lng = parseFloat(h.longitude);
      const lat = parseFloat(h.latitude);
      const offset = 0.002;
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - offset, lat],
            [lng + offset, lat]
          ]
        },
        properties: {
          risk: h.severity_level === 'high' ? 'high' : h.severity_level === 'medium' ? 'medium' : 'low',
          name: h.name
        }
      };
    });
  return { type: 'FeatureCollection', features };
}

export function getSimulationOverlayGeoJSON(mode) {
  if (!mode) return { type: 'FeatureCollection', features: [] };
  
  if (mode === 'rain' || mode === 'flood') {
    // Return simulated flood vulnerability basins in Zamboanga city (Tetuan river, coastal zones)
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Tetuan River Basin - High Susceptibility' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.083, 6.915],
              [122.089, 6.915],
              [122.094, 6.924],
              [122.088, 6.926],
              [122.083, 6.915]
            ]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Tugbungan Coastal Plains - Low Elevation Pool' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.095, 6.920],
              [122.105, 6.921],
              [122.102, 6.930],
              [122.093, 6.928],
              [122.095, 6.920]
            ]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Baliwasan Creek Estuary - High Risk Runoff' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.052, 6.910],
              [122.059, 6.912],
              [122.062, 6.920],
              [122.055, 6.918],
              [122.052, 6.910]
            ]]
          }
        }
      ]
    };
  }
  
  if (mode === 'tremors' || mode === 'earthquake') {
    // Return simulated structural debris hazard and fault buffers
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Simulated Fault Line Buffer (high danger)' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.050, 6.900],
              [122.100, 6.935],
              [122.104, 6.931],
              [122.053, 6.897],
              [122.050, 6.900]
            ]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Masonry Bridge - Debris Hazard Zone' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.0880, 6.9188],
              [122.0894, 6.9188],
              [122.0894, 6.9196],
              [122.0880, 6.9196],
              [122.0880, 6.9188]
            ]]
          }
        }
      ]
    };
  }
  
  return { type: 'FeatureCollection', features: [] };
}
