# Evac_Route System Revisions Specification

Comprehensive specification of all requested revisions for Search & Rescue Dispatch, Incident Reporting, Immediate Hazard Deployment, CDRRMO Validation, and Emergency SOS Hotspot Analysis.

---

## 1. Dispatch Search & Rescue Mission Modal Revisions
**Target Component:** `frontend/web/src/components/dispatch/modals/DispatchUnitModal.jsx`

### A. Component Re-sequencing (Top-to-Bottom Incident-First Flow)
The modal is reordered so dispatchers review complete victim and incident context before allocating fleet resources:
1. **Top Section — Victim & Distress Details:**
   - **Emergency SOS Origin Banner:**
     - Hazard type badge (🔥 Fire, 🚑 Medical, 🌊 Flood).
     - **Contextualized Label:** Replace the phrase `"Distress Order"` with hazard-specific **`Affected Individuals`** (e.g., *"Flood-Affected Individuals: 4 Victims Stranded"*, *"Fire-Affected Individuals: 2 Victims Stranded"*, or *"Medical-Affected Individuals: 1 Patient Stranded"*).
     - Special needs / modifiers (infant, elderly, medical, etc.).
   - **Victim / Family Details:** Full Name input and Contact Phone number.
   - **Headcount & Geocoded Barangay:** Total evacuees stranded and auto-geocoded Barangay (with manual override option).
   - **GPS Distress Coordinates:** Permanently visible Latitude and Longitude fields.
   - **Drop-off Evacuation Shelter:** Proximity-sorted shelter dropdown with smart nearest recommendation card showing distance (km) and available free capacity.
2. **Bottom Section — Responding Units & Tactical Equipment:**
   - Moved to the bottom of the modal, directly above the action buttons.

### B. Multi-Unit Responding Fleet Selection
* **Support Multiple Responding Units:** Replace single-unit dropdown (`unitId`) with multi-select chips/cards (`selectedUnitIds: []`).
* **Aggregate Fleet Capacity Indicator:**
  $$\text{Total Fleet Capacity} = \sum_{u \in \text{selected}} \text{Capacity}(u)$$
  A real-time indicator warns dispatchers if total selected capacity is insufficient for the victim headcount.
* **Unit Summary Badges:** Displays Call Sign, Responsible Officer, Hotline, and Status for each selected unit.

### C. Predefined Equipment Presets & Cleanup
* **Scoped Inside Responding Units Section:** Equipment checklist is embedded directly within the unit assignment block.
* **Remove Standard Vehicle / Crew Essentials:**
  - **Removed:** `VHF Handheld Radios` (Standard onboard equipment for all response teams; does not need to be displayed as a victim rescue item).
* **Retained Victim & Extraction Gear:**
  - 🚤 `rubber_boat`: Rubber Boat / Inflatable Raft
  - 🦺 `life_vests`: Life Vests & Ring Buoys
  - 🩹 `first_aid`: First Aid Trauma Kit & Splints
  - 🩺 `spine_board`: Spine Board & Cervical Collar
  - 🧯 `scba_gear`: SCBA / Fire Protective Gear
  - 🔧 `extrication_tools`: Hydraulic Extrication Cutters
  - 🔦 `floodlights`: Tactical Searchlights & Spotlights
* **Hazard-Based Auto-Selection:** Automatically pre-checks gear matching the hazard (e.g., Flood: *Rubber Boat, Life Vests, Trauma Kit*; Fire: *SCBA Gear, Extrication Cutters*; Medical: *Spine Board, Trauma Kit*).

---

## 2. Immediate Hazard Deployment & CDRRMO Validation
**Target Modules:**  
- Mobile: `frontend/mobile/src/screens/resident/ReportIncident.jsx` & `CreateIncidentModal.jsx`  
- Web: `frontend/web/src/pages/cdrrmo/IncidentManagement.jsx` & `IncidentReviewQueue.jsx`  
- Backend: `backend/app/Http/Controllers/Api/IncidentController.php` & `backend/app/Models/Hazard.php`

### A. Architectural Shift: Instant Activation
* **Current Bottleneck:** Reports remain `pending` and invisible until CDRRMO reviews and manually approves them. In rapidly escalating floods or fires, evacuees may be routed directly toward active dangers.
* **New Behavior:**
  - When a resident submits an incident report, the system **immediately activates it as a live Hazard** (`is_active = true`, `origin_type = 'resident_report'`).
  - The routing engine instantly detects the obstruction and recalculates safe evacuation routes around the hazard.
  - The event is broadcast via WebSockets/SSE to all connected mobile clients and CDRRMO consoles.

