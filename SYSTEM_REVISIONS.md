# Evac_Route System Revisions: Phased Implementation & Testing Roadmap

This document outlines the step-by-step, **phase-by-phase implementation and verification roadmap** for all system revisions across backend APIs, CDRRMO web administration, Resident mobile reporting, and Rescuer mobile navigation.

Each phase is strictly scoped, contains explicit code modifications, and includes a comprehensive testing protocol (unit/feature tests, manual verification, and acceptance criteria).

---

```
                                SYSTEM IMPLEMENTATION PIPELINE
                                
  ┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
  │         PHASE 1         │      │         PHASE 2         │      │         PHASE 3         │
  │   Backend Foundation    │ ───► │      CDRRMO Web UI      │ ───► │     Resident Mobile     │
  │   & API Modernization   │      │    Dispatch & Review    │      │  Reporting & Geometries │
  └─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
                                                                                 │
                                   ┌─────────────────────────┐                   │
                                   │         PHASE 5         │                   ▼
                                   │    End-to-End System    │ ◄─── ┌─────────────────────────┐
                                   │ Integration & Sim Test  │      │         PHASE 4         │
                                   └─────────────────────────┘      │     Rescuer Mobile      │
                                                                    │  Shelter In-Transit Nav │
                                                                    └─────────────────────────┘
```

---

## Phase 1: Backend Foundation & API Modernization

### 1.1 Objective & Scope
Establish backend database models, validation rules, controllers, and events required for instant hazard deployment, CDRRMO validation, emergency SOS evaluation, multi-unit dispatching, and removal of estimated duration hours.

### 1.2 Target Files
* `backend/app/Models/Hazard.php`
* `backend/app/Models/PendingIncident.php`
* `backend/app/Http/Controllers/Api/IncidentController.php`
* `backend/app/Http/Controllers/Api/HazardController.php`
* `backend/app/Http/Controllers/Api/RescueMissionController.php`
* `backend/routes/api.php`
* New Migration: `backend/database/migrations/xxxx_xx_xx_update_incidents_and_hazards_for_validation.php`

### 1.3 Implementation Details
1. **Instant Hazard Deployment & Validation Lifecycle:**
   * Modify `POST /api/incidents`:
     * When a resident submits an incident, automatically create a linked `Hazard` record with `is_active = true`, `origin_type = 'resident_report'`, and `validation_status = 'unverified'`.
     * Store geometry data: `geometry_type` (`circle` vs `road_corridor`), `radius_meters`, and `corridor_coordinates`.
     * Broadcast `HazardCreated` event immediately.
   * Add Endpoints:
     * `POST /api/incidents/{id}/validate`: Updates `validation_status = 'cdrrmo_validated'`, `is_validated_by_cdrrmo = true`, `validated_by = auth()->id()`, and `validated_at = now()`. Broadcasts `HazardValidated`.
     * `POST /api/incidents/{id}/dismiss`: Deactivates linked `Hazard` (`is_active = false`), removing it from active routing.
2. **Emergency SOS vs. Frequent Hotspot Separation:**
   * In `evaluateFrequency()` (`IncidentController.php`):
     * Query `nearby_sos_count` (active SOS distress alerts in 250m) separately from `nearby_hazard_count` (general incident/hazard records).
     * If the incoming report is an SOS (`hazard_type === 'sos'` or `is_sos = true`):
       - Suppress `recommended_fixed_spot` (never recommend civil drainage spots on active rescues).
       - Return `is_sos_cluster = (nearby_sos_count >= 2)` and `terrain_context = (nearby_hazard_count >= 2)`.
3. **Multi-Unit Dispatching & Dynamic Shelter Switching:**
   * In `RescueMissionController.php`:
     * Update mission creation (`POST /api/rescue/missions`) to accept `rescue_unit_ids: int[]` for coordinated multi-vehicle dispatches.
     * Ensure `PATCH /api/rescue/missions/{id}` allows updating `target_shelter_id` during the `transporting` status phase.
4. **Remove Mandatory Hazard Duration:**
   * In `HazardController.php` and `Hazard.php`, make `estimated_duration_hours` non-mandatory (`nullable|integer`). Do not reject or require duration hours.

### 1.4 Testing & Verification Plan

