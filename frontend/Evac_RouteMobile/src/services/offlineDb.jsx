import * as SQLite from 'expo-sqlite';

let db = null;

try {
  db = SQLite.openDatabaseSync('evac_route.db');
} catch (e) {
  console.error('Failed to open SQLite database:', e);
}

/**
 * Initializes the database schema and sets up indexing for fast routing lookups.
 */
export function initDb() {
  if (!db) return;

  try {
    // 1. Enable WAL mode for concurrency and performance
    db.execSync('PRAGMA journal_mode = WAL;');

    // 2. Create nodes table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS nodes (
        id INTEGER PRIMARY KEY NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL
      );
    `);

    // 3. Create edges table (road graph links)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS edges (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        source_node INTEGER NOT NULL,
        target_node INTEGER NOT NULL,
        distance REAL NOT NULL,
        geometry TEXT NOT NULL,
        FOREIGN KEY(source_node) REFERENCES nodes(id),
        FOREIGN KEY(target_node) REFERENCES nodes(id)
      );
    `);

    // 4. Create shelters table for offline tracking
    db.execSync(`
      CREATE TABLE IF NOT EXISTS shelters (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        max_capacity INTEGER,
        current_occupancy INTEGER,
        status TEXT NOT NULL
      );
    `);

    // 5. Create hazards table for dynamic path avoidance
    db.execSync(`
      CREATE TABLE IF NOT EXISTS hazards (
        id INTEGER PRIMARY KEY NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        radius REAL NOT NULL
      );
    `);

    // 6. Create performance indexes
    db.execSync('CREATE INDEX IF NOT EXISTS idx_nodes_coords ON nodes(lat, lng);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_node);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_node);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_hazards_coords ON hazards(lat, lng);');

    console.log('SQLite schemas and indexes initialized successfully.');
    
    // Seed the database if nodes are empty
    seedDb();
  } catch (e) {
    console.error('Error initializing database:', e);
  }
}

/**
 * Pre-bundles and seeds a simplified road network graph of Zamboanga City (Tetuan/Tugbungan/Baliwasan).
 */
function seedDb() {
  if (!db) return;

  try {
    const existing = db.getAllSync('SELECT COUNT(*) as count FROM nodes');
    if (existing[0].count > 0) {
      console.log('Database already seeded, skipping seed.');
      return;
    }

    console.log('Seeding pre-bundled road network graph...');

    // Nodes List
    // Coordinates match shelter locations:
    // Tetuan Covered Court (6.9185, 122.0882)
    // Tugbungan School (6.9312, 122.0954)
    // Baliwasan Gym (6.9126, 122.0573)
    const nodes = [
      { id: 1, lat: 6.9150, lng: 122.0850 }, // User's home 1 (Tetuan residential)
      { id: 2, lat: 6.9170, lng: 122.0850 }, // Intersection A (Tetuan Main Rd)
      { id: 3, lat: 6.9185, lng: 122.0882 }, // Shelter 1 (Tetuan Covered Court)
      { id: 4, lat: 6.9250, lng: 122.0900 }, // Intersection C (Tugbungan Road intersection)
      { id: 5, lat: 6.9312, lng: 122.0954 }, // Shelter 3 (Tugbungan Elementary School)
      { id: 6, lat: 6.9120, lng: 122.0650 }, // Intersection D (Baliwasan crossroads)
      { id: 7, lat: 6.9126, lng: 122.0573 }, // Shelter 2 (Baliwasan Gym)
      { id: 8, lat: 6.9170, lng: 122.0870 }, // Intermediary road node near potential hazard
      { id: 9, lat: 6.9160, lng: 122.0890 }, // Alternative bypass route node avoiding hazard
    ];

    // Seed Nodes
    const insertNode = db.prepareSync('INSERT INTO nodes (id, lat, lng) VALUES ($id, $lat, $lng)');
    for (const node of nodes) {
      insertNode.executeSync({ $id: node.id, $lat: node.lat, $lng: node.lng });
    }
    insertNode.finalizeSync();

    // Edges List (with GeoJSON geometry array of coordinates serialized as string)
    const edges = [
      {
        source: 1, target: 2, distance: 0.22,
        geometry: JSON.stringify([[122.0850, 6.9150], [122.0850, 6.9170]])
      },
      // Road segment through Node 8 (hazard prone)
      {
        source: 2, target: 8, distance: 0.22,
        geometry: JSON.stringify([[122.0850, 6.9170], [122.0870, 6.9170]])
      },
      {
        source: 8, target: 3, distance: 0.20,
        geometry: JSON.stringify([[122.0870, 6.9170], [122.0882, 6.9185]])
      },
      // Alternative Bypass road (safe path)
      {
        source: 1, target: 9, distance: 0.45,
        geometry: JSON.stringify([[122.0850, 6.9150], [122.0870, 6.9155], [122.0890, 6.9160]])
      },
      {
        source: 9, target: 3, distance: 0.28,
        geometry: JSON.stringify([[122.0890, 6.9160], [122.0882, 6.9185]])
      },
      // Road to Tugbungan
      {
        source: 2, target: 4, distance: 1.0,
        geometry: JSON.stringify([[122.0850, 6.9170], [122.0880, 6.9210], [122.0900, 6.9250]])
      },
      {
        source: 4, target: 5, distance: 0.9,
        geometry: JSON.stringify([[122.0900, 6.9250], [122.0920, 6.9280], [122.0954, 6.9312]])
      },
      // Road to Baliwasan
      {
        source: 1, target: 6, distance: 2.2,
        geometry: JSON.stringify([[122.0850, 6.9150], [122.0750, 6.9130], [122.0650, 6.9120]])
      },
      {
        source: 6, target: 7, distance: 0.8,
        geometry: JSON.stringify([[122.0650, 6.9120], [122.0600, 6.9123], [122.0573, 6.9126]])
      }
    ];

    // Seed Edges (Both directions to support undirected graph traversal)
    const insertEdge = db.prepareSync('INSERT INTO edges (source_node, target_node, distance, geometry) VALUES ($source, $target, $distance, $geometry)');
    for (const edge of edges) {
      // Forward
      insertEdge.executeSync({
        $source: edge.source,
        $target: edge.target,
        $distance: edge.distance,
        $geometry: edge.geometry
      });
      // Backward
      insertEdge.executeSync({
        $source: edge.target,
        $target: edge.source,
        $distance: edge.distance,
        // Reverse coordinates for backward geometry traversal
        $geometry: JSON.stringify([...JSON.parse(edge.geometry)].reverse())
      });
    }
    insertEdge.finalizeSync();

    console.log('Seeded SQLite road network successfully.');
  } catch (e) {
    console.error('Failed to seed SQLite database:', e);
  }
}

