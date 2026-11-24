# Evac_Route: Comprehensive Changelog & Local Emulator Verification Guide

**Date:** November 22, 2026  
**Target Defense:** CDRRMO & CSWDO Operational Panel Presentation  
**Scope:** Full-Stack (Laravel Backend, React Web EOC Dashboard, React Native Expo Mobile)

---

## 📑 Table of Contents
1. [Overview of All Revisions & New Capabilities](#1-overview-of-all-revisions--new-capabilities)
2. [File-by-File Changelog Matrix](#2-file-by-file-changelog-matrix)
3. [Local Development Environment Setup](#3-local-development-environment-setup)
4. [Android Emulator Setup & GPS Location Tips](#4-android-emulator-setup--gps-location-tips)
5. [Step-by-Step Manual Testing Scenarios](#5-step-by-step-manual-testing-scenarios)
   - [Scenario 1: Resident SOS HUD & 1-Tap 911 Direct Dial](#scenario-1-resident-sos-hud--1-tap-911-direct-dial)
   - [Scenario 2: Multi-Purpose Covered Court Decentralized Activation](#scenario-2-multi-purpose-covered-court-decentralized-activation)
   - [Scenario 3: Partial Family Headcount Intake at Gate](#scenario-3-partial-family-headcount-intake-at-gate)
   - [Scenario 4: Zero-Battery / Unregistered Walk-in Voucher (`VCH-TET-0001`)](#scenario-4-zero-battery--unregistered-walk-in-voucher-vch-tet-0001)
   - [Scenario 5: Temporary Day Pass for Mud-Cleaning / Livestock](#scenario-5-temporary-day-pass-for-mud-cleaning--livestock)
   - [Scenario 6: Community / NGO On-Site Donation Logger (Lugaw, Water)](#scenario-6-community--ngo-on-site-donation-logger-lugaw-water)
   - [Scenario 7: Vulnerability Triage Roster & CHO Medical Request](#scenario-7-vulnerability-triage-roster--cho-medical-request)
   - [Scenario 8: EOC Web 1-Click Demo Presets for Live Defense](#scenario-8-eoc-web-1-click-demo-presets-for-live-defense)
   - [Scenario 9: CSWDO Decluttered UI/UX & Zero-CLS Mobile Experience](#scenario-9-cswdo-decluttered-uiux--zero-cls-mobile-experience)
   - [Scenario 10: CDRRMO Rescue Simulation, Camera Stability & Tactical Vehicle Marker](#scenario-10-cdrrmo-rescue-simulation-camera-stability--tactical-vehicle-marker)
6. [Master Credentials & Test Datasets](#6-master-credentials--test-datasets)

---

## 1. Overview of All Revisions & New Capabilities

This update equips the system with real-world disaster management operational capabilities required by CDRRMO and CSWDO:

1. **Resident Live SOS Tracking & Emergency Direct-Dial:**
   - Real-time docked HUD on the resident mobile screen showing active rescue missions, rescuer distance (meters/km), ETA (mins), vehicle category, and direct call button to the rescuer.
   - Quick 911 Floating Pill and direct-dial modal for Zamboanga emergency hotlines (911, CDRRMO, BFP, Coast Guard, ZCMC).
2. **Decentralized Covered Court Shelter Activation:**
   - Covered courts designated as disaster safe-havens start in `standby` (allowing basketball/community use) and are never hidden from navigation.
   - 3-tier decentralized activation: CDRRMO manual command, local Barangay Tanod 1-tap mobile unlock, or auto-activation upon first evacuee arrival (self-healing).
3. **Partial Family Headcount Intake:**
   - Solves split-family evacuation (e.g. 3 members evacuated first while 3 stayed behind). Rations deduct by physical headcount present, leaving the remaining quota intact for other family members.
4. **Offline / Zero-Battery Walk-In Vouchers:**
   - 1-tap intake generates sequential physical voucher codes (e.g., `VCH-TET-0001`) with vulnerability tags for victims with dead batteries or without smartphones.
5. **Temporary Day Pass Management:**
   - Evacuees authorized to conduct daytime flood mud-cleaning or livestock checks are tracked with a "Day Pass" status, preventing them from being falsely marked as checked-out.
6. **On-Site Community Donation Logger:**
   - Rapid logger for citizen/NGO hot meals (lugaw), bottled water, and bread, clearing them for immediate Phase 1 influx distribution.
7. **Special Needs & Vulnerability Triage:**
   - Automatic aggregation of infants, pregnant mothers, seniors, and PWDs with 1-click CHO medical augmentation requests.
8. **1-Click Demo Presets:**
   - Eliminated manual typing on Web EOC dispatch modals (`DispatchUnitModal` and `HotlineIntakeModal`) for the live presentation.

---

## 2. File-by-File Changelog Matrix

### Backend (`/backend`)
| File | Changes Made |
|---|---|
| `database/migrations/2026_11_22_193500_add_real_world_shelter_and_intake_features.php` | Added `activation_status`, `activation_trigger`, `cswd_mobilized`, `cswd_mobilized_at`, `cswd_mobilized_team` to `shelters`. Added `actual_headcount`, `is_temporary_offsite`, `temporary_offsite_at`, `walk_in_voucher`, `vulnerabilities` to `evacuation_logs`. Created `shelter_donations` table. |
| `app/Models/Shelter.php` | Added new fillable fields and `donations()` relationship. |
| `app/Models/EvacuationLog.php` | Added new fillable fields and array casting for `vulnerabilities`. |
| `app/Models/ShelterDonation.php` | New model representing community/NGO food, water, and relief donations. |
| `app/Http/Controllers/Api/CheckInController.php` | Updated `processCheckIn` to record `actual_headcount` and auto-activate standby shelters; added `rapidCheckIn` (voucher generation), `issueDayPass`, `returnFromDayPass`, and `vulnerabilitySummary`. |
| `app/Http/Controllers/Api/ShelterController.php` | Added `toggleActivation`, `mobilizeCswd`, `logDonation`, and `getDonations`; updated `getDetails` with vulnerability and day-pass metadata. |
| `app/Http/Controllers/Api/ReliefClaimController.php` | Updated `status()` to return `log_id`, `actual_headcount`, `is_temporary_offsite`, `walk_in_voucher`, and `vulnerabilities`. |
| `app/Http/Controllers/Api/RescueMissionController.php` | Added `activeSos()` and `cancelActiveSos()` endpoints for resident mobile tracking. |
| `routes/api.php` | Registered all new endpoints. |
| `tests/Feature/RealWorldShelterAndIntakeTest.php` | Feature tests covering all 4 operational workflows (100% pass). |

### Mobile App (`/frontend/mobile`)
| File | Changes Made |
|---|---|
| `src/context/ActiveSosContext.jsx` | Global real-time provider calculating live distance, ETA, and Reverb WebSocket updates for active rescues. |
| `src/components/rescue/ResidentRescueHud.jsx` | 5-stage resident rescue HUD (Pending Dispatch $\rightarrow$ Unit Assigned $\rightarrow$ En Route $\rightarrow$ On Scene $\rightarrow$ Completed) with direct rescuer call button. |
| `src/components/common/QuickEmergency911Modal.jsx` | 1-tap direct dialer for 911, CDRRMO, BFP, Coast Guard, ZCMC, with collapsible floating pill. |
| `src/components/cswdo/ScanResultCard.jsx` | Partial Headcount Stepper (`[-] [ actualHeadcount ] [+]`), Day Pass Issue/Return buttons, `isTemporaryOffsite` indicator, vulnerability tags. |
| `src/components/cswdo/RapidWalkInModal.jsx` | Added `inline={true}` prop support; 1-tap walk-in intake with sequential voucher display (`VCH-TET-0001`) and vulnerability triage selector. |
| `src/components/cswdo/LogDonationModal.jsx` | Added `inline={true}` prop support; Community/NGO donation logger for hot meals, bottled water, bread, and supplies. |
| `src/screens/cswdo/StaffScanner.jsx` | Decluttered screen layout: 3-way top segmented switcher (`[ 📷 QR Scanner ]` · `[ 📝 Walk-In Intake ]` · `[ 🍲 Log Donation ]`). Viewfinder hero experience in QR mode, and seamless inline forms for intake/donations with zero modal clutter. |
| `src/screens/cswdo/StaffOverview.jsx` | Zero Cumulative Layout Shift (CLS): Compact ~120px shelter cards with 1-tap standby unlock; full triage breakdown, vulnerability metrics, and mobilization actions isolated to a dedicated Bottom Sheet Modal. |
| `src/screens/cdrrmo/RescueMap.jsx` | Fixed camera zoom oscillation during active simulation by replacing declarative `<Mapbox.Camera>` props with `defaultSettings`. Streamlined rescuer marker to a clean, un-clipped tactical Callsign Pill (`[ 🟢 RUBBER BOAT-1 ]` / `[ 🟢 QRT DELTA-3 ]`) centered directly on the live GPS/sim coordinate without visual clutter or extra icons. Added `ChangeShelterModal` with dynamic shelter capacity overflow warning and 1-tap re-routing. |
| `src/styles/RescueMap.styles.js` | Updated `rescuerCallout` with high-contrast tactical pill styling (`10px` horizontal padding, `1.5px` high-contrast border, and active status beacon dot). |
| `src/components/rescue/ChangeShelterModal.jsx` | Dynamic shelter destination switcher with capacity tracker and live distance re-routing. |
| `App.jsx` | Wrapped application with `ActiveSosProvider`. |

### Web EOC Dashboard (`/frontend/web`)
| File | Changes Made |
|---|---|
| `src/pages/cswdo/ShelterManagement.jsx` | Decluttered table layout from 7 columns to 4 clean columns (`Evacuation Shelter`, `Occupancy & Load`, `Status & Readiness`, `Actions`). Consolidated row actions into a single `[ Manage Shelter ]` CTA. Replaced inline text walls in Tab 2 with compact metric chips and added clean PDF report export. |
| `src/components/shelter/modals/ShelterDetailsModal.jsx` | Transformed into an all-in-one command modal with top action bar (`Quick Dispatch`, `PDF Export`, `Activation`, `CSWDO Mobilize`, `Scan & Admit`) and 3 dedicated sub-tabs (`Evacuee Registry`, `Special Needs & Triage` with 1-click CHO medical alert, and `On-Site Community Donations`). |
| `src/components/dispatch/modals/DispatchUnitModal.jsx` | Added `⚡ Demo Preset` button (auto-fills Tetuan flood rescue data). |
| `src/components/disaster/HotlineIntakeModal.jsx` | Added `⚡ Demo Preset` button (auto-fills 911 emergency call data). |

---

## 3. Local Development Environment Setup

To test locally, run the four core components in separate terminal windows:

### Terminal 1: Backend API (Laravel)
```bash
cd /home/pheinz/Evac_Route/backend

# Ensure database migrations are up to date
php artisan migrate --force

# Start the Laravel local server
php artisan serve --host=0.0.0.0 --port=8000
```
> *API endpoint will be live at `http://127.0.0.1:8000/api` or `http://10.0.2.2:8000/api` inside Android Emulator.*

### Terminal 2: Real-Time WebSockets (Laravel Reverb)
```bash
cd /home/pheinz/Evac_Route/backend
php artisan reverb:start --debug
```

### Terminal 3: Web Dashboard (React + Vite)
```bash
cd /home/pheinz/Evac_Route/frontend/web
npm run dev -- --host
```
> *Web dashboard will be live at `http://localhost:5173`.*

### Terminal 4: Mobile App (React Native Expo)
```bash
cd /home/pheinz/Evac_Route/frontend/mobile

# Start Expo development server
npx expo start
```
> *Press `a` in the terminal to launch on a running Android Emulator, or run `npx expo run:android` for a native dev build.*

---

## 4. Android Emulator Setup & GPS Location Tips

When running on an Android Emulator, standard default locations (like Googleplex Mountain View, California) are automatically clamped by `zamboangaGeo.js` to Zamboanga City (WMSU coordinates: `6.9140, 122.0590`).

To test live movement on the Android Emulator:
1. Open the Emulator **Extended Controls** (`...` icon on the emulator sidebar).
2. Go to the **Location** tab.
3. Search or enter coordinates in Zamboanga City:
   - **Tetuan Covered Court:** `6.9194, 122.0840`
   - **Tumaga River Bridge:** `6.9380, 122.0720`
   - **CDRRMO EOC (Pettit Barracks):** `6.9045, 122.0780`
   - **WMSU Main Campus:** `6.9140, 122.0590`
4. Tap **Send** to inject the GPS location into the device.

---

## 5. Step-by-Step Manual Testing Scenarios

### Scenario 1: Resident SOS HUD & 1-Tap 911 Direct Dial
1. Open the Mobile App and log in as a Resident (`pheinz` / `password`).
2. Navigate to the **Evac Map** tab.
3. Notice the floating red **SOS 911** pill in the top-right.
4. Tap the pill $\rightarrow$ The `QuickEmergency911Modal` opens with direct dial buttons for:
   - `911` National Emergency
   - CDRRMO Emergency Operations Center (`0917-888-3776`)
   - BFP Fire Station (`062-991-2323`)
   - Zamboanga Coast Guard (`0917-842-7678`)
   - ZCMC Trauma Center (`062-991-0573`)
5. If an active rescue mission is dispatched for `pheinz` from the Web EOC, the **Live Rescue HUD** docks at the bottom of the map:
   - Shows unit name (e.g. `Rescue Unit 1 - Rubber Boat 01`).
   - Displays real-time live distance (`~1.2 km`) and ETA (`~4 mins`).
   - Includes a green **Call Rescuer** button that directly opens the phone dialer with the rescuer's number.

---

### Scenario 2: Multi-Purpose Covered Court Decentralized Activation
1. In the Web EOC Dashboard (`http://localhost:5173`), navigate to **CSWDO Shelter Management**.
2. Notice covered courts in standby state show an amber badge: `🟡 STANDBY COURT`.
3. Open the Mobile App logged in as CSWDO / Tanod (`cswdo` / `password`).
4. Go to the **Overview** tab.
5. In the shelter card for a standby covered court, tap:
   `[ 🔓 Clear & Open Court for Evacuees ]`
6. The court status immediately switches to `OPEN` across both mobile and web dashboard.
7. *Self-Healing Test:* If a resident checks into a standby court before anyone presses the button, the backend self-heals and activates the shelter automatically.

---

### Scenario 3: Partial Family Headcount Intake at Gate
1. On the Mobile App under CSWDO staff (`cswdo` / `password`), go to **QR Scanner**.
2. Tap the blue demo button: `⚡ Demo: Simulate 'pheinz' QR Pass`.
3. The scan result card renders with:
   - `Family Registered: 6 Pax`
   - Headcount Stepper: `[-] [ 3 ] [+]`
4. Reduce the stepper to `3` (simulating only 3 family members arrived first while 3 stayed behind).
5. A yellow badge informs: `⚠️ Partial Intake: 3 family member(s) will check in later`.
6. Tap `[ CHECK IN (3 PAX) ]`.
7. Notice the shelter occupancy increments by 3, leaving the remaining 3 allocations for the rest of the household.

---

### Scenario 4: Zero-Battery / Unregistered Walk-in Voucher (`VCH-TET-0001`)
1. On the Mobile App **QR Scanner** screen (when no scan is active).
2. Tap the blue button: `[ Walk-In Intake ]`.
3. The `RapidWalkInModal` opens.
4. Enter:
   - **Family Name:** `Dela Cruz Walk-In`
   - **Headcount:** `4`
   - **Barangay:** `Tetuan`
   - **Vulnerabilities:** Tap `Infant / Toddler (<2yo)` and `Senior Citizen (60+)`.
5. Tap `[ Issue Voucher & Admit (4 Pax) ]`.
6. A success screen appears with an official offline voucher code (e.g., `VCH-TET-0001`).
7. In the Web EOC `ShelterDetailsModal`, the resident appears with the purple badge: `🎫 VCH-TET-0001`.

---

### Scenario 5: Temporary Day Pass for Mud-Cleaning / Livestock
1. Scan or inspect a resident who is checked into the shelter.
2. In the scan card actions, tap:
   `[ 🚪 Issue Temporary Day Pass (Mud Cleaning / Livestock) ]`
3. The card updates to an amber warning banner:
   `⚠️ Temporary Day Pass Active`
   *Evacuee authorized for daytime inspection/cleaning.*
4. In Web EOC `ShelterDetailsModal`, this evacuee shows an amber tag: `⚠️ Off-site (Day Pass)`.
5. When the resident returns to the shelter, tap:
   `[ 🏠 Confirm Return to Shelter ]`
6. The Day Pass clears, and the resident returns to active shelter roster.

---

### Scenario 6: Community / NGO On-Site Donation Logger (Lugaw, Water)
1. On the Mobile App **QR Scanner** screen, tap the segmented tab at the top:
   `[ 🍲 Log Donation ]`
2. The inline Donation Logger appears directly on screen with zero modal obstruction.
3. Quick Category chips: Tap `🍲 Hot Meals / Lugaw`.
4. The item auto-fills as `Hot Lugaw / Packed Meals`.
5. Enter:
   - **Donor Name:** `Barangay Tetuan Youth Council`
   - **Quantity:** `60` servings
   - **Notes:** `Delivered piping hot, distribute to Quad A evacuees first`
6. Tap `[ Record & Clear for Distribution ]`.
7. Success alert confirms 60 servings logged and ready for immediate Phase 1 influx distribution.

---

### Scenario 7: Vulnerability Triage Roster & CHO Medical Request
1. Open the Web EOC Dashboard $\rightarrow$ **Shelter Management**.
2. Click **Manage Shelter** on any active shelter (e.g., Tetuan Covered Court).
3. The unified **Shelter Command Window** opens:
   - Click sub-tab **Special Needs & Triage**:
     - View clean metric chips (`👶 Infants: X`, `🤰 Pregnant: X`, `🧓 Seniors: X`, `♿ PWDs: X`, `💊 Meds: X`).
     - Click `[ 📢 Alert CHO Medical Team ]` to trigger immediate emergency medical augmentation.
   - Click sub-tab **Evacuees & Day Passes**:
     - View active evacuees, physical headcounts, voucher tags, and manage day pass return/checkout.
   - Click sub-tab **Community Donations**:
     - View on-site hot meals and drinking water logged directly from citizens/NGOs.
4. On Mobile **Command Overview**, tap any shelter card (e.g., Tetuan Covered Court) $\rightarrow$ The zero-CLS **Shelter Details Sheet** opens smoothly. Tap `[ 📢 Request CHO Medical Support ]` to notify the City Health Office.

---

### Scenario 8: EOC Web 1-Click Demo Presets for Live Defense
1. In Web EOC, open **Rescue Dispatch** $\rightarrow$ click **Dispatch Mission**.
   - Notice the top header has a `⚡ Demo Preset` button.
   - Click it $\rightarrow$ Instantly populates `Pheinz & Dela Cruz Family`, `Tetuan`, `4 Headcount`, `Rubber Boat`, and `Life Vests` with zero typing.
2. In Web EOC, click **Manual 911 / Hotline Intake**.
   - Notice the header has a `⚡ Demo Preset` button.
   - Click it $\rightarrow$ Instantly populates `Brgy. Kagawad Santos`, `Tetuan River flash flood`, `Critical triage`, and coordinates with zero typing.

---

### Scenario 9: CSWDO Decluttered UI/UX & Zero-CLS Mobile Experience
1. **Web Shelter Management:**
   - Table reduced from 7 cluttered columns to **4 clean columns**: `Evacuation Shelter`, `Occupancy & Load`, `Status & Readiness`, and `Actions`.
   - Single unified CTA: `[ Manage Shelter ]` replacing 3 competing row buttons.
   - Influx and special needs alerts are cleanly badged without height blooming.
2. **Mobile Staff Scanner:**
   - Removed competing action buttons above the camera viewfinder.
   - Dedicated 3-segment switcher: `[ 📷 QR Scanner ]` · `[ 📝 Walk-In Intake ]` · `[ 🍲 Log Donation ]`.
   - Fullscreen camera viewfinder hero experience on QR mode; seamless inline forms for walk-in and donation logging.
3. **Mobile Command Overview:**
   - 100% eliminated Cumulative Layout Shift (CLS) caused by 15-row accordion ballooning.
   - Compact ~120px shelter cards with quick 1-tap `[ 🔓 Clear & Open Court ]` for standby shelters.
   - Dedicated Bottom Sheet Modal for triage, load metrics, and mobilization actions.

---

### Scenario 10: CDRRMO Rescue Simulation, Camera Stability & Tactical Vehicle Marker
1. Log in to Mobile as **Rescuer** (`rescuer` / `password`) $\rightarrow$ Navigate to **Rescue Map** (`RescueMap.jsx`).
2. Start the 5-Step Rescue Simulation:
   - **Camera Stability:** The camera maintains a smooth, locked 3D tactical heading without oscillation or 5–10s zoom bouncing. React Query background refetches no longer reset the camera pitch or zoom level.
   - **Tactical Callsign Pill:** Displays a clean, un-clipped tactical callsign pill (`[ 🟢 RUBBER BOAT-1 ]` on marine routes, `[ 🟢 QRT DELTA-3 ]` on road routes) anchored directly at the rescuer's live coordinates with full horizontal text clearance (no clipping) and zero visual clutter.
   - **Dynamic Shelter Capacity Warning:** If the target evacuation shelter reaches 100% capacity during transit, a live amber warning banner triggers. Tapping it opens `ChangeShelterModal` to re-route turn-by-turn navigation to the nearest open shelter in 1 tap.

---

## 6. Master Credentials & Test Datasets

### A. Dedicated Rescue Fleet Operators (Incident Command System)
Each rescue asset now has its own real officer, vehicle profile, and pre-seeded active mission ready for the 2:00 PM defense presentation:

| Fleet Unit | Call Sign | Vehicle Type | Lead Officer | Email / Quick Chip | Password | Assigned Active Mission |
|---|---|---|---|---|---|---|
| **Marine Search & Rescue (WASAR)** | `BOAT-ALPHA` | Watercraft / Rubber Boat | **Capt. Arnaldo Ramos** | `rescue1@lgu.gov.ph` / `boat1@lgu.gov.ph`<br>*(Quick Chip: `🚤 Boat Lead`)* | `password` | **`RES-CRIT-001`**: Hadjirul Family (Baliwasan Shoreline - Coastal Storm Surge) |
| **Emergency Medical Services (EMS)** | `MEDIC-1` | Triage Ambulance | **Dr. Maria Elena Torres** | `medic1@lgu.gov.ph`<br>*(Quick Chip: `🚑 Medic Lead`)* | `password` | **`RES-CRIT-003`**: Clara & Infant Gabriel Mendoza (San Jose Gusu - Medical Triage) |
| **Quick Response Team (QRT Land)** | `DELTA-3` | 4x4 Heavy Rescue Truck | **Officer Ronald Macapagal** | `delta3@lgu.gov.ph`<br>*(Quick Chip: `🛻 QRT Truck`)* | `password` | **`RES-CRIT-002`**: Eduardo & Maria Dela Cruz (Tetuan Riverbank - Deep Flood Wading) |

---

### B. Command Center, CSWDO Shelter Logistics & Residents

| Operational Role | Entity / Title | Email / Quick Chip | Password | Primary Surface |
|---|---|---|---|---|
| **CDRRMO EOC Commander** | CDRRMO Director | `drrm@lgu.gov.ph` *(Web Quick: `🛡️ CDRRMO`)* | `password` | Web EOC (`RescueDispatch.jsx`) |
| **System Administrator** | System Administrator | `admin@lgu.gov.ph` *(Web Quick: `⚡ Admin`)* | `password` | Web EOC (`SystemHealth.jsx`) |
| **CSWDO Shelter Scanner** | Field Marshall / Intake | `scanner1@lgu.gov.ph` *(Mobile Quick: `📋 Scanner`)* | `password` | Mobile App (`StaffScanner.jsx`) |
| **CSWDO Logistics Lead** | Relief Logistics Officer | `logistics@lgu.gov.ph` *(Mobile & Web Quick: `📦 CSWDO`)* | `password` | Mobile App & Web EOC (`ShelterManagement.jsx`) |
| **Resident Evacuee** | Resident Evacuee | `pheinz@evacroute.local` *(Mobile Quick: `👤 Resident`)* | `password` | Mobile App (`EvacMap.jsx`) |

---
*For live presentation run-throughs and speaking points, refer to [DRRM_PRESENTATION_RUNBOOK.md](file:///home/pheinz/.gemini/antigravity/brain/8c8f1c18-e73c-4ac1-9a49-64285bfff2dc/DRRM_PRESENTATION_RUNBOOK.md).*