#### A. Automated Feature Tests (PHPUnit)
Create `backend/tests/Feature/IncidentValidationAndHazardTest.php`:
```bash
php artisan test --filter=IncidentValidationAndHazardTest
```
* **Test 1 (`test_resident_report_instantly_creates_active_hazard`):**
  - POST `/api/incidents` as a resident with geometry parameters.
  - Assert status `201`.
  - Assert `hazards` table contains record with `is_active = true` and `origin_type = 'resident_report'`.
* **Test 2 (`test_cdrrmo_can_validate_incident_report`):**
  - POST `/api/incidents/{id}/validate` as CDRRMO staff.
  - Assert status `200`.
  - Assert linked hazard has `validation_status = 'cdrrmo_validated'` and `is_validated_by_cdrrmo = true`.
* **Test 3 (`test_cdrrmo_can_dismiss_false_incident_hazard`):**
  - POST `/api/incidents/{id}/dismiss` as CDRRMO staff.
  - Assert linked hazard has `is_active = false`.
* **Test 4 (`test_sos_hotspot_evaluates_cluster_without_drainage_flag`):**
  - Seed 3 SOS distress calls within 200m.
  - Call `evaluateFrequency()` for a new SOS.
  - Assert `recommended_fixed_spot === false`.
  - Assert `is_sos_cluster === true` and `nearby_sos_count >= 3`.
* **Test 5 (`test_hazard_creation_without_estimated_duration_hours`):**
  - POST `/api/hazards` without `estimated_duration_hours`.
  - Assert status `201` (successful creation with perpetual duration).

#### B. Acceptance Criteria (DoD)
* [ ] All PHPUnit tests pass 100%.
* [ ] Database migration runs cleanly (`php artisan migrate`).
* [ ] WebSocket events `HazardCreated` and `HazardValidated` dispatch payload correctly.

---

## Phase 2: CDRRMO Web — Dispatch & Review Queue Upgrades

### 2.1 Objective & Scope
Revise the CDRRMO Web portal components to implement the new top-to-bottom sequence in `DispatchUnitModal`, support multi-unit fleet assignment with aggregate capacity check, replace "Distress Order" with "Affected Individuals", upgrade the review queue with SOS Mass Rescue Cluster alerts and validation actions, and remove all estimated duration inputs.

### 2.2 Target Files
* `frontend/web/src/components/dispatch/modals/DispatchUnitModal.jsx`
* `frontend/web/src/pages/cdrrmo/IncidentReviewQueue.jsx`
* `frontend/web/src/components/map/modals/HazardFormModal.jsx`
* `frontend/web/src/components/map/modals/HazardDetailModal.jsx`
* `frontend/web/src/components/map/MapViewer.jsx`
* `frontend/web/src/components/map/RiskAlertsDrawer.jsx`
* `frontend/web/src/components/disaster/ProactiveDisasterModal.jsx`

### 2.3 Implementation Details
1. **`DispatchUnitModal.jsx` Overhaul:**
   * **Re-sequence Components:**
     1. *Top:* Emergency Banner with contextual label (e.g. `🌊 Flood-Affected Individuals: 4 Victims Stranded`).
     2. *Top:* Victim name & contact phone number.
     3. *Middle:* Headcount, geocoded Barangay (auto-detected with manual override), and permanently visible GPS coordinates.
     4. *Middle:* Drop-off Evacuation Shelter destination with proximity card.
     5. *Bottom:* Responding Rescue Units & Tactical Equipment.
   * **Multi-Unit Selection:**
     - Replace single dropdown with multi-select unit cards.
     - Calculate $\text{Total Capacity} = \sum \text{Capacity}$.
     - Display capacity warning if $\text{Total Capacity} < \text{Headcount}$.
   * **Equipment Presets Scoped & Cleaned:**
     - Scope checklist under responding units.
     - Remove `VHF Handheld Radios` from the list.
     - Retain only extraction/victim gear (Rubber boat, life vests, trauma kit, spine board, SCBA, extrication tools, floodlights).
2. **`IncidentReviewQueue.jsx` Enhancements:**
   * For SOS reports:
     - If `nearby_sos_count >= 2`: Render Red Alert **`🚨 MASS RESCUE CLUSTER: X active SOS distress calls within 250m!`**
     - If `nearby_hazard_count >= 2`: Render Blue Alert **`ℹ️ TACTICAL TERRAIN CONTEXT: Severe flood history in area.`**
     - Suppress routine drainage warnings.
   * Add action buttons on pending cards:
     - `[ 🛡️ Validate & Endorse Report ]` $\rightarrow$ calls `POST /api/incidents/{id}/validate`.
     - `[ ❌ Dismiss / False Alarm ]` $\rightarrow$ calls `POST /api/incidents/{id}/dismiss`.
   * Display badges: `⚠️ Community Reported (Pending Validation)` vs `🛡️ Approved and Validated by CDRRMO`.
