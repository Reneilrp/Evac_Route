# 🛡️ Evac_Route Shelter Partner API — Integration & Developer Guide

Welcome to the **Evac_Route Shelter Partner API**. This guide documents the end-to-end process for provisioning API keys, authenticating external applications, querying evacuation centers, and consuming real-time shelter data.

---

## 📌 1. Overview & Capabilities

The Shelter Partner API enables authorized third parties (e.g., Red Cross, OCD / NDRRMC, academic research teams, command center dashboards, or mobile GIS apps) to access verified emergency evacuation shelter data for **Zamboanga City**.

### Key Data Attributes Exposed:
* **Identification**: Shelter ID, Official Center Name, Center Type (`covered court` vs `dedicated evacuation center`).
* **Location**: Barangay, District (`District I` vs `District II`), Street Address, Full Geo-Location description.
* **Spatial & GIS**: Decimal WGS84 GPS Coordinates (`latitude`, `longitude`, `[lng, lat]` arrays), and native **RFC 7946 GeoJSON FeatureCollections**.
* **Dimensions & Capacity**: Usable floor area in square meters (`floor_area_sqm`), verified maximum capacity, live headcount occupancy, available vacancy, and capacity utilization percentage.
* **Operational State**: Live center readiness status (`open`, `standby`, `full`, `closed`).

---

## 🔑 2. How to Obtain an API Key

API keys are cryptographically generated 64-character tokens prefixed with `evac_live_`.