### B. CDRRMO Action Becomes "Validation"
* CDRRMO dispatchers no longer act as gatekeepers to create the hazard.
* Available CDRRMO actions:
  1. **Validate Report:** Confirms accuracy and promotes trust level.
  2. **Dismiss / Deactivate:** Clears false alarms or resolved incidents from the live routing layer.

### C. Trust & Verification Badges
* **Community Reported (Immediate):**  
  `⚠️ Community Reported — Awaiting CDRRMO Verification` (Amber border / dashed outline on map).
* **CDRRMO Validated:**  
  `🛡️ Approved and Validated by CDRRMO` (Solid emergency styling, official CDRRMO seal badge, validating officer and timestamp).
* **Dismissed:**  
  `❌ Dismissed (False Report / Resolved)` (Deactivated and removed from routing obstruction layer).

---

## 3. Interactive Map Pinning & Geometry Options for Residents
**Target Components:** `ReportIncident.jsx`, `CreateIncidentModal.jsx`, `IncidentController.php`

### A. Manual Map Pinning
* **Dual Positioning Modes:**
  1. **📍 Current GPS Location:** Instant one-tap device location.
  2. **🗺️ Pin Manually on Map:** Interactive map view allowing residents to drag/tap a pin to the exact epicenter (essential when reporting after reaching safety).
* **Auto-Reverse Geocoding:** Moving the pin dynamically updates Latitude, Longitude, and detects the parent Barangay.

### B. Hazard Geometry Selection (Circle vs. Road Path)
Residents can select how the hazard covers space:
* **Mode 1: Circle Radius (Point / Area Hazard)**
  - **Use Cases:** Building fires, localized sinkholes, landslides, localized ponding.
  - **Inputs:** Center pin + radius selector (`25m`, `50m`, `100m`, `250m`).
  - **Map Preview:** Renders an interactive semi-transparent circle overlay.
* **Mode 2: Road Path / Corridor Radius (Linear Street Obstruction)**
  - **Use Cases:** Flooded avenue stretch, fallen utility poles across a street, impassable road segment.
  - **Inputs:** Start pin and End pin along the road + buffer corridor width (`10m`, `20m`, `30m`).
  - **Map Preview:** Renders an impassable corridor polygon over the road segment.

### C. Remove Manual "Incident Name" Input (Auto-Generated Title)
* **Eliminate Text Input Field:**
  - Remove the manual text input for `name` / "Incident Title" in both `ReportIncident.jsx` and `CreateIncidentModal.jsx`.
  - Stressed residents during an evacuation should not be forced to invent and type a formal report name.
* **Smart Contextual Auto-Naming:**
  - The application automatically constructs the incident name based on the selected hazard type and detected/pinned location:
    $$\text{Incident Name} = \text{Hazard Type} + \text{" Incident — "} + (\text{Street Address or Barangay Name})$$
  - **Examples:**
    - Flood in Tetuan $\rightarrow$ `Flood Incident — Barangay Tetuan`
    - Building Fire in Sta. Maria $\rightarrow$ `Building Fire — Barangay Sta. Maria`
    - Road Obstruction on MCLL Hwy $\rightarrow$ `Road Obstruction — MCLL Highway, Guiwan`
* **Zero Cognitive Friction:** Reduces time-to-report from ~45 seconds down to under 10 seconds.

---

## 4. Emergency SOS vs. Frequent Hotspot Evaluation
**Target Components:** `backend/app/Http/Controllers/Api/IncidentController.php` & `frontend/web/src/pages/cdrrmo/IncidentReviewQueue.jsx`

### A. The Conflict
* An **Emergency SOS** is an acute, life-threatening search-and-rescue distress call from trapped individuals.
* Currently, `evaluateFrequency()` evaluates all reports with identical logic, causing incoming Emergency SOS cards to display:
  > `⚠️ FREQUENT INCIDENT HOTSPOT: 4 report(s) in this 250m area (4 for flood). High recurrence area.`
  > *(With automated recommendation: "Recommend Fixed Flood Spot" for civil drainage).*
* This creates severe operational confusion by framing an urgent rescue mission as a routine drainage complaint.

