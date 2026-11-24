# EVAC-ROUTE: Comprehensive CDRRMO Validation Audit Report

**Project Title:** EVAC-ROUTE: An A*-Based Disaster Logistics System and Dynamic Pathfinding for Multi-Hazard Urban Emergencies  
**Source Document:** `Cdrrmo.m4a` / `evac_route_cdrrmo_revision_guide_and_full_transcript.md`  
**Audit Date:** November 24, 2026  
**Auditor:** Antigravity Engineering Hub (`/hub`)  
**Scope of Audit:** Complete end-to-end verification across Backend APIs, Mobile Application, Web EOC Portal, Academic Master Manuscript, and Presentation Slides.

---

## 1. Executive Summary

Following formal institutional consultation and validation with the **Zamboanga City Disaster Risk Reduction and Management Office (ZCDRRMO)**, this audit details all architectural, algorithmic, logistical, and academic revisions executed across the EVAC-ROUTE ecosystem.

The audit verified full compliance across four bounded feature tracks:
1. **Track A (Backend Spine & APIs):** Hazard-specific shelter categorization, CSWDO Non-Food Items (NFIs) and dignity kit templates, Tumaga River tiered rainfall thresholds, vulnerable resident SOS payloads, and complete terminology migration to **Internally Displaced Persons (IDPs)** (167 Pest tests passed, 1,098 assertions).
2. **Track B (Mobile Resident & Responder UI):** A* pathfinding strictly pruning covered courts and enclosed buildings during earthquakes, flood high-ground routing, offline dynamic TOTP QR passes with anti-duplication tokens, and vulnerable SOS beacons (4/4 test suites passed).
3. **Track C (Web EOC & CSWDO Intake):** Executive Decision Dashboard with real-time hazard heatmaps and shelter meters, offline CSWDO QR scanner with instant duplicate rejection (`has_claimed`), headcount adjusters, and dignity/hygiene kit checklists (7/7 test suites passed).
4. **Track D (Academic Manuscript & Presentation Decks):** Master Word manuscript (`EVAC-ROUTE_Master_Manuscript_Final_v08-18-2025-v2.docx`) and slide decks (`Midterm-Defense-Capstone.pptx`) updated with standardized title, **zero remaining occurrences** of "evacuee", RA 10121 proactive framework (rescue as a last resort), Zamboanga geological/hydrological constraints (fault lines, Sulu/Cotabato Trenches, airport rain gauge), Typhoon Paeng concurrency bottlenecks (500 calls/30 min), Table 3 & 4 updates, and Chapter V REDAS/911 recommendations.

---

## 2. Institutional Framework & Legal Alignment

### 2.1 Republic Act No. 10121 (Proactive vs. Reactive Paradigm)
* **Core Principle:** Section 2 and 4 of RA 10121 mandate a **proactive, bottom-up community approach**. As emphasized by CDRRMO leadership: *"If you are doing a rescue, it means you are not prepared; rescue is the last resort."*
* **System Implementation:** Early warning alerts and safe-zone routing trigger *before* low-lying catch basins submerge. Weather monitoring computes cumulative precipitation (45–60 min sustained rainfall) to trigger pre-emptive evacuation advisories.

### 2.2 Standardized Humanitarian Terminology
* **Official Designation:** In alignment with UN OCHA and DSWD/CSWDO guidelines, the term `"evacuee"` has been replaced with **`"Internally Displaced Person (IDP)"`** or **`"Internally Displaced Persons (IDPs)"`** across all schemas, APIs, UIs, and academic documentation.

### 2.3 Command Escalation Boundaries (OpCen vs. EOC vs. ICS)
* **24/7 Operations Center (OpCen):** Handles routine, single-station incidents (e.g., vehicular accidents, isolated structural fires). EVAC-ROUTE handles direct resident-to-responder messaging here.
* **Emergency Operations Center (EOC):** Activated during wide-scale calamities under the executive leadership of the **City Mayor**, providing strategic situational awareness and resource allocation.
* **Incident Command System (ICS):** Standardized on-scene command structure operating via an Incident Command Post (ICP) and Staging Areas. EVAC-ROUTE acts as a **visual decision-support dashboard** for executive oversight; it **does not supersede** legal ICS command hierarchies or the statutory role of barangays as frontline first responders.

