// Client-Side hydrological flood accumulation solver
export function runLocalSimulation(lng, lat, radiusMeters, token, onResult) {
  const zoom = 14;
  const n = Math.pow(2, zoom);
  const xExact = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yExact = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx = Math.floor(xExact);
  const ty = Math.floor(yExact);

  const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${tx}/${ty}.pngraw?access_token=${token}`;

  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, 256, 256).data;

      const pxCenter = Math.floor((xExact - tx) * 256);
      const pyCenter = Math.floor((yExact - ty) * 256);

      // Rough meter per pixel conversion at Zamboanga latitude (~6.9 deg)
      const metersPerPixel = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
      const rPixels = Math.max(8, Math.min(64, Math.round(radiusMeters / metersPerPixel)));

      let minElev = Infinity;
      let maxElev = -Infinity;
      const elevations = [];

      const getElevationAt = (px, py) => {
        if (px < 0 || px >= 256 || py < 0 || py >= 256) return null;
        const idx = (py * 256 + px) * 4;
        const R = imgData[idx];
        const G = imgData[idx + 1];
        const B = imgData[idx + 2];
        return -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1);
      };

      for (let dy = -rPixels; dy <= rPixels; dy += 2) {
        for (let dx = -rPixels; dx <= rPixels; dx += 2) {
          const distSq = dx * dx + dy * dy;
          if (distSq <= rPixels * rPixels) {
            const px = pxCenter + dx;
            const py = pyCenter + dy;
            const elev = getElevationAt(px, py);
            if (elev !== null) {
              minElev = Math.min(minElev, elev);
              maxElev = Math.max(maxElev, elev);
              elevations.push({ dx, dy, elev, px, py });
            }
          }
        }
      }

      const elevRange = Math.max(1, maxElev - minElev);
      const flowVectors = [];
      const poolingPolygons = [];

      elevations.forEach(pt => {
        const neighbors = [
          getElevationAt(pt.px + 2, pt.py),
          getElevationAt(pt.px - 2, pt.py),
          getElevationAt(pt.px, pt.py + 2),
          getElevationAt(pt.px, pt.py - 2),
        ];
        const validNeighbors = neighbors.filter(n => n !== null);
        if (validNeighbors.length > 0) {
          const avgNeighbor = validNeighbors.reduce((a, b) => a + b, 0) / validNeighbors.length;
          const drop = pt.elev - avgNeighbor;

          const ptLng = lng + ((pt.dx * metersPerPixel) / (111320 * Math.cos(latRad)));
          const ptLat = lat - ((pt.dy * metersPerPixel) / 110540);

          if (drop < -0.15 && (pt.elev - minElev) / elevRange < 0.35) {
            const poolRadius = 0.00035;
            poolingPolygons.push({
              type: 'Feature',
              properties: {
                depthRatio: 1 - ((pt.elev - minElev) / elevRange),
                elev: pt.elev
              },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [ptLng - poolRadius, ptLat - poolRadius],
                  [ptLng + poolRadius, ptLat - poolRadius],
                  [ptLng + poolRadius, ptLat + poolRadius],
                  [ptLng - poolRadius, ptLat + poolRadius],
                  [ptLng - poolRadius, ptLat - poolRadius]
                ]]
              }
            });
          }

          if (Math.abs(drop) > 0.05 && (pt.px % 4 === 0) && (pt.py % 4 === 0)) {
            const dxGrad = (getElevationAt(pt.px + 2, pt.py) ?? pt.elev) - (getElevationAt(pt.px - 2, pt.py) ?? pt.elev);
            const dyGrad = (getElevationAt(pt.px, pt.py + 2) ?? pt.elev) - (getElevationAt(pt.px, pt.py - 2) ?? pt.elev);
            const mag = Math.sqrt(dxGrad * dxGrad + dyGrad * dyGrad) || 1;
            const stepLen = 0.00045;
            const targetLng = ptLng - (dxGrad / mag) * stepLen;
            const targetLat = ptLat + (dyGrad / mag) * stepLen;

            flowVectors.push({
              type: 'Feature',
              properties: { magnitude: mag },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [ptLng, ptLat],
                  [targetLng, targetLat]
                ]
              }
            });
          }
        }
      });

      const centerElev = getElevationAt(pxCenter, pyCenter) ?? minElev;
      const slopeProfile = maxElev - minElev;

      onResult({
        success: true,
        centerElevationMeters: centerElev.toFixed(1),
        minElevationMeters: minElev.toFixed(1),
        maxElevationMeters: maxElev.toFixed(1),
        slopeGradientMeters: slopeProfile.toFixed(1),
        poolingGeoJSON: {
          type: 'FeatureCollection',
          features: poolingPolygons
        },
        vectorsGeoJSON: {
          type: 'FeatureCollection',
          features: flowVectors
        }
      });
    } catch (err) {
      console.error('Local hydrology simulation calculation failed:', err);
      onResult({ success: false, error: err.message });
    }
  };
  img.onerror = (err) => {
    console.error('Failed to load terrain tiles for simulation:', err);
    onResult({ success: false, error: 'Could not fetch DEM terrain elevation tiles' });
  };
  img.src = url;
}