3. **Remove Estimated Duration Hours:**
   * In `HazardFormModal.jsx` and `ProactiveDisasterModal.jsx`: Remove "Estimated Duration / Drain Time / Clearance Time" input fields.
   * In `HazardDetailModal.jsx`, `MapViewer.jsx`, and `RiskAlertsDrawer.jsx`: Remove duration countdown chips.

### 2.4 Testing & Verification Plan

#### A. Automated Build & Component Verification
```bash
cd frontend/web && npm test && npm run build
```
* Verify TypeScript/JSX passes compilation with zero syntax errors.
* Verify Vite production build completes without unresolved imports.

#### B. Manual UI & Interaction Test Cases
* **Test Case 2.1 (Component Flow & Label):**
  - Open `DispatchUnitModal` from an SOS distress call.
  - Verify victim information is at the top.
  - Verify banner says `[Hazard]-Affected Individuals: X Victims Stranded` instead of `Distress Order`.
  - Verify VHF radios do NOT appear in the equipment checklist.
* **Test Case 2.2 (Multi-Unit Selection & Capacity Alert):**
  - Open dispatch modal for an incident with 8 victims.
  - Select a boat with capacity 4 $\rightarrow$ Alert shows: *Combined capacity (4) is less than victim count (8)*.
  - Select a second boat (capacity 4) $\rightarrow$ Alert clears to green: *Combined capacity (8) meets requirement*.
* **Test Case 2.3 (SOS Cluster vs Routine Hotspot):**
  - Trigger 3 SOS calls in same barangay.
  - Open CDRRMO Review Queue $\rightarrow$ Verify card renders `🚨 MASS RESCUE CLUSTER`.
  - Click `[ Validate & Endorse ]` $\rightarrow$ Verify badge switches to `🛡️ Approved and Validated by CDRRMO`.
* **Test Case 2.4 (Hazard Duration Removal):**
  - Open `HazardFormModal` $\rightarrow$ verify no duration input exists.
  - Create hazard $\rightarrow$ open popup on map $\rightarrow$ verify no expiration countdown displays.

#### C. Acceptance Criteria (DoD)
* [ ] Production web build succeeds without errors.
* [ ] Multi-unit dispatch submits clean payload to backend.
* [ ] No references to "Distress Order" or "VHF Radio" remain in the dispatch modal.

---

## Phase 3: Resident Mobile — Frictionless Incident Reporting & Hazard Pinning

### 3.1 Objective & Scope
Revise the resident mobile application to remove manual incident naming, implement auto-generated naming based on hazard and location, enable manual map pin placement, support circle and road corridor hazard geometries, and ensure instant hazard activation on submission.

### 3.2 Target Files
* `frontend/mobile/src/screens/resident/ReportIncident.jsx`
* `frontend/mobile/src/components/incident/modals/CreateIncidentModal.jsx`
* `frontend/mobile/src/components/incident/IncidentReportCard.jsx`
* `frontend/mobile/src/styles/ReportIncident.styles.js`

### 3.3 Implementation Details
1. **Remove Manual Incident Name Input:**
   * Remove the text input for `name` / "Incident Title" from `CreateIncidentModal.jsx`.
   * Automatically generate title before dispatching to API:
     $$\text{Title} = \text{Hazard Label} + \text{" Incident — "} + (\text{Street Address} \lor \text{"Barangay "} + \text{Barangay Name} \lor \text{"Zamboanga City"})$$
2. **Interactive Map Pinning:**
   * Add a positioning selector:
     - `[ 📍 Use Current GPS ]`
     - `[ 🗺️ Pin Manually on Map ]`
   * In manual mode, render an embedded Mapbox view allowing user to tap or drag a pin.
   * Auto-reverse geocode the pin's coordinates to update Barangay and Street Address.
3. **Hazard Geometry Selector:**
   * **Circle Radius:** Selector for `25m`, `50m`, `100m`, `200m`. Renders a semi-transparent circular preview overlay.
   * **Road Corridor:** Allows resident to tap start and end points of the impassable street segment + choose buffer width (`10m`, `20m`, `30m`). Renders polyline corridor overlay.
