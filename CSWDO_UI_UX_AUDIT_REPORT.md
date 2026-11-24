# CSWDO UI/UX Audit & Optimization Report: Web & Mobile

**Author:** Antigravity (Google DeepMind Team)  
**System:** `Evac_Route` Disaster Risk Reduction & Management System  
**Audited Surfaces:** CSWDO Web EOC (`ShelterManagement`, `InventoryManager`, `EvacuationLogs`) & CSWDO Mobile (`StaffScanner`, `StaffOverview`)  
**Status:** **Pending User Review & Approval**

---

## 1. Executive Summary

The CSWDO (City Social Welfare and Development Office) module contains powerful, mission-tested capabilities:
- Dynamic shelter capacity tracking & covered court decentralized activation
- Dual-phase ration planning (Phase 1 Influx vs Phase 2 DSWD Dry Packs)
- Demographically adjusted proactive barangay calculator
- Partial family headcount intake & sequential walk-in vouchers
- Vulnerability triage (infants, pregnant, seniors, PWDs) & temporary day passes

**The Core Problem:**
Because these capabilities were built iteratively, screens now present **too much information at once on first view**. 
- Tables contain nested formula calculations and competing action buttons inside individual rows.
- Field marshals on mobile must scroll past camera previews, manual entry inputs, and action buttons simultaneously.
- First-time social workers and LGU evaluators experience **cognitive friction**: they cannot immediately answer the 3 fundamental disaster questions:
  1. *Which shelters are full or need food right now?*
  2. *Who is physically inside the shelter vs temporarily offsite?*
  3. *What is my single most urgent next action?*

This audit identifies the exact cognitive bottlenecks and proposes an **ergonomic, progressive-disclosure redesign** that simplifies first view without sacrificing operational depth.

---

## 2. Web EOC Detailed Audit (`frontend/web`)

### Surface A: Shelter Management (`ShelterManagement.jsx`)

#### Current Issues & Cognitive Friction Points:
1. **Row-Level Over-Engineering ("Capacity Status" Column):**
   - *Current State:* Each row in the shelters table renders an occupancy bar, percentages, and an embedded sub-panel calculating 20% surge buffers with inventory stock readiness badges (`Stock Ready` or `Needs Restock`).
   - *User Impact:* The table looks like a spreadsheet with nested calculations. A user scanning 15 shelters sees hundreds of text elements competing for attention.
2. **Action Button Collision in Table Rows:**
   - *Current State:* Each table row contains up to 4 competing buttons:
     - `Quick Dispatch` (solid blue)
     - `PDF Overview` (gray outline)
     - `View Details` (light blue)
     - `🔓 Activate Court` or `🚚 Mobilize CSWD` (in the State column)
   - *User Impact:* Unclear visual hierarchy. First-time users hesitate because there is no single clear primary action.
3. **Misplaced DevOps Links:**
   - *Current State:* In the top tab bar (`Shelters & Capacities`, `Ration Planning`, `Barangay Calculator`), there is a purple button: `[ 🔑 Partner API Keys & Logs ]`.
   - *User Impact:* Social workers do not manage API keys or webhook telemetry. It clutters the operational workspace.
4. **"Ration Planning" Tab Math Overload:**
   - *Current State:* The "Ration Planning & Buffers" tab prints multi-line text paragraphs into every row:
     *(e.g., "Target for 36 Pax (30 active evacuees + 6 reserve): 72 cans Corned Beef, 36 bottles Water...")*.
   - *User Impact:* Hard to read during an emergency. Should be presented as compact visual metric tags or summary chips.

#### Proposed Redesign & Progressive Disclosure:
- **Clean Table Hierarchy:**
  - Column 1: **Shelter Name & Type** (Clean title + Barangay tag + Standby Court badge if applicable).
  - Column 2: **Occupancy & Capacity** (High-contrast progress bar + bold count: `142 / 200` + percentage).
  - Column 3: **Status & Alerts** (`OPEN`, `STANDBY`, `FULL`, or `⚠️ Influx Alert`).
  - Column 4: **Quick Action** (Single primary button: `Manage Shelter` / `View Details`). Secondary actions (`Quick Dispatch`, `PDF Export`, `Activation Toggle`) move inside the clean details modal.
- **Relocate API Keys:** Move API Key management strictly to `DevOps Admin` navigation or the secondary utility menu.
- **Visual Metric Pills for Ration Planning:** Replace walls of text with clean tag pills:
  - `🍱 72 Family Packs` · `💧 150L Water` · `🍞 90 Rations`

---

### Surface B: Inventory & Stock Management (`InventoryManager.jsx`)

#### Current Issues & Cognitive Friction Points:
1. **Dense 10-Column Table:**
   - *Current State:* Raw listing of all supplies without immediate urgency grouping.
   - *User Impact:* An operator cannot instantly tell what is running out in warehouse storage versus what is overstocked.
2. **Ration Formula Jargon:**
   - *Current State:* The Ration Builder tab exposes raw database fields: `allocation_type`, `quantity_per_head`, `buffer_multiplier`.
   - *User Impact:* Social workers think in practical meal packages, not mathematical variables.

