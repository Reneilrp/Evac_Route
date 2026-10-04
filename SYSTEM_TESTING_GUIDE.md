# EVAC-ROUTE: Complete System Testing Guide & Credentials Manual

This manual provides the step-by-step procedure to run and test the **EVAC-ROUTE** platform across the Laravel Backend API, Reverb WebSocket engine, React Web Command Suite, and Expo Mobile Application.

---

## 1. System Architecture & Startup Procedure

To test all real-time broadcasts and live sync features, run the services across **4 separate terminal windows**:

```
[Terminal 1: Laravel API]       --> http://localhost:8000
[Terminal 2: Reverb WebSockets]  --> ws://localhost:8080
[Terminal 3: React Web Admin]   --> http://localhost:5173
[Terminal 4: Expo Mobile App]   --> Metro Bundler (Port 8081 / Expo Go)
```

### Step-by-Step Terminal Commands

#### Terminal 1: Laravel REST API
```bash
cd /home/pheinz/Evac_Route/backend
php artisan serve --host=0.0.0.0 --port=8000
```
> [!NOTE]
> Ensure the database is seeded. If you need a clean reset at any time, run: `php artisan migrate:fresh --seed`.

#### Terminal 2: Laravel Reverb (Real-Time WebSockets)
```bash
cd /home/pheinz/Evac_Route/backend
php artisan reverb:start --host=0.0.0.0 --port=8080
```
*Handles real-time hazard alerts, dynamic shelter capacity changes, and instant rescue dispatch updates.*

#### Terminal 3: Web Command Suite (React + Vite)
```bash
cd /home/pheinz/Evac_Route/frontend/Evac_RouteWeb
npm run dev
```
*Open your browser at **`http://localhost:5173`**.*

#### Terminal 4: Mobile Application (Expo / React Native)
```bash
cd /home/pheinz/Evac_Route/frontend/Evac_RouteMobile
npx expo start
```
* **Android Emulator:** Press `a` in the terminal.
* **iOS Simulator:** Press `i` in the terminal.
* **Physical Smartphone:** Open the **Expo Go** app (Android/iOS) and scan the displayed QR code (phone and computer must be on the same Wi-Fi).

---

## 2. Master User Credentials Table

All pre-seeded test accounts use the common default password: **`password`**

| Role / Authority | Official Email | Password | Primary Interface | Core Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **CDRRMO Administrator** | `drrm@lgu.gov.ph` | `password` | **Web Command Dashboard** | Tactical map pinning, road closures, emergency broadcasts, and SOS distress triage. |
| **CSWDO Logistics Chief** | `logistics@lgu.gov.ph` | `password` | **Web Logistics Suite** | Warehouse stock management, dynamic ration templates, and printable relief manifests. |
| **DRRM Rescue Unit (Alpha)** | `rescue1@lgu.gov.ph` | `password` | **Mobile App (Staff Mode)** & Web Dispatch | Receives mission assignments, navigates to victims, steps through operational lifecycle (`en_route` $\rightarrow$ `on_scene` $\rightarrow$ `transporting` $\rightarrow$ `completed`). |
| **Shelter Intake Staff** | `scanner1@lgu.gov.ph` | `password` | **Mobile App (Staff Mode)** | Offline camera QR scanning, resident check-ins, and automated ration claiming. |
| **Primary Resident** | `pheinz@evacroute.local` | `password` | **Mobile App (Resident Mode)** | Offline digital QR ID, family headcount (4), A\* dynamic evacuation pathfinding, SOS distress beacon. |
| **Tetuan Evacuee** | `resident_tetuan_1@evacroute.local` | `password` | **Mobile App (Resident Mode)** | Registered evacuee account in Barangay Tetuan. |

> [!TIP]
> **One-Click Quick Login:**
> * **On Web (`AdminLogin.jsx`):** Click the bottom role chips (`🛡️ CDRRMO`, `📦 CSWDO`, or `🚤 Rescue`) to autofill credentials and jump directly to your section.
> * **On Mobile (`LoginScreen.jsx`):** Tap *"LGU Staff Portal Sign In"*, then tap the quick chips (`📋 Scanner` or `🚤 Rescue QRT`) to instantly populate credentials.

---