### B. Revisions to Frequency & Hotspot Logic
1. **Differentiate Metrics in Backend (`IncidentController.php`):**
   - Split spatial recurrence queries into:
     - `nearby_sos_count`: Active life-safety distress calls in the 250m radius.
     - `nearby_hazard_count`: General historical hazard reports in the 250m radius.
   - For all Emergency SOS reports, automatically set `recommended_fixed_spot = false` and suppress civil engineering drainage tags.
2. **Context-Aware Display on CDRRMO Review Queue (`IncidentReviewQueue.jsx`):**
   * **Cluster of Multiple SOS Calls (`nearby_sos_count >= 2`):**
     - Elevate to a prominent **Red Tactical Mass Rescue Alert**:
       > **🚨 MASS RESCUE CLUSTER:** 4 active SOS distress calls within 250m! Multiple trapped households in this vicinity. Coordinated multi-unit dispatch required.
   * **Single SOS in a Historical Hazard Zone (`nearby_hazard_count >= 2`):**
     - Reframe as **Tactical Rescue Terrain Context** for dispatchers:
       > **ℹ️ TACTICAL TERRAIN CONTEXT:** Area has severe flood history (4 prior reports). High-clearance rescue vehicle or rubber boat recommended.
   * **Routine Hazard Reports (Non-SOS):**
     - Retain standard amber hotspot badge for chronic drainage and recurring road hazard analysis.

---

## 5. Rescue Unit Shelter Capacity Awareness & Dynamic Re-Routing
**Target Components:**  
- Mobile: `frontend/mobile/src/screens/cdrrmo/RescueMap.jsx` & `frontend/mobile/src/screens/cdrrmo/RescueDuty.jsx`  
- Mobile Components: `frontend/mobile/src/components/rescue/RescueTopHud.jsx` & `RescueMissionActionBar.jsx`  
- Backend API: `backend/app/Http/Controllers/Api/RescueMissionController.php`

### A. Pre-Trip & In-Transit Full Capacity Notice
* **Real-Time Capacity Indicator on HUD:**
  * When a rescue mission is accepted or enters the `transporting` phase (heading to shelter with rescued evacuees), the top HUD and mission cards display the target shelter's current occupancy:
    - Normal (<80%): `🟢 [Shelter Name] · 65% Full (35 spots left)`
    - Near Capacity (80%–99%): `🟡 [Shelter Name] · 88% Full (6 spots left)`
    - **At Full Capacity (100%):** `🔴 [Shelter Name] · FULL (0 spots left / Over Capacity)`
* **Proactive Full Shelter Alert:**
  * If the assigned shelter has insufficient capacity for the current victim headcount, display an amber/red tactical warning:
    > `⚠️ WARNING: Destination shelter is at maximum capacity (0 spots available). Consider re-routing to an alternative open center.`

### B. "Proceed to Shelter Anyway" Option (Emergency Overflow Override)
* **Operational Need:**
  * The rescue unit must **not** be blocked or prevented from delivering evacuees to a full shelter if field circumstances dictate (e.g., ground triage, outdoor staging tents, nearby medical tents, or command order).
* **UI Action:**
  * Provide an explicit action button: `[ Proceed Anyway / Emergency Overflow ]`.
  * The navigation and handover workflow continue normally, marking the arrival as an authorized overflow arrival.

### C. In-Mission Shelter Re-Routing ("Change Destination Shelter")
* **One-Tap Shelter Switcher:**
  * Add a `[ 🔁 Change Destination Shelter ]` button directly on the Rescue Map Top HUD and Rescue Duty action panel.
* **Proximity-Sorted Alternative Modal:**
  * Displays open shelters sorted by driving distance from the rescue vehicle's current live GPS coordinates.
  * For each alternative shelter:
    - Shelter Name & Barangay
    - Distance in km & estimated transit time
    - Free capacity badge (e.g., `48 spots available`)
* **Instant Dynamic Route Recalculation:**
  * Selecting a new shelter sends `PATCH /rescue/missions/{id}` with the updated `target_shelter_id`.
  * The Mapbox navigation engine immediately drops the old route line and automatically computes turn-by-turn routing to the newly chosen shelter without restarting the mission.

---