### Option A: Via the Web Admin Console (Recommended)
1. Log in to the [Evac_Route Admin Console](https://evacroute.app) as an **Admin** or **LGU Agency Staff**.
2. From the left sidebar, click **Partner API Keys** (or navigate directly to [`/admin/api-keys`](https://evacroute.app/admin/api-keys)).
3. Click the **`New API key`** button adjacent to the search bar.
4. Enter the **Partner / Project Name** (e.g., `Philippine Red Cross - Zamboanga Chapter`).
5. *(Optional)* Specify a **Validity Duration in Days** (e.g., `90`), or leave blank for a permanent key.
6. Click **Generate Key**.
7. **Copy the API key immediately**. For security, the raw secret is only displayed once upon creation.

### Option B: Via Backend Artisan CLI
Admins with SSH access to the production server can generate keys from the terminal:
```bash
# Generate a permanent API key
php artisan api-key:generate "WMSU Disaster Analytics Team"

# Generate an API key that expires in 60 days
php artisan api-key:generate "Ateneo DRRM Research" --days=60

# List all active keys and usage stats
php artisan api-key:list
```

---

## 🔐 3. Authentication Methods

Every external request must include an authorized API key. The Evac_Route API gateway supports three authentication mechanisms:

### Method 1: Custom Header (Recommended)
Send the key in the `X-API-KEY` HTTP header:
```http
GET /api/shelters HTTP/1.1
Host: evacroute.app
X-API-KEY: evac_live_a1b2c3d4e5f6...
Accept: application/json
```

### Method 2: Standard Bearer Token
Send the key in the `Authorization` header with the `Bearer` scheme:
```http
GET /api/shelters HTTP/1.1
Host: evacroute.app
Authorization: Bearer evac_live_a1b2c3d4e5f6...
Accept: application/json
```

### Method 3: Query Parameter (For Quick Testing or GIS Tile Loaders)
Append `?api_key=` to the endpoint URL:
```
https://evacroute.app/api/shelters/map?api_key=evac_live_a1b2c3d4e5f6...
```
*(Note: Use Header authentication for production backends to avoid leaking keys in browser history or web proxy logs).*

---

## 🌐 4. API Endpoints Reference

**Production Base URL:**
```
https://evacroute.app/api
```

---

### Endpoint 1: List All Shelters
Returns an array of evacuation centers with live occupancy metrics and physical parameters.

* **Method**: `GET`
* **Route**: `/api/shelters`
* **Headers**: `X-API-KEY: <your_key>`

#### Supported Query Parameters:
| Parameter | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `district` | string | `?district=I` or `?district=II` | Filters by congressional district (`District I` / West Coast vs `District II` / East Coast). |
| `type` | string | `?type=court` or `?type=ec` | Filters by infrastructure type: `court` (Barangay Covered Courts) or `ec` (Dedicated Evacuation Centers / Schools). |
| `status` | string | `?status=open` | Filters by center status (`open`, `standby`, `full`, `closed`). |
| `barangay` | string | `?barangay=Tetuan` | Filters shelters situated within a specific barangay. |
| `search` | string | `?search=Grandstand` | Fuzzy search across center name, barangay, and address. |

#### Sample Response (`200 OK`):
```json
{
  "status": "success",
  "total": 141,
  "filtered_count": 1,
  "data": [
    {
      "id": 12,
      "name": "Tetuan Central Covered Court",
      "district": "District II",
      "barangay": "Tetuan",
      "address": "Cabato Road, Tetuan",
      "location": "Tetuan, District II, Zamboanga City",
      "latitude": 6.91894,
      "longitude": 122.08621,
      "coordinates": [122.08621, 6.91894],
      "floor_area": 850.0,
      "floor_area_sqm": 850.0,
      "capacity": 500,
      "max_capacity": 500,
      "current_occupancy": 120,
      "available_capacity": 380,
      "occupancy_rate": 24.0,
      "status": "open",
      "is_evacuation_center": true,
      "created_at": "2026-10-15T08:30:00.000000Z",
      "updated_at": "2026-11-18T16:30:00.000000Z"
    }
  ]
}
```

---

### Endpoint 2: Get Single Shelter by ID
Retrieve full details and current capacity for a specific shelter.

* **Method**: `GET`
* **Route**: `/api/shelters/{id}`
* **Headers**: `X-API-KEY: <your_key>`

#### Sample Request:
```bash
curl -X GET "https://evacroute.app/api/shelters/12" \
     -H "X-API-KEY: evac_live_your_api_key_here"
```

#### Sample Response (`200 OK`):
```json
{
  "status": "success",
  "data": {
    "id": 12,
    "name": "Tetuan Central Covered Court",
    "district": "District II",
    "barangay": "Tetuan",
    "address": "Cabato Road, Tetuan",
    "location": "Tetuan, District II, Zamboanga City",
    "latitude": 6.91894,
    "longitude": 122.08621,
    "coordinates": [122.08621, 6.91894],
    "floor_area": 850.0,
    "floor_area_sqm": 850.0,
    "capacity": 500,
    "max_capacity": 500,
    "current_occupancy": 120,
    "available_capacity": 380,
    "occupancy_rate": 24.0,
    "status": "open",
    "is_evacuation_center": true
  }
}
```

---

### Endpoint 3: GeoJSON Map Feed
Returns an RFC 7946 compliant GeoJSON `FeatureCollection` ready for direct ingestion into Mapbox, Leaflet, Google Maps, OpenLayers, QGIS, or ArcGIS.

* **Method**: `GET`
* **Route**: `/api/shelters/map`
* **Headers**: `X-API-KEY: <your_key>` *(or `?api_key=`)*

#### Sample Request:
```bash
curl -X GET "https://evacroute.app/api/shelters/map" \
     -H "X-API-KEY: evac_live_your_api_key_here"
```

#### Sample Response (`200 OK`):
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "title": "Evac_Route Zamboanga City Emergency Shelters",
    "generated_at": "2026-11-18T16:55:00.000000Z",
    "total_shelters": 141
  },
  "features": [
    {
      "type": "Feature",
      "id": 12,
      "geometry": {
        "type": "Point",
        "coordinates": [122.08621, 6.91894]
      },
      "properties": {
        "id": 12,
        "name": "Tetuan Central Covered Court",
        "district": "District II",
        "barangay": "Tetuan",
        "address": "Cabato Road, Tetuan",
        "location": "Tetuan, District II, Zamboanga City",
        "floor_area_sqm": 850.0,
        "capacity": 500,
        "max_capacity": 500,
        "current_occupancy": 120,
        "available_capacity": 380,
        "occupancy_rate": 24.0,
        "status": "open",
        "marker_color": "#10B981"
      }
    }
  ]
}
```

---

## 💻 5. Code Examples Across Stacks

### cURL
```bash
# Query open shelters in District I
curl -X GET "https://evacroute.app/api/shelters?district=I&status=open" \
     -H "X-API-KEY: evac_live_your_key_here" \
     -H "Accept: application/json"
```

### JavaScript / TypeScript (Fetch API)
```javascript
const API_KEY = process.env.SHELTER_API_KEY || 'evac_live_your_key_here';

async function fetchOpenShelters() {
  const url = new URL('https://evacroute.app/api/shelters');
  url.searchParams.append('district', 'I');
  url.searchParams.append('status', 'open');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-KEY': API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`Found ${result.total} shelters:`, result.data);
  return result.data;
}
```

### Python (Requests)
```python
import os
import requests

API_KEY = os.getenv("SHELTER_API_KEY", "evac_live_your_key_here")
BASE_URL = "https://evacroute.app/api/shelters"

headers = {
    "X-API-KEY": API_KEY,
    "Accept": "application/json"
}

params = {
    "type": "court",
    "district": "II"
}

response = requests.get(BASE_URL, headers=headers, params=params)

if response.status_code == 200:
    data = response.json()
    print(f"Total Shelters Found: {data['total']}")
    for shelter in data['data']:
        print(f"- {shelter['name']} (Occupancy: {shelter['current_occupancy']}/{shelter['capacity']})")
else:
    print(f"Failed with status: {response.status_code}", response.json())
```

### Mapbox GL JS (Direct GeoJSON Ingestion)
```javascript
map.on('load', () => {
  // Add Evac_Route live GeoJSON feed directly as a Mapbox GeoJSON source
  map.addSource('evac-shelters', {
    type: 'geojson',
    data: 'https://evacroute.app/api/shelters/map?api_key=evac_live_your_key_here'
  });

  map.addLayer({
    id: 'shelter-markers',
    type: 'circle',
    source: 'evac-shelters',
    paint: {
      'circle-radius': 8,
      'circle-color': ['get', 'marker_color'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF'
    }
  });

  // Display shelter occupancy on click
  map.on('click', 'shelter-markers', (e) => {
    const props = e.features[0].properties;
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <h4 style="font-weight:bold; margin-bottom:4px;">${props.name}</h4>
        <p style="margin:0; font-size:12px;">Barangay: ${props.barangay}</p>
        <p style="margin:0; font-size:12px;">Available Slots: <strong>${props.available_capacity}</strong> / ${props.capacity}</p>
      `)
      .addTo(map);
  });
});
```

---

## ⚠️ 6. Error Handling & HTTP Status Codes

The API returns standard RFC HTTP status codes accompanied by a structured JSON error body:

| HTTP Status | Code Meaning | Common Cause | Resolution |
| :--- | :--- | :--- | :--- |
| `200 OK` | Success | Request succeeded. | Process `data` payload. |
| `401 Unauthorized` | Missing / Invalid Key | No API key header provided, or key does not match database. | Check header name (`X-API-KEY`) and verify key string. |
| `403 Forbidden` | Inactive / Expired Key | Key was deactivated by an Admin or past its expiration date. | Contact LGU Administrator to reactivate or generate a new key. |
| `404 Not Found` | Resource Not Found | Requested Shelter ID does not exist. | Verify Shelter ID with `GET /api/shelters`. |
| `500 Server Error` | Internal Server Error | Transient database or cluster failure. | Retry with exponential backoff (1s, 2s, 4s). |

#### Sample Error Response (`401 Unauthorized`):
```json
{
  "status": "error",
  "message": "Missing API Key. Provide key via X-API-KEY header, Authorization Bearer, or ?api_key= query parameter."
}
```

#### Sample Error Response (`403 Forbidden`):
```json
{
  "status": "error",
  "message": "API key is deactivated. Please contact the administrator."
}
```

---

## 🔒 7. Best Practices & Security Guidelines

1. **Store Keys in Environment Variables**: Never hardcode API keys into frontend client repos or public repositories. Use `.env` variables (`SHELTER_API_KEY`).
2. **Reverse Proxy for Web Clients**: If building public web frontends, route queries through your own backend proxy to prevent exposing your secret `evac_live_` token to end users.
3. **Monitor Usage Logs**: Administrators can review real-time request latencies, client IPs, and endpoint hits at [`https://evacroute.app/admin/api-keys`](https://evacroute.app/admin/api-keys).
4. **Key Rotation & Revocation**: If a token is suspected to be compromised, administrators can deactivate it immediately using the single-click power toggle in the Admin Console without needing to restart the server.

---

## 📞 Support & Inquiries
For API key requests, higher rate limits, or integration assistance, coordinate with:
* **City Social Welfare and Development Office (CSWDO)**
* **City Disaster Risk Reduction and Management Office (CDRRMO) - Zamboanga City**
* **Admin Portal**: [https://evacroute.app/admin/api-keys](https://evacroute.app/admin/api-keys)