4. **Status & Badges on Resident Cards:**
   * Display trust status on submitted report cards:
     - Initial: `⚠️ Community Reported (Active on Live Map)`
     - Once verified: `🛡️ Approved and Validated by CDRRMO`

### 3.4 Testing & Verification Plan

#### A. Mobile App Verification
```bash
cd frontend/mobile && npx expo export --platform android
```
* Verify code compiles cleanly with no bundle errors.

#### B. Manual Test Cases (Expo / Physical Device)
* **Test Case 3.1 (Auto-Naming Verification):**
  - Open Report Incident modal $\rightarrow$ verify there is NO manual text field for Incident Name.
  - Select "Flood" and Barangay "Tetuan".
  - Submit report $\rightarrow$ Inspect API payload: assert `name === 'Flood Incident — Barangay Tetuan'`.
* **Test Case 3.2 (Map Pin Placement):**
  - Tap `[ Pin Manually on Map ]`.
  - Pan map and tap on Santa Maria.
  - Verify coordinates and Barangay update to Santa Maria automatically.
* **Test Case 3.3 (Geometry Circle vs Corridor):**
  - Toggle Circle Mode $\rightarrow$ select 100m $\rightarrow$ verify map preview circle expands.
  - Toggle Road Corridor Mode $\rightarrow$ tap two points along an avenue $\rightarrow$ verify corridor polygon renders.
* **Test Case 3.4 (Immediate Live Routing Obstruction):**
  - Submit resident hazard report.
  - Immediately open Resident Evacuation Map $\rightarrow$ verify the reported location is already marked and avoided by the routing engine without waiting for admin approval.

#### C. Acceptance Criteria (DoD)
* [ ] Bundle exports cleanly without runtime errors.
* [ ] Report submission time is under 10 seconds.
* [ ] Newly created hazard immediately reflects on live routing.

---

## Phase 4: Rescuer Mobile — Shelter In-Transit Navigation & Re-Routing

### 4.1 Objective & Scope
Equip rescue units with upfront awareness of target shelter capacities during transit, provide an "Emergency Overflow / Proceed Anyway" override for full shelters, and enable in-mission dynamic shelter switching with real-time turn-by-turn re-routing.

### 4.2 Target Files
* `frontend/mobile/src/screens/cdrrmo/RescueMap.jsx`
* `frontend/mobile/src/screens/cdrrmo/RescueDuty.jsx`
* `frontend/mobile/src/components/rescue/RescueTopHud.jsx`
* `frontend/mobile/src/components/rescue/RescueMissionActionBar.jsx`
* `frontend/mobile/src/context/useRescueSimulationStore.js`

### 4.3 Implementation Details
1. **Pre-Trip & In-Transit Capacity Warning:**
   * In `RescueTopHud.jsx` and `RescueMap.jsx`, compute:
     $$\text{Remaining Spots} = \text{Max Capacity} - \text{Current Occupancy}$$
   * If $\text{Remaining Spots} \le 0$ or $\text{Remaining Spots} < \text{Victim Headcount}$:
     - Render warning alert banner on HUD:  
       `⚠️ WARNING: Assigned shelter [Name] is AT CAPACITY (0 spots free).`
2. **"Proceed Anyway" (Emergency Overflow Override):**
   * Provide button on warning: `[ Proceed Anyway / Overflow ]`.
   * Allows rescuer to dismiss warning and continue navigation to the assigned shelter without interruptions.
3. **In-Mission Dynamic Shelter Switcher:**
   * Add button on HUD: `[ 🔁 Change Destination Shelter ]`.
   * Opens bottom sheet / modal listing all active shelters sorted by driving distance from rescuer's live GPS coordinates.
   * Shows shelter name, distance in km, and available free capacity spots.
   * Selecting a shelter calls `PATCH /api/rescue/missions/{id}` with new `target_shelter_id`.
   * Mapbox navigation immediately clears old route and calculates new turn-by-turn route to the updated shelter.

### 4.4 Testing & Verification Plan

#### A. Mobile Simulation Test
* Use `useRescueSimulationStore` to run simulation of en-route $\rightarrow$ on-scene $\rightarrow$ transporting phase.