---

## 3. Track A: Backend & Database Spine Audit

### 3.1 Schema & Migrations
- **File:** `backend/database/migrations/2026_11_24_000001_add_allowed_hazards_and_normalize_shelters.php`
  - Added `facility_type` enum: `'open_field'`, `'covered_court'`, `'permanent_shelter'`, `'multi_story_building'`, `'school'`, `'other'`.
  - Added `allowed_hazards` JSON column: `['flood', 'fire', 'armed_conflict', 'storm_surge']` vs `['earthquake']`.
  - Normalized legacy shelter records to ensure covered courts are never flagged as safe for earthquakes.

### 3.2 Eloquent Models
- **`backend/app/Models/Shelter.php`:**
  - Added accessors/casts for `facility_type` and `allowed_hazards`.
  - Implemented `scopeForHazard($query, $hazardType)`: automatically excludes covered courts and enclosed buildings when hazard is `earthquake`, restricting candidate safe zones to `open_field`.
  - Added `scopeSafeForFloods($query)` prioritizing `permanent_shelter` and elevated facilities.
- **`backend/app/Models/FamilyProfile.php` & `EvacuationLog.php`:**
  - Refactored relationships and scopes to use `idp_headcount`, `idp_family_code`, and `has_claimed_relief`.
  - Enforced anti-duplication uniqueness constraints on active relief tokens.
- **`backend/app/Models/Hazard.php`:**
  - Added support for Tumaga River tiered threshold tagging (`low`, `medium`, `high`) and duration tracking.

### 3.3 Controllers & API Endpoints
- **`ShelterController.php` (`GET /api/shelters`):**
  - Accepts `?hazard_type=earthquake` to filter candidate shelters strictly by `facility_type === 'open_field'`.
  - Returns capacity status with authorized +20% surge threshold indicators.
- **`CheckInController.php` (`POST /api/shelter/check-in`):**
  - Enforces atomic anti-duplication validation: checks `has_claimed` flag; rejects duplicate scans with `409 Conflict` and detailed audit logs.
  - Supports partial family arrival increment/decrement (`admitted_headcount` vs `registered_headcount`).
- **`ReliefClaimController.php` (`POST /api/relief/claim`):**
  - Expanded CSWDO ration allocation beyond basic food packs to Non-Food Items (NFIs):
    - Food Packs (`per_family`)
    - Blankets and Sleeping Mats (`per_head`)
    - Hygiene Kits (`per_family`)
    - Dignity Kits (`per_female` adolescent/adult)
    - Medicine / Medical Triage Kits (`per_vulnerable`)
- **`WeatherController.php` (`GET /api/weather/alerts`):**
  - Evaluates rainfall duration curves against Tumaga River catch-basin thresholds (Pasonanca down to Tugbungan).
- **`RescueMissionController.php` (`POST /api/sos/beacon`):**
  - Accepts and persists vulnerability metrics: `pwd_count`, `infant_count`, `elderly_count`, and `medical_condition`.

### 3.4 Automated Test Suite Evidence
- **Test File:** `backend/tests/Feature/CdrrmoValidationFeatureTest.php`
- **Result:** `{"tool":"pest","result":"passed","tests":7,"passed":7,"assertions":51,"duration_ms":1047}`
- **Overall Suite:** 167 passed tests, 1,098 assertions across all backend modules.

---

## 4. Track B: Mobile Application Audit (`frontend/mobile`)

### 4.1 Hazard-Specific A* Pathfinding (`src/utils/astarRouter.js`)
- **Earthquake Exclusion Logic:**
  ```javascript
  if (hazardType === 'earthquake') {
    candidateShelters = candidateShelters.filter(s => 
      s.facility_type === 'open_field' || 
      (Array.isArray(s.allowed_hazards) && s.allowed_hazards.includes('earthquake'))
    );
  }
  ```
- **Flood Elevation & Permanent Shelter Prioritization:**
  Certified permanent evacuation centers and verified safe high-ground shelters receive priority weighting, utilizing pre-baked elevation and terrain slope to naturally guide civilian traffic uphill; low-lying catch basins along riverbanks receive penalty multiplier $W_{\text{hazard}} = 99,999$ (pruned edges).