#### Proposed Redesign:
- **Top-Level KPI Urgency Deck:**
  - 3 clean stat cards at the very top:
    - 🔴 **Critical Shortages (<20% stock):** e.g. 2 items need procurement.
    - 🟡 **In Transit / Dispatched:** e.g. 3 trucks currently on the road.
    - 🟢 **Available Family Food Packs:** e.g. 1,450 packs ready for deployment.
- **Visual Stock Status Badges:** Clearly label items as `HEALTHY`, `RESERVE LOW`, or `DEPLETED`.

---

### Surface C: Evacuation Logs & Resident Records (`EvacuationLogs.jsx`)

#### Current Issues:
1. **Filter Overwhelm:** 7 different input fields shown at once at the top of the table.
2. **Information Overcrowding:** Table displays IDs, hashes, raw timestamps, and technical strings that are irrelevant to daily camp management.

#### Proposed Redesign:
- **Compact Search & Quick Filter Chips:**
  - Single omni-search input (`Search by name, voucher, or barangay`).
  - 3 quick filter chips: `All Active (Inside Shelter)` | `Temporary Day Pass` | `Checked Out`.
  - Advanced date range picker tucked neatly behind a collapsible `[ ⚙️ Filters ]` toggle.

---

## 3. Mobile CSWDO Detailed Audit (`frontend/mobile`)

### Surface A: Gate Scanner (`StaffScanner.jsx` & `ScanResultCard.jsx`)

#### Current Issues & Cognitive Friction Points:
1. **Screen Real Estate Competition (Above the Fold):**
   - *Current State:* The camera viewfinder, reticle, error notices, "System QR Scanner" button, "Manual Entry" toggle, demo simulation button, and the new "Walk-In Intake" / "Log Donation" buttons all live on one screen.
   - *User Impact:* Gate marshals in the field (often under rainy or bright sunlight conditions) have to scroll to find buttons.
2. **Scan Result Information Stacking:**
   - *Current State:* Once scanned, `ScanResultCard` renders 12 separate UI blocks in a vertical stack:
     - Family Name $\rightarrow$ Pax count $\rightarrow$ Checked In badge $\rightarrow$ Ration badge $\rightarrow$ Voucher badge $\rightarrow$ Vulnerabilities $\rightarrow$ Shelter name $\rightarrow$ Timestamp $\rightarrow$ Actual Headcount Stepper $\rightarrow$ Check-In Button $\rightarrow$ Day Pass Button $\rightarrow$ Dispense Ration Button $\rightarrow$ Reset Button.
   - *User Impact:* On 5.5" to 6" mobile screens, the primary action button (`CHECK IN`) is pushed below the fold.

#### Proposed Redesign:
- **Segmented Top Tabs:**
  - Switcher at the top:
    `[ 📷 QR Scanner ]` | `[ 📝 Walk-In Intake ]` | `[ 🍲 Log Donation ]`
  - Selecting `QR Scanner` shows *only* the camera and aim frame with high-contrast scan feedback.
  - Selecting `Walk-In Intake` switches directly to the rapid intake form without needing a popup modal.
- **Compact Result Card (Thumb-Zone Priority):**
  - **Top Row:** Family Name + Status Badge (`Checked In` vs `New Arrival`).
  - **Middle Row:** Large stepper for present headcount: `[-] 3 [+] of 6 Pax`.
  - **Bottom Docked Action Bar (56pt touch target):**
    Single, high-contrast, context-aware primary button:
    - If New: `[ CHECK IN 3 PAX ]` (Green)
    - If Checked In: `[ DISPENSE RATION ]` (Blue)
    - Secondary actions (Day Pass, Edit) accessible via a clean overflow/bottom sheet.

---

### Surface B: Command Overview (`StaffOverview.jsx`)

#### Current Issues:
1. **Accordion Ballooning:** Tapping any shelter card expands it with so much data (occupancy track, remaining slots, barangay, mobilization alert, CSWDO dispatch button, vulnerability summary breakdown, CHO button) that it pushes all other shelters off-screen.
2. **Confusing Button Context:** It's not immediately obvious whether pressing "Mobilize CSWD" affects the whole city or just that specific court.

#### Proposed Redesign:
- **Compact Summary Card Design:**
  - Shelter Name + Status (`🟢 OPEN` | `🟡 STANDBY` | `🔴 FULL`).
  - Progress bar + Occupancy number.
  - Quick action pill right on the card (e.g. `[ 🔓 Open Court ]` if standby).
- **Dedicated Shelter Detail Drawer / Sheet:**
  - Instead of expanding inline and causing Cumulative Layout Shift (CLS), tapping a shelter opens a clean bottom sheet containing the vulnerability triage breakdown and field team mobilization controls.

---

## 4. Proposed Layout Wireframes & Visual Structure