/**
 * Caches a fresh list of active shelters from the server to SQLite.
 */
export function saveShelters(sheltersList) {
  if (!db || !sheltersList) return;

  try {
    db.execSync('DELETE FROM shelters');
    const stmt = db.prepareSync(`
      INSERT INTO shelters (id, name, lat, lng, max_capacity, current_occupancy, status)
      VALUES ($id, $name, $lat, $lng, $max_cap, $cur_occ, $status)
    `);
    
    for (const s of sheltersList) {
      stmt.executeSync({
        $id: s.id,
        $name: s.name,
        $lat: parseFloat(s.latitude),
        $lng: parseFloat(s.longitude),
        $max_cap: s.max_capacity,
        $cur_occ: s.current_occupancy,
        $status: s.status
      });
    }
    stmt.finalizeSync();
  } catch (e) {
    console.error('Error saving shelters to SQLite:', e);
  }
}

/**
 * Returns all offline cached shelters.
 */
export function getOfflineShelters() {
  if (!db) return [];
  try {
    return db.getAllSync('SELECT id, name, lat AS latitude, lng AS longitude, max_capacity, current_occupancy, status FROM shelters');
  } catch (e) {
    console.error('Error fetching offline shelters:', e);
    return [];
  }
}

/**
 * Caches active hazards from the server to SQLite.
 */
export function saveHazards(hazardsList) {
  if (!db || !hazardsList) return;

  try {
    db.execSync('DELETE FROM hazards');
    const stmt = db.prepareSync(`
      INSERT INTO hazards (id, lat, lng, radius)
      VALUES ($id, $lat, $lng, $radius)
    `);
    
    for (const h of hazardsList) {
      stmt.executeSync({
        $id: h.id,
        $lat: parseFloat(h.latitude),
        $lng: parseFloat(h.longitude),
        $radius: parseFloat(h.radius_meters)
      });
    }
    stmt.finalizeSync();
  } catch (e) {
    console.error('Error saving hazards to SQLite:', e);
  }
}

/**
 * Returns all offline cached hazards.
 */
export function getOfflineHazards() {
  if (!db) return [];
  try {
    return db.getAllSync('SELECT id, lat AS latitude, lng AS longitude, radius AS radius_meters FROM hazards');
  } catch (e) {
    console.error('Error fetching offline hazards:', e);
    return [];
  }
}

/**
 * Returns all offline cached nodes.
 */
export function getOfflineNodes() {
  if (!db) return [];
  try {
    return db.getAllSync('SELECT * FROM nodes');
  } catch (e) {
    console.error('Error fetching offline nodes:', e);
    return [];
  }
}

/**
 * Returns all offline cached edges.
 */
export function getOfflineEdges() {
  if (!db) return [];
  try {
    return db.getAllSync('SELECT * FROM edges');
  } catch (e) {
    console.error('Error fetching offline edges:', e);
    return [];
  }
}


/**
 * Performs a fast SQLite coordinate check to see if a specific lat/lng lies within
 * any active hazard circle. Used for pre-routing checks.
 */
export function isCoordinateUnsafe(lat, lng) {
  if (!db) return false;

  try {
    // Quick bounding box + haversine distance filtering inside query
    const active = db.getAllSync('SELECT lat, lng, radius FROM hazards');
    for (const h of active) {
      if (getDistanceMeters(lat, lng, h.lat, h.lng) <= h.radius) {
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error('Error in SQLite hazard overlap check:', e);
    return false;
  }
}

/**
 * Utility helper to calculate Haversine distance in meters.
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}