## 6. Removal of Hazard Estimated Duration (Hours)
**Target Components:**  
- Web Creation & Edit: `frontend/web/src/components/map/modals/HazardFormModal.jsx` & `frontend/web/src/components/disaster/ProactiveDisasterModal.jsx`  
- Web Detail & Alert Views: `frontend/web/src/components/map/modals/HazardDetailModal.jsx`, `MapViewer.jsx`, & `RiskAlertsDrawer.jsx`  
- Backend API & Models: `backend/app/Models/Hazard.php` & `backend/app/Http/Controllers/Api/HazardController.php`

### A. Rationale
* Disasters and road hazards (deep flooding, structural fires, landslides) rarely follow arbitrary timer schedules.
* Requiring dispatchers to guess an "Estimated Duration / Drain Time / Clearance Time" in hours creates unnecessary friction during rapid emergency response and risks premature automatic deactivation before on-ground verification.

### B. UI / UX Changes
1. **Hazard Creation Forms (`HazardFormModal.jsx` & `ProactiveDisasterModal.jsx`):**
   - Completely remove the input fields for `estimated_duration_hours` (e.g., "Estimated Drain Time", "Estimated Clearance Time", "Estimated Duration in hours/days/weeks").
   - Hazards are created with a perpetual active state until explicitly closed or resolved by field inspection or rain gauges.
2. **Hazard Popups & Detail Drawers (`HazardDetailModal.jsx`, `MapViewer.jsx`, `RiskAlertsDrawer.jsx`):**
   - Remove duration countdown chips and expiration timers (e.g., `Duration: X hours`).
   - Replace with status indicators based purely on whether the hazard is **Active**, **Under Investigation / Validation**, or **Cleared / Inactive**.

### C. Backend Adjustments
* Make `estimated_duration_hours` non-mandatory in validation rules in `HazardController.php` (set to `nullable`).
* Deprecate auto-expiration crons relying on arbitrary estimated duration timestamps.

---

## 7. Summary of Files & Modules Affected

| Module | File Path | Key Changes |
| :--- | :--- | :--- |
| **Web Dispatch Modal** | `frontend/web/src/components/dispatch/modals/DispatchUnitModal.jsx` | Reorder sections (Victim top, Units bottom); multi-unit selection; scope equipment; remove VHF radios; replace "Distress Order" with hazard-contextualized "Affected Individuals". |
| **Web Hazard Modals** | `frontend/web/src/components/map/modals/HazardFormModal.jsx` & `HazardDetailModal.jsx` | Remove Estimated Duration / Drain Time / Clearance Time inputs and display badges. |
| **Web Map & Drawers** | `frontend/web/src/components/map/MapViewer.jsx` & `RiskAlertsDrawer.jsx` | Remove duration hours tags and countdown displays. |
| **Web Review Queue** | `frontend/web/src/pages/cdrrmo/IncidentReviewQueue.jsx` | Differentiate SOS cluster vs. routine hotspot; add "Validate Report" & "Dismiss" buttons; display validated badge. |
| **Mobile Report Screen** | `frontend/mobile/src/screens/resident/ReportIncident.jsx` | Remove manual incident name input; auto-generate title from hazard & location; add manual map pin picker; geometry toggle (circle vs. road corridor). |
| **Mobile Incident Modal** | `frontend/mobile/src/components/incident/modals/CreateIncidentModal.jsx` | Remove manual incident name field; integrate interactive map pin and radius/corridor selectors. |
| **Mobile Rescue Map** | `frontend/mobile/src/screens/cdrrmo/RescueMap.jsx` | Display shelter capacity warning; add "Proceed Anyway"; in-transit "Change Shelter" re-routing modal. |
| **Mobile Rescue Duty** | `frontend/mobile/src/screens/cdrrmo/RescueDuty.jsx` | Live shelter capacity badges; quick shelter switcher button in mission status view. |
| **Backend Incident API** | `backend/app/Http/Controllers/Api/IncidentController.php` | Instant hazard creation on report; separate SOS count from hazard count in `evaluateFrequency()`; validation endpoint. |
| **Backend Hazard API** | `backend/app/Http/Controllers/Api/HazardController.php` | Remove required validation on `estimated_duration_hours`. |
| **Backend Rescue Mission API** | `backend/app/Http/Controllers/Api/RescueMissionController.php` | Supports dynamic `target_shelter_id` update during transport phase. |
| **Backend Hazard Model** | `backend/app/Models/Hazard.php` | Add validation metadata (`validation_status`, `validated_by`, `validated_at`); allow nullable `estimated_duration_hours`. |

