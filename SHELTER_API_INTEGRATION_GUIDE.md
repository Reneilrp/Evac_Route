# 🏫 Evac_Route Shelter API — Student & Developer Guide

> ### 🔑 YOUR API CREDENTIALS
> **API Key:** `evac_live_7fawG315Vf6bnadJdVulSlecu4mLWiSByRj7Vue3`  
> **Base URL:** `https://evacroute.app/api`  
> **Authentication Header:** `X-API-KEY: PASTE_YOUR_GENERATED_API_KEY_HERE`  
> *(You can also use `?api_key=YOUR_KEY` in the URL if testing quickly in your browser).*

---

## 👋 Welcome!
Hey guys! This API allows your project to fetch real-time data for all **141 evacuation shelters** across Zamboanga City (covering both District I and District II).

### What data does this API give you?
* **Shelter Name & Type** (e.g. Covered Courts, School Gyms, Dedicated Evacuation Centers)
* **Barangay & District** (District I / West Coast vs District II / East Coast)
* **GPS Coordinates** (Latitude, Longitude, and `[lng, lat]` array)
* **Floor Area** (in square meters `sq.m.`)
* **Capacity & Occupancy** (Max Capacity, Current Headcount, Available Vacancies, Occupancy Percentage)
* **Status** (`open`, `standby`, `full`, `closed`)
* **GeoJSON Map Feed** (Ready to drop directly into Leaflet, Mapbox, or Google Maps)

---

## 🚀 Quick Start (Testing in 10 Seconds)

### Option 1: In your Browser
Simply paste this in your browser URL bar (replace with your actual key):
```text
https://evacroute.app/api/shelters?api_key=PASTE_YOUR_GENERATED_API_KEY_HERE
```

### Option 2: Using cURL in Terminal
```bash
curl -X GET "https://evacroute.app/api/shelters" \
     -H "X-API-KEY: PASTE_YOUR_GENERATED_API_KEY_HERE"
```

---

## 📡 API Endpoints

All endpoints require your API key passed either as:
* **Header (Recommended):** `X-API-KEY: YOUR_KEY` (or `Authorization: Bearer YOUR_KEY`)
* **Query Parameter:** `?api_key=YOUR_KEY`

---

### 1. List All Shelters
Fetch all 141 evacuation shelters.

* **URL:** `GET https://evacroute.app/api/shelters`
* **Query Filters (combine any of these):**
  * `?district=I` → Get District I shelters only (West Coast)
  * `?district=II` → Get District II shelters only (East Coast)
  * `?type=court` → Get barangay covered courts only
  * `?type=ec` → Get dedicated evacuation centers only
  * `?status=open` → Get currently open shelters only
  * `?barangay=Tetuan` → Get shelters located in a specific barangay
  * `?search=Grandstand` → Search by name, barangay, or street address

#### Example Query:
```text
GET https://evacroute.app/api/shelters?district=I&status=open
```

#### JSON Response Structure:
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
      "floor_area_sqm": 850.0,
      "capacity": 500,
      "max_capacity": 500,
      "current_occupancy": 120,
      "available_capacity": 380,
      "occupancy_rate": 24.0,
      "status": "open",
      "is_evacuation_center": true
    }
  ]
}
```

---

### 2. Get One Shelter by ID
Fetch full details for a single specific shelter.

* **URL:** `GET https://evacroute.app/api/shelters/:id`
* **Example:** `GET https://evacroute.app/api/shelters/12`

#### JSON Response:
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
    "floor_area_sqm": 850.0,
    "capacity": 500,
    "max_capacity": 500,
    "current_occupancy": 120,
    "available_capacity": 380,
    "occupancy_rate": 24.0,
    "status": "open"
  }
}
```

---

### 3. GeoJSON Map Layer (For Mapbox, Leaflet & Google Maps)
Returns a standard **RFC 7946 GeoJSON FeatureCollection**. You can plug this URL directly into your frontend map libraries.

* **URL:** `GET https://evacroute.app/api/shelters/map`
* **Browser / Tile URL:** `https://evacroute.app/api/shelters/map?api_key=PASTE_YOUR_GENERATED_API_KEY_HERE`