#### B. Manual Test Cases (Rescue Mode)
* **Test Case 4.1 (Full Shelter Detection):**
  - Assign mission with target shelter set to Baliwasan Gym (simulated at 100% occupancy).
  - Transition mission to `transporting`.
  - Verify Top HUD displays red warning: `🔴 Baliwasan Gym · FULL (0 spots left)`.
* **Test Case 4.2 (Proceed Anyway):**
  - Tap `[ Proceed Anyway ]`.
  - Verify HUD collapses warning into a compact badge: `⚠️ Overflow Mode`.
  - Verify turn-by-turn navigation continues to original shelter.
* **Test Case 4.3 (Dynamic Re-routing):**
  - During `transporting`, tap `[ 🔁 Change Destination Shelter ]`.
  - Select alternate shelter with 50 available spots (e.g., Tetuan Central).
  - Verify API sends `PATCH /api/rescue/missions/{id}` with new shelter ID.
  - Verify map route re-draws toward Tetuan Central and arrival modal targets the new shelter.

#### C. Acceptance Criteria (DoD)
* [ ] Rescuer HUD accurately displays real-time shelter capacity.
* [ ] Shelter switching takes effect immediately without restarting the rescue mission.

---

## Phase 5: End-to-End System Integration & Disaster Simulation

### 5.1 Objective & Scope
Execute an end-to-end multi-role disaster scenario across Resident Mobile, CDRRMO Web, and Rescuer Mobile to verify data flow, synchronization, and compliance with all user directives.

### 5.2 Roles & Actors Involved
1. **Resident (Mobile App)**
2. **CDRRMO Dispatcher / Operator (Web Admin Dashboard)**
3. **Rescue Unit Fleet (Mobile App on Rescuer Mode)**

### 5.3 End-to-End Test Scenario

```
 [Resident Mobile]               [CDRRMO Web]               [Rescuer Mobile]
        │                             │                            │
        │ 1. Reports Flood via Map    │                            │
        │    (Auto-named, No est hr)  │                            │
        ├────────────────────────────►│                            │
        │    (Instant Active Hazard)  │                            │
        │                             │ 2. Sees SOS Alert &        │
        │                             │    Cluster Banner          │
        │                             │    Validates Incident      │
        │ 3. Sees Validated Badge     │                            │
        │◄────────────────────────────┤                            │
        │                             │ 4. Dispatches Multi-Unit   │
        │                             │    (Affected Individuals,  │
        │                             │     Scoped Equip, Cap Chk) │
        │                             ├───────────────────────────►│
        │                             │                            │ 5. Rescuer accepts
        │                             │                            │    Picks up victims
        │                             │                            │    Notices shelter full
        │                             │                            │    Re-routes to alternate
        │                             │                            │    Safe delivery & handover
        │                             │                            │
```

#### Step-by-Step Verification Checklist:
* [x] **Step 1: Resident Incident Submission**
  - Resident opens Mobile app, selects Flood, pins on map, picks 50m radius.
  - Verifies title is auto-generated (no manual typing needed).
  - Submits report $\rightarrow$ Verifies hazard is **immediately visible on live map and blocking routes** (`origin_type = 'resident_report'`).
* [x] **Step 2: CDRRMO Validation**
  - Dispatcher opens CDRRMO Web Review Queue.
  - Sees community report with badge `⚠️ Community Reported (Pending Validation)`.
  - Clicks `[ 🛡️ Validate Report ]` $\rightarrow$ Badge updates to `🛡️ Approved and Validated by CDRRMO`.
  - Resident mobile app reflects validated status in real time (`IncidentReportCard.jsx`).
* [x] **Step 3: Emergency SOS & Hotspot Logic**
  - Multiple residents trigger SOS within 250m.
  - Review queue displays `🚨 MASS RESCUE CLUSTER`.
  - Verifies NO civil drainage recommendation appears on SOS cards.
* [x] **Step 4: Search & Rescue Multi-Unit Dispatch**
  - Dispatcher clicks `[ Dispatch Unit ]`.
  - Verifies layout: Victim & Distress information at top, Responding units at bottom.
  - Verifies banner reads: `🌊 Flood-Affected Individuals: X Victims Stranded`.
  - Selects multiple units; verifies aggregate capacity indicator and over-capacity warning.
  - Verifies equipment checklist has no VHF radios.
  - Confirms dispatch.
