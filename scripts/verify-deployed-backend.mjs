const baseUrl = (process.env.RELEASE_BASE_URL || 'https://evacroute.app').replace(/\/+$/, '');
const checks = [
  { name: 'ping', path: '/api/ping' },
  { name: 'public stats', path: '/api/public-stats' },
  { name: 'active shelters', path: '/api/shelters/active' },
  { name: 'active hazards', path: '/api/hazards' },
  { name: 'road network', path: '/api/road-network' },
];

const results = [];
for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  const startedAt = performance.now();
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const elapsedMs = Math.round(performance.now() - startedAt);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${check.name} failed: ${response.status} ${response.statusText} (${url})`);
  }

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`${check.name} returned non-JSON content (${url})`);
  }

  results.push({
    name: check.name,
    status: response.status,
    elapsedMs,
    keys: Object.keys(json),
  });
}

console.log(JSON.stringify({ baseUrl, checks: results }, null, 2));