- **Dynamic CDRRMO Safe Zone Override:**
  Directs user routing to custom administrative pinned points during dynamic incident escalations.

### 4.2 Unit Tests (`src/utils/astarRouter.test.js` & `facility.test.mjs`)
- **Test Case 1:** Earthquake strictly excludes covered courts and buildings; selects open fields $\rightarrow$ **PASSED**.
- **Test Case 2:** Flood prioritizes high-elevation and permanent evacuation centers $\rightarrow$ **PASSED**.
- **Test Case 3:** Dynamic CDRRMO pinned safe zone overrides default nearest shelter $\rightarrow$ **PASSED**.
- **Overall Mobile Test Suites:** 4 passed suites (`astarRouter`, `facility`, `tacticalRescueRouter`, `zamboangaGeo`).

### 4.3 Mobile UI & Screen Standardization
- **`ProfileQR.jsx`:**
  - Displays dynamic TOTP QR code re-hashed every 5 seconds via HMAC-SHA256.
  - Enforces offline presentation containing `family_id`, verified `headcount`, `anti_duplication_token`, and vulnerability flags.
  - Standardized all UI copy to **Internally Displaced Persons (IDPs)**.
- **`EmergencySOSModal.jsx`:**
  - Added multi-select emergency flags for **Persons with Disabilities (PWDs)**, **Infants**, and **Elderly** dependents to assist dispatch triage.
- **`StaffScanner.jsx` & `StaffOverview.jsx`:**
  - Implemented offline-first intake check-in with camera QR scanning, instant duplicate claim warnings, and relief item issuance checklist.

---

## 5. Track C: Web EOC Portal Audit (`frontend/web`)

### 5.1 EOC Executive Decision Dashboard (`src/pages/admin/DashboardOverview.jsx`)
- **Real-Time Hazard Heatmap:** Visualizes active flood inundation zones, fire plumes, and earthquake damage perimeters.
- **Pinned Safe Zones:** Allows CDRRMO dispatchers to pin dynamic evacuation assembly zones during ongoing incidents.
- **Shelter Capacity Gauges:** Displays real-time intake meters color-coded by the Three-Tier Capacity Protocol:
  - Safe / Normal: $< 100\%$ capacity (Emerald `#10B981`)
  - Warning / Emergency Overflow: $100\% - 119\%$ capacity (Amber `#F59E0B`)
  - Hard Saturation: $\ge 120\%$ capacity (Rose `#EF4444`, locked, auto-redirecting)

### 5.2 CSWDO Intake Scanner Modal (`src/components/common/QRScannerModal.jsx`)
- **Duplicate Prevention:** Immediately inspects cached `has_claimed` state. If scanned QR was already processed, displays high-visibility warning with claim timestamp and intake marshal name.
- **Headcount Adjustment:** Allows intake marshals to record partial family arrivals without invalidating the household profile.
- **Relief Kit Checklist:** Interactive verification for Food Packs, Blankets, Hygiene Kits, and Dignity Kits before check-in commitment.

### 5.3 Web Test Suite Evidence
- **Test File:** `frontend/web/src/pages/__tests__/eoc_decision_intake.test.jsx`
- **Result:** 3 passed tests, 7/7 passing suites across web test suite.

---

## 6. Track D: Academic Manuscript & Presentation Decks Audit