#### JSON Response:
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "title": "Evac_Route Zamboanga City Emergency Shelters",
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
        "floor_area_sqm": 850.0,
        "capacity": 500,
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

## 📊 Data Dictionary (What the fields mean)

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | number | Unique shelter database ID. |
| `name` | string | Full official name of the evacuation center. |
| `district` | string | `District I` (West Coast) or `District II` (East Coast). |
| `barangay` | string | Name of the barangay where the center is located. |
| `address` | string | Street address or landmark. |
| `latitude` | float | Decimal GPS latitude (e.g. `6.91894`). |
| `longitude` | float | Decimal GPS longitude (e.g. `122.08621`). |
| `coordinates` | array | Standard GIS order `[longitude, latitude]` for mapping libraries. |
| `floor_area_sqm` | float | Total usable shelter ground area in square meters. |
| `capacity` | number | Maximum number of evacuees this center can safely hold. |
| `current_occupancy`| number | Number of verified evacuees currently staying inside. |
| `available_capacity`| number | Remaining available slots (`capacity - current_occupancy`). |
| `occupancy_rate` | float | Percentage of occupancy (e.g. `24.0` for 24%). |
| `status` | string | `open` (accepting evacuees), `full`, `standby`, or `closed`. |
| `marker_color` | string | Recommended hex marker color (`#10B981` green, `#F59E0B` amber, `#EF4444` red). |

---

## 💻 Copy & Paste Code Examples

### 1. JavaScript / React (Fetch API)
```javascript
const API_KEY = 'PASTE_YOUR_GENERATED_API_KEY_HERE';

async function getShelters() {
  try {
    const res = await fetch('https://evacroute.app/api/shelters?district=I&status=open', {
      headers: {
        'X-API-KEY': API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Error: ${res.status} - Key may be invalid or expired`);
    }

    const data = await res.json();
    console.log(`Loaded ${data.total} shelters:`, data.data);
    return data.data;
  } catch (err) {
    console.error("Failed to load shelters:", err);
  }
}

// Call the function
getShelters();
```

### 2. Python (requests)
```python
import requests

API_KEY = "PASTE_YOUR_GENERATED_API_KEY_HERE"
url = "https://evacroute.app/api/shelters"

headers = {
    "X-API-KEY": API_KEY,
    "Accept": "application/json"
}

params = {
    "district": "II",
    "status": "open"
}

response = requests.get(url, headers=headers, params=params)

if response.status_code == 200:
    data = response.json()
    print(f"Total Shelters: {data['total']}")
    for shelter in data["data"]:
        print(f"• {shelter['name']} | Vacancies: {shelter['available_capacity']} / {shelter['capacity']}")
else:
    print(f"Request failed ({response.status_code}):", response.text)
```

### 3. Leaflet.js Map Example
```javascript
const map = L.map('map').setView([6.9214, 122.0790], 12); // Zamboanga City

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// Load live shelter GeoJSON from Evac_Route
fetch('https://evacroute.app/api/shelters/map?api_key=PASTE_YOUR_GENERATED_API_KEY_HERE')
  .then(res => res.json())
  .then(geoJsonData => {
    L.geoJSON(geoJsonData, {
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(`
          <strong>${p.name}</strong><br/>
          Barangay: ${p.barangay} (${p.district})<br/>
          Capacity: ${p.current_occupancy} / ${p.capacity} evacuees<br/>
          Available Slots: <b>${p.available_capacity}</b>
        `);
      }
    }).addTo(map);
  });
```

---

## ⚠️ Troubleshooting & Common Errors

* **`401 Unauthorized`**: You did not pass the key, or the key string has a typo. Make sure your header is `X-API-KEY: your_key` or append `?api_key=your_key` to the URL.
* **`403 Forbidden`**: The key is deactivated or has expired. Ask the admin to toggle it back to active on the Admin Console.
* **CORS**: CORS is enabled on all `/api/shelters*` endpoints, so you can call it directly from localhost (`http://localhost:3000`, `http://localhost:5173`, etc.) without browser blocks.