### Web Shelter Management (Decluttered Concept)
```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  CSWDO CAMP & SHELTER MANAGEMENT                                          [ 📄 Export Report ]│
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ 🏢 Evacuation Centers (8) ]   [ 🍱 Relief Ration Planning ]   [ ⚡ Brgy Demand Calculator ] │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  🔍 Search shelters, barangays...                                   Filters: [ All Status ▼ ]│
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  SHELTER NAME              OCCUPANCY & LOAD          STATUS               ACTION             │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  ⭐ Tetuan Covered Court   ██████████░░  142/200     🟢 OPEN              [ Manage Shelter ] │
│     Brgy. Tetuan (Elev. 12m)    (71% Capacity)       🚚 Field Team Active                    │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  🏀 Tumaga Multi-Purpose   ░░░░░░░░░░░░    0/150     🟡 STANDBY COURT     [ 🔓 Activate ]    │
│     Brgy. Tumaga (Safe Haven)   (Standby Ready)      🏀 Basketball Active                    │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  🏫 WMSU Gymnasium         ████████████  300/300     🔴 FULL (100%)       [ Manage Shelter ] │
│     Brgy. Baliwasan             (Max Capacity)       ⚠️ High Influx                          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

*Clicking `[ Manage Shelter ]` opens the Single-Surface Modal with Tabs:*
- **Tab 1:** Resident Roster & Headcounts (Actual vs Registered, Vouchers, Day Passes)
- **Tab 2:** Vulnerability Triage Summary (Infants, Pregnant, Seniors, PWDs, Meds)
- **Tab 3:** Ration Stocks & Quick Dispatch Presets

---

### Mobile Scanner (Decluttered Concept)
```
┌───────────────────────────────────┐
│   CSWDO INTAKE & RELIEF DESK      │
│   Operator: Gate Marshal          │
├───────────────────────────────────┤
│ [ 📷 QR Scan ] [ 📝 Walk-In ] [ 🍲 ]│
├───────────────────────────────────┤
│                                   │
│       ┌───────────────────┐       │
│       │                   │       │
│       │   CAMERA SCANNER  │       │
│       │     VIEWFINDER    │       │
│       │                   │       │
│       └───────────────────┘       │
│     Align evacuee QR code here    │
│                                   │
├───────────────────────────────────┤
│ ⚡ Quick Demo: Simulate 'pheinz'  │
└───────────────────────────────────┘
```

*When QR is Scanned (Clean 3-Zone Card):*
```
┌───────────────────────────────────┐
│ 👤 Dela Cruz Family   [ NEW PAIR ]│
├───────────────────────────────────┤
│ Headcount Present at Shelter Gate │
│       [-]     3     [+]           │
│   3 Present of 6 Registered Pax   │
│ ⚠️ Partial check-in registered     │
├───────────────────────────────────┤
│  [ ✅ ADMIT & CHECK IN 3 PAX ]     │
│                                   │
│  [ 🚪 Issue Temporary Day Pass ]  │
│  [ 🔄 Scan Next Resident ]        │
└───────────────────────────────────┘
```

---

## 5. Summary Matrix: Current vs Proposed State

| Feature Area | Current State (Audit Findings) | Proposed Optimized State | User Benefit |
|---|---|---|---|
| **Shelter Table (Web)** | Formula calculations and restock alerts packed inside table rows. | Clean table: Shelter, Occupancy bar, Status chip, Single primary CTA. | 70% reduction in visual clutter; zero hesitation on where to click. |
| **Action Buttons (Web)** | 3-4 competing colored buttons per row. | 1 primary `Manage Shelter` button; secondary tools organized in modal tabs. | Clear visual hierarchy and predictable action placement. |
| **API Keys Link (Web)** | Sits directly on the operational CSWDO tab bar. | Relocated to DevOps/Admin settings. | Removes developer noise from social workers' view. |
| **Mobile Scanner (App)** | Viewfinder, manual inputs, demo buttons, and 2 new modal buttons stacked on 1 page. | Clean 3-tab segmented top switcher (`QR Scan`, `Walk-In`, `Donation`). | Eliminates vertical scrolling; 56pt touch targets remain accessible. |
| **Scan Result Card (App)** | 12 vertical information blocks causing primary action to fall below the fold. | 3-zone card: Header $\rightarrow$ Headcount Stepper $\rightarrow$ Docked Primary Action. | Gate marshal can check in evacuees in under 2 seconds. |
| **Shelter Overview (App)** | Expanding shelter card balloons with 15 rows of data, pushing other shelters away. | Compact card with status + quick unlock button; deep details open in a Bottom Sheet. | No layout shift (CLS); smooth browsing of all city evacuation centers. |

---

## 6. Feedback & Next Action Request

Please review this audit report:
- **Are there specific fields or metrics in the web table that you prefer to keep directly visible without opening the details modal?**
- **Do you agree with switching the Mobile Scanner into a clean 3-tab segmented view (`[ 📷 QR Scan ]` · `[ 📝 Walk-In ]` · `[ 🍲 Donation ]`)?**

Once you confirm your preferences, I will implement the exact decluttered interfaces across web and mobile.