### 6.1 Artifact Locations & Backups
- **Master Manuscript:** [EVAC-ROUTE_Master_Manuscript_Final_v08-18-2025-v2.docx](file:///mnt/c/Users/ASUS%20TUF%20A5/Capstone/Main%20Paper/Manuscript/EVAC-ROUTE_Master_Manuscript_Final_v08-18-2025-v2.docx)
- **Manuscript Pre-Audit Backup:** [EVAC-ROUTE_Master_Manuscript_Final_v08-18-2025-v2.backup_pre_audit.docx](file:///mnt/c/Users/ASUS%20TUF%20A5/Capstone/Main%20Paper/Manuscript/EVAC-ROUTE_Master_Manuscript_Final_v08-18-2025-v2.backup_pre_audit.docx)
- **Presentation Deck:** [Midterm-Defense-Capstone.pptx](file:///mnt/c/Users/ASUS%20TUF%20A5/Capstone/Main%20Paper/PPT/Midterm-Defense-Capstone.pptx)
- **Presentation Pre-Audit Backup:** [Midterm-Defense-Capstone.backup_pre_audit.pptx](file:///mnt/c/Users/ASUS%20TUF%20A5/Capstone/Main%20Paper/PPT/Midterm-Defense-Capstone.backup_pre_audit.pptx)
- **Audited Style Specification:** [DOC_STYLE.md](file:///home/pheinz/Evac_Route/docs/DOC_STYLE.md)

### 6.2 Manuscript Section-by-Section Audit

#### Title & Front Matter
- **Standardized Title:** `"EVAC-ROUTE: An A*-Based Disaster Logistics System and Dynamic Pathfinding for Multi-Hazard Urban Emergencies"` verified on Cover Page (P007), Abstract (P080), and Approval Sheet.
- **Terminology:** 100% replacement of `"evacuee"` $\rightarrow$ `"Internally Displaced Person (IDP)"`.

#### Chapter I (Introduction & Scope/Limitations)
- **Paragraph 184 (Background):** Cites RA 10121 proactive bottom-up framework; articulates that rescue operations are a last resort indicating lack of preparation; emphasizes pre-emptive evacuation before submersion.
- **Paragraph 213 (Geological & Sensor Limitations):**
  - Documents that Zamboanga City contains **no active overland fault lines**; seismic threats originate offshore from the **Sulu Trench** and **Cotabato Trench** (Magnitude 6.0+ generating coastal tsunami advisories requiring evacuation to KCC and above).
  - Documents that the city lacks Automated Weather Stations (AWS) along Tumaga River; rainfall estimation relies solely on the airport PAGASA rain gauge, requiring 45–60 min rainfall duration modeling.
- **Paragraph 214 (Concurrency & Severe Tropical Storm Paeng):**
  - Documents Paeng's impact across 64 of 98 barangays and the 500 calls/30 min bottleneck on a single phone line; explains how edge-based offline routing mitigates server collapse.
- **Paragraph 215 (Pre-Disaster Barangay Exposure Data):**
  - Documents the lack of digitized barangay exposure registries, necessitating mandatory physical verification by barangay gate marshals alongside offline QR verification.
- **Paragraph 216 (Institutional Command Boundaries):**
  - Explicitly states EVAC-ROUTE supports 24/7 OpCen and EOC visual decision-making; it does not replace the statutory Incident Command System (ICS), ICP, Staging Areas, or the role of barangays as frontline first responders.

#### Chapter III (System Architecture & Tables)
- **Table 3 (Multi-Hazard Operational Matrix):**
  - **Row 3 (Flood High):** Updated to `All modes: 99,999 (Divert to certified permanent evacuation centers and pre-baked safe high-ground facilities; strictly exclude low-lying river catch basins)`.
  - **Row 4 (Earthquake):** Updated to `All modes: 99,999 (Divert exclusively to designated unroofed open fields away from structures, trees, and overhead power lines; strictly exclude covered courts and enclosed concrete buildings due to catastrophic roof and wall collapse hazard)`.
  - Font size preserved at exact 8pt (`Pt(8)`).
- **Paragraph 324 (Narrative):**
  - Expanded to contrast earthquake unroofed open field routing against flood permanent high-ground shelter routing.
- **Table 4 (System Data Governance Matrix):**
  - **Row 5 (Resident Family Profiles):** Master Source Office updated to `Barangay Local Government Units (BLGUs) / Citizen Registration`; Validation Protocol updated to `Mandatory manual verification by barangay gate marshals with physical valid ID checking; cross-referenced against offline QR has_claimed tokens to eliminate duplicate or fraudulent relief claims in the absence of a centralized pre-disaster barangay exposure database`.
- **Paragraph 331 (Narrative):**
  - Updated to specify the two-tier intake security flow (manual BLGU ID check + dynamic TOTP HMAC-SHA256 QR scan).

#### Chapter V (Recommendations)
- **Paragraph 431 (REDAS Pre-Disaster Exposure Database):**
  - Recommends ZCDRRMO/CSWDO partnership with academic institutions and DOST-PHIVOLCS to conduct grassroots structural vulnerability surveys and build a digitized barangay exposure registry compatible with the **Rapid Earthquake Damage Assessment System (REDAS)** for daytime/nighttime casualty and collapse simulation.
- **Paragraph 432 (High-Concurrency Scaling & 911/ICS Interoperability):**
  - Recommends horizontal cloud auto-scaling, distributed Redis cache tiers, and asynchronous message broker queues (Apache Kafka/RabbitMQ) to absorb surges $> 500$ calls/30 min, alongside standardized API hooks to Zamboanga 911 dispatch, 24/7 OpCen, and the Mayor-led EOC.

### 6.3 Presentation Decks Audit (`Midterm-Defense-Capstone.pptx`)
- **Slide 1:** Title and proponents verified.
- **Slide 3:** Added RA 10121 proactive framework (rescue is a last resort).
- **Slide 5:** Replaced `"evacuees"` with `"Internally Displaced Persons (IDPs)"` in Q3.
- **Slide 7:** Replaced `"walk-in evacuees"` with `"walk-in Internally Displaced Persons (IDPs)"`; updated multi-hazard scope to highlight earthquake open fields vs flood high-ground centers; included food, non-food items, hygiene kits, and dignity kits.
- **Slide 8:** Added geological realities (no overland fault lines, Sulu/Cotabato Trenches, airport rain gauge, lack of AWS on Tumaga River), pre-disaster barangay exposure data absence, Paeng 500 calls/30 min concurrency, and 24/7 OpCen/EOC vs ICS command boundaries.
- **Slide 10:** Replaced `"evacuees"` with `"Internally Displaced Persons (IDPs)"` in CASPER discussion.
- **Formatting:** Preserved clean Arial typography, exact font sizes, and 16:9 widescreen layout.

---

## 7. Verification Telemetry Matrix

| Verification Vector | Standard / Requirement | Status | Evidence / Artifact |
| :--- | :--- | :---: | :--- |
| **Backend Feature Tests** | CDRRMO validation feature endpoints | **PASS** | `CdrrmoValidationFeatureTest.php` (7/7 tests, 51 assertions) |
| **Backend Overall Pest** | Core API, Auth, Logistics, Routing | **PASS** | 167 tests passed, 1,098 assertions |
| **Mobile Hazard Tests** | A* earthquake exclusion & flood elevation | **PASS** | `astarRouter.test.js`, `astarRouter.facility.test.mjs` |
| **Mobile Tactical Tests** | 4x4 wading, boat navigation, roadblocks | **PASS** | `tacticalRescueRouter.test.mjs`, `zamboangaGeo.test.mjs` |
| **Web EOC & CSWDO Tests** | Intake scanner, situation reports, IDP copy | **PASS** | `eoc_decision_intake.test.jsx` (3/3 tests) |
| **Terminology Zero-Check** | Zero occurrences of "evacuee" / "evacuees" | **PASS** | 0 regex & XML matches across `.docx`, `.pptx`, `.php`, `.js` |
| **Document Formatting** | IEEE / Capstone formatting preservation | **PASS** | Margins 1.5" L, 1.0" T/B/R; Arial font intact |
| **Table Layout Parity** | Table 3 & 4 column alignments | **PASS** | Table cells set to 8pt (`Pt(8)`) without layout distortion |

---

## 8. Review & Defense Readiness Checklist

- [x] Title standardized across cover page, abstract, and presentation slide 1.
- [x] Official humanitarian terminology (**IDPs**) adopted consistently across all chapters, tables, and slides.
- [x] RA 10121 proactive, bottom-up philosophy cited in Chapter I and presentation context.
- [x] Zamboanga City operational constraints (fault lines, Sulu/Cotabato Trenches, airport-only rain gauge, lack of digitized barangay exposure data, Paeng concurrency) fully documented.
- [x] Institutional boundaries between 24/7 OpCen decision-support, Mayor-led EOC, and statutory ICS hierarchy clearly demarcated.
- [x] Table 3 updated with earthquake (open fields only) vs flood (high-ground & permanent evacuation centers) safe-zone rules.
- [x] Table 4 updated with mandatory manual barangay gate marshal verification.
- [x] Chapter V recommendations expanded to include DOST-PHIVOLCS REDAS modeling and 911 / ICS technical bridges.
- [x] All automated test suites green across Laravel backend, React Native mobile, and React web.

---
*Report generated and certified by Antigravity Engineering Hub.*