## 3. Pre-Configured Rescue Fleet Assets

The system is pre-seeded with 3 specialized emergency rescue units ready for deployment:

| Unit Call Sign | Vehicle / Fleet Name | Type | Assigned Operator | Capacity | Standby Location |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`BOAT-ALPHA`** | Zamboanga Rescue Boat Alpha | Water Rescue Boat | `rescue1@lgu.gov.ph` | 8 Persons | Zone 3 (Lat: 6.9155, Lng: 122.0790) |
| **`MEDIC-1`** | Zamboanga Medic Ambulance 01 | Medical Ambulance | `rescue1@lgu.gov.ph` | 4 Persons | Zone 4 (Lat: 6.9210, Lng: 122.0750) |
| **`DELTA-3`** | QRT 4x4 Heavy Rescue Truck 03 | High-Clearance Truck | `rescue1@lgu.gov.ph` | 15 Persons | Zone 1 (Lat: 6.9140, Lng: 122.0810) |

---

## 4. End-to-End Testing Scenarios

### Scenario A: CDRRMO Tactical Command & Rescue Dispatch
1. Open Web: `http://localhost:5173`.
2. Log in with **`drrm@lgu.gov.ph`** / `password`.
3. Go to **Rescue Dispatch** (`/admin/rescue-dispatch`):
   - View the **Fleet Status Board** (`BOAT-ALPHA`, `MEDIC-1`, `DELTA-3`).
   - View the **Active Citizen Distress Queue (SOS Calls)**.
   - Click **"Deploy Unit"** to assign an available fleet asset (e.g. `BOAT-ALPHA`) to a trapped victim.
   - The mission immediately broadcasts via WebSockets to field responders!

---

### Scenario B: CSWDO Relief Logistics & Printable Manifest
1. Open Web: `http://localhost:5173`.
2. Log in with **`logistics@lgu.gov.ph`** / `password`.
3. Notice the navigation bar: You are placed directly in the **CSWDO Logistics Suite** (`/admin/inventory`).
4. **Test Dynamic Calculation:**
   - Go to **Relief Distribution** (`/admin/relief-distribution`).
   - Select an active shelter (e.g., *Tetuan Covered Court*).
   - See total headcounts automatically multiplied by the active Ration Template (Rice, Canned Goods, Water).
   - See the automated **+20% Emergency Contingency Buffer**.
5. **Test Printable Manifest:**
   - Click **"Print Dispatch Order"**.
   - A clean, print-formatted physical transfer manifest opens with signature lines for Warehouse Custodian and Transporter.

---

### Scenario C: Mobile Citizen Evacuation & SOS Distress Beacon
1. Open Mobile App on your emulator/device.
2. Tap *"I ALREADY REGISTERED"* $\rightarrow$ Sign in with **`pheinz@evacroute.local`** / `password`.
3. **Test Offline QR ID:**
   - Navigate to the **Digital ID** tab to view your cached household QR code.
4. **Test Dynamic A\* Safe Path:**
   - Navigate to the **Map** tab.
   - View calculated route trajectories safely avoiding active flood and siege hazard zones.
5. **Test Citizen Emergency SOS:**
   - Navigate to the **Report Incident** screen.
   - Tap the red banner: **"EMERGENCY RESCUE SOS - TRAPPED CITIZEN BEACON"**.
   - Confirm headcount (e.g., 4) and submit.
   - Instant distress beacon is created and broadcast to the CDRRMO Web console!

---

### Scenario D: DRRM Field Responder Duty & Automated Shelter Intake
1. On the Mobile App, log out or switch to *"LGU Staff Portal Sign In"*.
2. Log in with **`rescue1@lgu.gov.ph`** / `password`.
3. You will enter the **Rescue Duty Portal** (`RescueDutyScreen`):
   - Review your assigned unit (`BOAT-ALPHA`).
   - View assigned distress mission, victim coordinates, and situation report.
   - Tap **"Call Citizen"** to test native dialer integration.
   - Tap **"Navigate to Scene"** to launch turn-by-turn navigation.