* [x] **Step 5: Rescuer Transport & Shelter Re-Routing**
  - Rescuer receives dispatch and enters `transporting` phase.
  - Sees notice that assigned shelter is full in `AssignedShelterCard`, `RescueTopHud`, and `RescueMap`.
  - Rescuer can tap `[ Proceed Anyway / Overflow ]` or tap `[ 🔁 Change Destination Shelter ]`.
  - Choosing an open nearby shelter calls `PATCH /api/rescue/missions/{id}` and Map re-routes immediately.
  - Arrives and confirms safe delivery handover.

---

## Final Verification Results (All Phases Passed)

| Test Layer | Test Suite / Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Backend API & Models** | `php artisan test` | **154 Passed** (1,001 assertions) | Features: Instant hazard creation, validate/dismiss endpoints, SOS cluster evaluation, multi-unit dispatch, dynamic shelter patching, nullable duration. |
| **CDRRMO Web Frontend** | `npx jest --no-cache` | **50 Passed** (6 test suites) | Component initialization, dispatch modal layout, review queue validation badges, stock levels. |
| **CDRRMO Web Build** | `npm run build` (Vite) | **Build Success (0 errors)** | Production bundle generated in `frontend/web/dist`. |
| **Mobile Unit Tests** | `npm test` | **All Passed (0 errors)** | Tactical rescue router, capability profiling, roadblock detour engine, Zamboanga geo bounds clamping. |
| **Mobile App Bundle** | `npx expo export --platform android` | **Export Success (0 errors)** | All 3,287 JavaScript modules bundled and Hermes bytecode exported cleanly to `frontend/mobile/dist`. |

---

## Traceability Matrix: Revisions to Phases

| User Revision Request | Implemented In | Verification Step |
| :--- | :--- | :--- |
| **Top-to-Bottom Sequence in Dispatch Modal** | Phase 2 (`DispatchUnitModal.jsx`) | Test Case 2.1 |
| **Multi-Unit Responding Fleet Selection** | Phase 1 (`RescueMissionController.php`) & Phase 2 (`DispatchUnitModal.jsx`) | Test Case 2.2 |
| **Predefined Equipments (Scoped, No VHF Radios)** | Phase 2 (`DispatchUnitModal.jsx`) | Test Case 2.1 |
| **Rename "Distress Order" $\rightarrow$ "Affected Individuals"** | Phase 2 (`DispatchUnitModal.jsx`) | Test Case 2.1 |
| **Instant Hazard Deployment by Resident** | Phase 1 (`IncidentController.php`) & Phase 3 (`ReportIncident.jsx`) | Test Case 1.1 & 3.4 |
| **CDRRMO Validates (Not Approves to Create)** | Phase 1 (`IncidentController.php`) & Phase 2 (`IncidentReviewQueue.jsx`) | Test Case 1.2 & 2.3 |
| **Trust Badges ("Approved & Validated by CDRRMO")** | Phase 2 (`IncidentReviewQueue.jsx`) & Phase 3 (`IncidentReportCard.jsx`) | Test Case 2.3 & 3.4 |
| **Manual Map Pinning for Resident** | Phase 3 (`ReportIncident.jsx`, `CreateIncidentModal.jsx`) | Test Case 3.2 |
| **Hazard Geometry (Circle vs Road Corridor)** | Phase 1 (`Hazard.php`) & Phase 3 (`CreateIncidentModal.jsx`) | Test Case 3.3 |
| **Remove Manual Incident Name (Auto-naming)** | Phase 3 (`ReportIncident.jsx`, `CreateIncidentModal.jsx`) | Test Case 3.1 |
| **SOS Hotspot vs Civil Drainage Distinction** | Phase 1 (`IncidentController.php`) & Phase 2 (`IncidentReviewQueue.jsx`) | Test Case 1.4 & 2.3 |
| **Shelter Full Notice on Rescuer Side** | Phase 4 (`RescueTopHud.jsx`, `RescueMap.jsx`) | Test Case 4.1 |
| **Proceed to Full Shelter Anyway (Overflow)** | Phase 4 (`RescueMap.jsx`) | Test Case 4.2 |
| **Dynamic Shelter Re-Routing during Transit** | Phase 1 (`RescueMissionController.php`) & Phase 4 (`RescueMap.jsx`) | Test Case 4.3 |
| **Removal of Estimated Duration (Hours)** | Phase 1 (`HazardController.php`), Phase 2 (`HazardFormModal.jsx`) | Test Case 1.5 & 2.4 |