4. **Step Through the Mission Lifecycle:**
   - Tap `1. ACCEPT & EN ROUTE` (Status updates to `en_route`).
   - Tap `2. ARRIVED ON SCENE` (Status updates to `on_scene`).
   - Tap `3. VICTIMS SECURED ➔ TO SHELTER` (Status updates to `transporting`).
   - Tap `4. MISSION COMPLETED (TURNOVER)`.
5. **Verify the Rescue-to-Shelter Bridge:**
   - The victim's headcount is automatically added to the target shelter's current occupancy!
   - An `EvacuationLog` record is automatically generated for CSWDO auditing.

---

### Scenario E: Shelter Gate Offline QR Scanning
1. On the Mobile App, sign in to the Staff Portal with **`scanner1@lgu.gov.ph`** / `password`.
2. Open the **Scanner** tab (`ScanScreen`).
3. Aim the camera at the resident QR code (`pheinz@evacroute.local`'s Digital ID).
4. The scanner reads the offline payload, validates identity, registers arrival headcount, and marks relief rations as claimed.

---

### Scenario F: Rapid Shoreline Staging Handover (Water Rescue Fleet)
*Addresses the real-world operational reality where water rescue teams (e.g., `BOAT-ALPHA`) cannot navigate on dry city streets to reach school gyms.*

#### Mobile Rescuer Perspective:
1. Log in to Mobile Staff Portal as **`rescue1@lgu.gov.ph`** / `password`.
2. Advance an active water rescue mission until step 3 (`VICTIMS SECURED / TRANSPORTING`).
3. Under Mission Actions, notice two distinct handover options:
   - **`🏢 DIRECT TURNOVER AT SHELTER GATE`**: Used by land ambulances / 4x4 trucks arriving directly at an evacuation center gym.
   - **`🌊 UNLOAD AT SHORELINE STAGING`**: 1-Tap rapid handover for water rescue boats arriving at the flood edge / safe shoreline assembly point.
4. Tap **`🌊 UNLOAD AT SHORELINE STAGING`**:
   - A confirmation dialog appears reminding the operator that this logs the staging drop-off and immediately returns `BOAT-ALPHA` to **STANDBY**.
   - Confirm handover.
   - The mission is marked `staged_at_assembly`, the victims' headcount is logged to the assembly staging point, and the boat operator is **immediately returned to Standby** ready to accept the next critical water rescue dispatch!

#### Web Dispatcher Perspective (Radio Call-in):
1. Open Web: `http://localhost:5173/admin/rescue-dispatch`.
2. On any mission in `on_scene` or `transporting`, the dispatcher can click **`🌊 Shoreline Staging Handover`** or **`🌊 Unload at Staging Point`**.
3. A modal opens with the Water-to-Land Handover protocol, allowing the dispatcher to select the shoreline assembly point from field VHF radio reports.
4. Confirming immediately frees the boat on the live board and archives the mission in **Mission Logs** with `STAGED (HANDOVER)`.

---

### Scenario G: Automated Geofenced Resident Intake (No Gate Queues)
*Allows self-evacuating residents to be counted without creating dangerous physical choke points or queues at shelter gates.*

1. Open the Mobile App as resident: **`pheinz@evacroute.local`** / `password`.
2. Go to the **Map** tab (`EvacMapScreen`).
3. **Simulate Proximity to an Evacuation Center:**
   - On an emulator or device GPS spoofer, set your coordinates within **75 meters** of an active shelter (e.g., *Tetuan Covered Court* at Lat: `6.9214`, Lng: `122.0790`).
   - Within seconds, a high-contrast floating card appears at the bottom of the map:
     > **📍 Arrived at Tetuan Covered Court?**  
     > *Automatic intake detected within 75m of this evacuation center.*
4. **Confirm Intake:**
   - Tap **`CONFIRM CHECK-IN (4 HEADCOUNT)`**.
   - The app immediately registers the family at the shelter via `POST /api/shelters/{id}/geofence-checkin`.
   - The resident status changes to **SAFE** in the app header and database.
5. **Verify Live Operational Sync:**
   - Open Web: `http://localhost:5173/admin/shelters` and `/admin/evacuation-logs`.
   - The shelter occupancy increments immediately in real-time over WebSockets!
   - In **Evacuation Logs**, the entry is recorded with check-in method: **`GEOFENCE (SELF-ARRIVAL)`** with exact GPS coordinates.
