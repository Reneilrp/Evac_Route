import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def make_run(p, text, size=8.5, color=RGBColor(51, 65, 85), font_name="Calibri", bold=False, italic=False):
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.name = font_name
    return run

doc = docx.Document()

# Landscape orientation with 0.4 in margins
section = doc.sections[0]
section.orientation = WD_ORIENT.LANDSCAPE
section.page_width = Inches(11.0)
section.page_height = Inches(8.5)
section.top_margin = Inches(0.4)
section.bottom_margin = Inches(0.4)
section.left_margin = Inches(0.4)
section.right_margin = Inches(0.4)

doc.styles['Normal'].font.name = 'Calibri'
doc.styles['Normal'].font.size = Pt(9)

# Document Header / Title
title_p = doc.add_paragraph()
title_p.paragraph_format.space_before = Pt(0)
title_p.paragraph_format.space_after = Pt(2)
title_run = title_p.add_run("USER ACCEPTANCE TESTING (UAT) FORM")
title_run.bold = True
title_run.font.size = Pt(16)
title_run.font.color.rgb = RGBColor(15, 23, 42)

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_before = Pt(0)
sub_p.paragraph_format.space_after = Pt(8)
sub_run = sub_p.add_run("EvacRoute: Real-time Emergency Evacuation & Disaster Risk Reduction Management (DRRM) System")
sub_run.bold = True
sub_run.font.size = Pt(11)
sub_run.font.color.rgb = RGBColor(2, 132, 199)

# Metadata Table (Preserving user's customized names and structure)
meta_table = doc.add_table(rows=3, cols=2)
meta_table.alignment = WD_TABLE_ALIGNMENT.LEFT
meta_table.autofit = False

meta_widths = [Inches(1.8), Inches(8.4)]
for row in meta_table.rows:
    for i, w in enumerate(meta_widths):
        row.cells[i].width = w

meta_data = [
    ("Project Name:", "EvacRoute: Real-time Emergency Evacuation & Disaster Risk Reduction Management (DRRM) System"),
    ("Target Environment:", "Production Deployment (Web: https://evacroute.app | API: https://evacroute.app/api | WS: wss://evacroute.app:443)"),
    ("Lead Developer & QA Lead:", "Pheinz (Lead Full-Stack Developer) & Jenson (QA Lead)")
]

for idx, (label, val) in enumerate(meta_data):
    row = meta_table.rows[idx]
    cell_lbl = row.cells[0]
    set_cell_background(cell_lbl, "F1F5F9")
    set_cell_margins(cell_lbl, 50, 50, 80, 80)
    p_lbl = cell_lbl.paragraphs[0]
    p_lbl.paragraph_format.space_after = Pt(0)
    make_run(p_lbl, label, size=8.5, bold=True, color=RGBColor(51, 65, 85))
    
    cell_val = row.cells[1]
    set_cell_margins(cell_val, 50, 50, 80, 80)
    p_val = cell_val.paragraphs[0]
    p_val.paragraph_format.space_after = Pt(0)
    make_run(p_val, val, size=8.5, color=RGBColor(30, 41, 59))

set_table_borders(meta_table, color="CBD5E1")

p_space = doc.add_paragraph()
p_space.paragraph_format.space_before = Pt(4)
p_space.paragraph_format.space_after = Pt(4)

# Legend Table
legend_table = doc.add_table(rows=1, cols=8)
legend_table.alignment = WD_TABLE_ALIGNMENT.LEFT
legend_table.autofit = False
leg_widths = [Inches(1.0), Inches(1.1), Inches(1.1), Inches(1.1), Inches(1.1), Inches(1.1), Inches(1.1), Inches(2.6)]
for i, w in enumerate(leg_widths):
    legend_table.rows[0].cells[i].width = w

legend_items = [
    ("LEGEND:", "F8FAFC", RGBColor(15, 23, 42), True),
    ("HIGH", "FEE2E2", RGBColor(185, 28, 28), True),
    ("MEDIUM", "FEF3C7", RGBColor(180, 83, 9), True),
    ("LOW", "E0F2FE", RGBColor(3, 105, 161), True),
    ("PASS", "DCFCE7", RGBColor(21, 128, 61), True),
    ("FAIL", "FEE2E2", RGBColor(185, 28, 28), True),
    ("PENDING", "FEF9C3", RGBColor(161, 98, 7), True),
    ("Blank = Not Yet Tested", "FFFFFF", RGBColor(100, 116, 139), False)
]

for idx, (txt, bg, col, is_b) in enumerate(legend_items):
    c = legend_table.rows[0].cells[idx]
    set_cell_background(c, bg)
    set_cell_margins(c, 40, 40, 50, 50)
    p = c.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx > 0 and idx < 7 else WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(0)
    make_run(p, txt, size=8, bold=is_b, color=col)

set_table_borders(legend_table, color="CBD5E1")

COL_HEADERS = [
    "#",
    "Module",
    "Acceptance Criteria / Feature",
    "Test Steps",
    "Expected Result",
    "Test Type",
    "Priority",
    "Test\nResult",
    "Actual Result / Comments",
    "Tested By",
    "Test Date"
]

COL_WIDTHS = [
    Inches(0.60),  # #
    Inches(0.70),  # Module
    Inches(1.55),  # Acceptance Criteria / Feature
    Inches(2.05),  # Test Steps
    Inches(1.85),  # Expected Result
    Inches(0.65),  # Test Type
    Inches(0.55),  # Priority
    Inches(0.55),  # Test Result
    Inches(0.65),  # Actual Result / Comments
    Inches(0.55),  # Tested By
    Inches(0.50)   # Test Date
]

modules_data = [
    {
        "title": "MODULE 1: AUTHENTICATION & MULTI-ROLE ACCESS CONTROL",
        "code": "AUTH",
        "cases": [
            (
                "AUTH-001", "Auth & Roles", "Resident Mobile Registration with Headcount",
                "1. Open EvacRoute Mobile app.\n2. Complete OnboardingScreen walkthrough and tap 'Register New Resident'.\n3. Fill in Full Name, Mobile Number, Barangay, Total Family Members (4), and Vulnerable flags (1 Elderly, 1 Infant).\n4. Set password and submit.",
                "Account created; digital household QR token generated and stored in AsyncStorage; resident redirected to Citizen Home Dashboard.",
                "Functional", "HIGH"
            ),
            (
                "AUTH-002", "Auth & Roles", "Mobile Input Validation & Duplicate Prevention",
                "1. Open Mobile app; attempt to register with an already registered phone number.\n2. Leave required household headcount field blank and submit.",
                "Validation error displayed: 'Contact already registered' or 'Family headcount required'; registration blocked.",
                "Functional", "HIGH"
            ),
            (
                "AUTH-003", "Auth & Roles", "Multi-Role Web & Mobile Portal Authentication",
                "1. [Web Suite]: Navigate to https://evacroute.app/admin/login; sign in as CDRRMO (drrm@lgu.gov.ph).\n2. [Web Logistics]: In private window, sign in as CSWDO Logistics (logistics@lgu.gov.ph).\n3. [Mobile Staff]: Open app, tap 'LGU Staff Portal Sign In', authenticate as Rescue QRT (rescue1@lgu.gov.ph) and Scanner (scanner1@lgu.gov.ph).",
                "Web users land on role-specific consoles (Tactical Map for CDRRMO, Inventory for CSWDO). Mobile staff navigate directly to operational portals (Rescue Duty or QR Scanner).",
                "Functional", "HIGH"
            ),
            (
                "AUTH-004", "Auth & Roles", "Role-Based Privilege Separation & Route Guarding",
                "1. [Web RBAC]: Log in to https://evacroute.app as CSWDO Logistics; attempt direct URL access to /admin/rescue-dispatch or /admin/map.\n2. [Mobile RBAC]: Log in to Mobile Staff Portal as Scanner (scanner1@lgu.gov.ph); verify Rescue Duty mission panel is restricted/hidden.\n3. [API Security]: Send POST request to https://evacroute.app/api/hazards using Scanner bearer token.",
                "Web navigation blocked with 403 Forbidden; mobile staff restricted strictly to scanner tools; backend API returns HTTP 403 for unauthorized endpoint calls.",
                "Security", "HIGH"
            ),
            (
                "AUTH-005", "Auth & Roles", "One-Tap Quick Login Development Role Chips",
                "1. [Web]: Navigate to https://evacroute.app/admin/login; click bottom role chips ('CDRRMO', 'CSWDO').\n2. [Mobile]: Open LoginScreen.jsx, tap 'LGU Staff Portal Sign In', click chips ('Scanner', 'Rescue QRT').",
                "Credentials automatically populate into matching fields, enabling rapid operational role switching.",
                "Usability", "LOW"
            ),
            (
                "AUTH-006", "Auth & Roles", "Staff Account Management & Privilege Revocation",
                "1. Log in to Web Suite as CDRRMO Administrator at https://evacroute.app/admin/staff.\n2. Create new field intake staff account.\n3. Deactivate an existing staff account.",
                "New account saved and can authenticate; deactivated staff account is blocked from login; active bearer tokens immediately revoked.",
                "Functional", "MEDIUM"
            )
        ]
    },
    {
        "title": "MODULE 2: CDRRMO TACTICAL MAP & HAZARD MANAGEMENT",
        "code": "HAZ",
        "cases": [
            (
                "HAZ-001", "Hazard Mgmt", "Tactical Map Multi-Layer Spatial Rendering",
                "1. Log in as CDRRMO Admin at https://evacroute.app/admin/map.\n2. Toggle map layers: Active Shelters, Hazard Zones, Road Closures, and Standby Fleet.",
                "All spatial layers load with emergency color codes (Rose-600: Hazards, Emerald-600: Open Shelters, Sky-600: Rescue Fleet).",
                "Functional", "HIGH"
            ),
            (
                "HAZ-002", "Hazard Mgmt", "Dynamic Hazard Zone Declaration",
                "1. On Tactical Map, click 'Declare Hazard Zone'.\n2. Select hazard type (Severe Flood), severity (High), radius (500m), and pin location in Barangay Tetuan.\n3. Save hazard declaration.",
                "Hazard polygon displays with rose-600 fill; WebSocket event broadcasts hazard zone to mobile navigation clients.",
                "Functional", "HIGH"
            ),
            (
                "HAZ-003", "Hazard Mgmt", "Road Network Edge Closure (Impassable Street)",
                "1. On Tactical Map, click specific street segment (e.g., Don Alfaro St).\n2. Set status to 'Impassable / Blocked' due to downed electrical post.\n3. Confirm status update.",
                "Street segment turns red with blockage pattern; edge weight set to infinite in backend routing graph.",
                "Functional", "HIGH"
            ),
            (
                "HAZ-004", "Hazard Mgmt", "Hazard Scenario Simulation Presets",
                "1. Open Hazard Controls panel on Web Admin.\n2. Select preset 'Typhoon Flood Simulation Preset'.\n3. Click 'Activate Preset'.",
                "Simulated flood polygons and 5 primary road closures simultaneously populate across map and routing engine.",
                "Functional", "MEDIUM"
            ),
            (
                "HAZ-005", "Hazard Mgmt", "Hazard Clearance & Road Restoration",
                "1. Select active hazard zone on Tactical Map.\n2. Click 'Resolve & Clear Hazard'.\n3. Confirm action.",
                "Hazard boundary removed; affected street segments restored to passable status; routing graph updates dynamically.",
                "Functional", "HIGH"
            )
        ]
    },
    {
        "title": "MODULE 3: CITIZEN INCIDENT REPORTING & REVIEW QUEUE",
        "code": "INC",
        "cases": [
            (
                "INC-001", "Incidents", "Citizen Mobile Incident Submission",
                "1. Open EvacRoute Mobile app as Resident.\n2. Tap 'Report Incident'.\n3. Select category 'Flash Flood / Rising Water', enter description, verify auto-detected GPS coordinates, and submit.",
                "Report submitted; confirmation toast shown; incident status appears as 'Pending Verification' under resident's report history.",
                "Functional", "HIGH"
            ),
            (
                "INC-002", "Incidents", "Incident Photo Evidence Capture",
                "1. In Report Incident screen, tap camera icon.\n2. Capture photo of flooded street.\n3. Submit report with image payload.",
                "Photo successfully compressed, uploaded to backend storage, and displayed in incident detail payload.",
                "Functional", "MEDIUM"
            ),
            (
                "INC-003", "Incidents", "CDRRMO Incident Review Queue Triage",
                "1. Log in as CDRRMO Admin at https://evacroute.app/admin/incidents.\n2. Inspect incoming citizen reports with timestamps, coordinates, and photo preview.",
                "All unverified citizen reports displayed in triage queue ordered by urgency and recency.",
                "Functional", "HIGH"
            ),
            (
                "INC-004", "Incidents", "Incident Approval & Hazard Promotion",
                "1. Open pending incident in Review Queue.\n2. Verify citizen photo and details.\n3. Click 'Approve & Promote to Active Hazard'.",
                "Report status changes to 'Approved'; incident automatically converted to active hazard polygon on public evacuation map.",
                "Functional", "HIGH"
            ),
            (
                "INC-005", "Incidents", "Incident Rejection & Reviewer Notes",
                "1. Open unverified incident report.\n2. Click 'Reject Incident'.\n3. Input rejection reason ('Duplicate report / Already attended') and confirm.",
                "Incident marked as 'Rejected'; removed from active triage queue; audit log records reviewer ID and reason.",
                "Functional", "MEDIUM"
            )
        ]
    },
    {
        "title": "MODULE 4: EVACUATION SHELTER OPERATIONS & DYNAMIC CAPACITY",
        "code": "SHEL",
        "cases": [
            (
                "SHEL-001", "Shelters", "New Evacuation Center Registration",
                "1. Log in as CDRRMO Admin at https://evacroute.app/admin/shelters.\n2. Click 'Add New Shelter'.\n3. Enter Name, Barangay, Max Capacity (500), Facilities (Medical, Generator, Kitchen), and Coordinates.\n4. Save shelter.",
                "Shelter record created; appears immediately in shelter directory and tactical map with 0% current occupancy.",
                "Functional", "HIGH"
            ),
            (
                "SHEL-002", "Shelters", "In-Place Edit Parity & Single-Surface Morphing",
                "1. On Shelter Management table, click 'Edit' on Tetuan Covered Court.\n2. Verify form fields unlock in-place without modal jump or layout shift.\n3. Update shelter contact and max capacity; click 'Save Changes'.",
                "Form fields update in exact 1:1 spatial grid; edits saved without CLS (Cumulative Layout Shift); reflects in view mode.",
                "Usability", "MEDIUM"
            ),
            (
                "SHEL-003", "Shelters", "Dynamic Capacity Color Thresholds",
                "1. View shelter with <80% capacity.\n2. Simulate intake check-ins until capacity reaches 85%.\n3. Continue intake until 100% capacity.",
                "Badge displays Safe Emerald (<80%), switches to Warning Amber (80-99%), and turns Danger Rose (100% Full) automatically.",
                "Functional", "HIGH"
            ),
            (
                "SHEL-004", "Shelters", "Shelter Status Manual Override",
                "1. Navigate to https://evacroute.app/admin/shelters.\n2. Manually change shelter operational status from 'Open' to 'Closed (Structural Hazard)'.\n3. Verify status on mobile resident map.",
                "Shelter displays 'Closed' status banner; routing engine stops directing evacuees to this destination.",
                "Functional", "HIGH"
            ),
            (
                "SHEL-005", "Shelters", "Shelter Multi-Filter & Amenity Search",
                "1. Open Shelter Directory.\n2. Filter by Barangay ('Tetuan'), Status ('Open Only'), and Amenity ('Generator').",
                "List instantly filters showing only matching shelters satisfying all applied criteria.",
                "Functional", "MEDIUM"
            )
        ]
    },
    {
        "title": "MODULE 5: DYNAMIC NAVIGATION & A* SAFE ROUTE PATHFINDING",
        "code": "NAV",
        "cases": [
            (
                "NAV-001", "Navigation", "Nearest Accessible Open Shelter Identification",
                "1. Open EvacRoute Mobile app as Resident.\n2. Grant GPS location permissions.\n3. Tap 'Find Nearest Shelter'.",
                "App detects location, calculates road distance to open shelters, and highlights the closest open facility with estimated walking time.",
                "Functional", "HIGH"
            ),
            (
                "NAV-002", "Navigation", "A* Hazard Avoidance Dynamic Pathfinding",
                "1. Pin active flood hazard across the primary highway between user and target shelter.\n2. Tap 'Start Evacuation Navigation'.",
                "A* algorithm routes path around the flooded zone, using alternative safe secondary streets. Hazardous zone is completely bypassed.",
                "Functional", "HIGH"
            ),
            (
                "NAV-003", "Navigation", "Dynamic Mid-Route Rerouting upon Broadcast",
                "1. Start active route navigation on mobile.\n2. While walking, CDRRMO Admin declares emergency road blockage on the active route.\n3. Observe mobile navigation screen.",
                "App receives Reverb alert, recalculates A* trajectory within 2 seconds, and notifies user with haptic alert and new path.",
                "Integration", "HIGH"
            ),
            (
                "NAV-004", "Navigation", "Turn-by-Turn Maneuver Guidance & Contrast",
                "1. Follow active evacuation route.\n2. Observe maneuver instruction cards, high-contrast directional arrows, and remaining distance indicators.",
                "Instructions display high-contrast cards meeting 7:1 ratio; updates smoothly as user GPS advances along the route line.",
                "Usability", "HIGH"
            )
        ]
    },
    {
        "title": "MODULE 6: EMERGENCY CITIZEN SOS DISTRESS BEACON",
        "code": "SOS",
        "cases": [
            (
                "SOS-001", "SOS Beacon", "One-Tap Trapped Citizen Panic Beacon",
                "1. Open EvacRoute Mobile app as Resident.\n2. Navigate to 'Report Incident' -> tap red 'EMERGENCY RESCUE SOS - TRAPPED CITIZEN BEACON'.\n3. Select trapped headcount (4) and confirm distress call.",
                "Distress beacon submitted with high-precision GPS coordinates, battery level, timestamp, and contact number. Heavy haptic vibration triggers.",
                "Functional", "HIGH"
            ),
            (
                "SOS-002", "SOS Beacon", "CDRRMO Real-Time Distress Queue Audio/Visual Ping",
                "1. Keep Web Rescue Dispatch (https://evacroute.app/admin/rescue-dispatch) open on CDRRMO console.\n2. Trigger SOS beacon from resident smartphone.",
                "Distress queue immediately displays new blinking red SOS card with emergency sound alert without manual page refresh.",
                "Integration", "HIGH"
            ),
            (
                "SOS-003", "SOS Beacon", "Offline Distress Caching & Auto-Flush",
                "1. Turn on Airplane Mode on mobile device.\n2. Trigger SOS Distress Beacon.\n3. Re-enable network connectivity.",
                "App caches SOS beacon payload locally; as soon as network handshake recovers, beacon auto-flushes to backend API.",
                "Recovery", "HIGH"
            ),
            (
                "SOS-004", "SOS Beacon", "Hotline Phone-In Manual SOS Intake",
                "1. On Web Rescue Dispatch console (https://evacroute.app/admin/rescue-dispatch), click 'Manual Hotline Intake'.\n2. Enter caller name, phone, pinned location, and trapped headcount reported via phone call.\n3. Submit dispatch intake.",
                "Phone-in distress call injected directly into active rescue triage queue with source badge 'Hotline Intake'.",
                "Functional", "MEDIUM"
            ),
            (
                "SOS-005", "SOS Beacon", "Direct-Dial Emergency Hotlines Directory",
                "1. On Mobile app, tap Emergency Contacts.\n2. Tap CDRRMO hotline number.\n3. Tap Red Cross hotline number.",
                "Native smartphone dialer opens immediately populated with correct pre-configured emergency phone number.",
                "Functional", "MEDIUM"
            )
        ]
    },
    {
        "title": "MODULE 7: RESCUE FLEET DISPATCH & MISSION LIFECYCLE",
        "code": "DISP",
        "cases": [
            (
                "DISP-001", "Fleet Dispatch", "Standby Fleet Readiness & Status Board",
                "1. Log in as CDRRMO Admin at https://evacroute.app/admin/rescue-dispatch.\n2. Verify fleet status cards for BOAT-ALPHA, MEDIC-1, and DELTA-3.",
                "Fleet board shows correct unit call sign, vehicle type, crew operator, passenger capacity, and standby status ('Available').",
                "Functional", "HIGH"
            ),
            (
                "DISP-002", "Fleet Dispatch", "Tactical Mission Assignment & Dispatch Order",
                "1. In Active Distress Queue, locate victim requiring water extraction.\n2. Click 'Deploy Unit' -> select BOAT-ALPHA.\n3. Assign mission priority and confirm dispatch.",
                "Unit status updates to 'Dispatched'; mission broadcasts immediately via WebSockets to rescuer's mobile device.",
                "Functional", "HIGH"
            ),
            (
                "DISP-003", "Fleet Dispatch", "Mobile Rescuer Mission Acceptance",
                "1. Log in to Mobile Staff Portal as rescue1@lgu.gov.ph.\n2. Open Rescue Duty Portal (RescueDutyScreen).\n3. Review assigned mission and tap '1. ACCEPT & EN ROUTE'.",
                "Mission status transitions to 'en_route'; CDRRMO tactical web map reflects en-route status badge; turn-by-turn navigation unlocks.",
                "Functional", "HIGH"
            ),
            (
                "DISP-004", "Fleet Dispatch", "Four-Stage Operational Mission Lifecycle",
                "1. As Rescuer, tap '2. ARRIVED ON SCENE' (status -> on_scene).\n2. Tap '3. VICTIMS SECURED ➔ TO SHELTER' (status -> transporting).\n3. Arrive at designated shelter; tap '4. MISSION COMPLETED'.",
                "State machine transitions sequentially; each status change logs timestamp and updates Web tactical dispatch console in real-time.",
                "Functional", "HIGH"
            ),
            (
                "DISP-005", "Fleet Dispatch", "Shoreline Staging Handover for Water Rescue Units",
                "1. Water rescue unit (BOAT-ALPHA) completes river extraction.\n2. At shoreline transfer zone, tap 'Transfer to Secondary Staging Fleet'.\n3. Select land transport unit (DELTA-3).",
                "Handover protocol logged; victims reassigned to land vehicle; BOAT-ALPHA returns to Standby water staging location.",
                "Functional", "HIGH"
            ),
            (
                "DISP-006", "Fleet Dispatch", "Automated Rescue-to-Shelter Headcount Bridge",
                "1. Rescuer completes mission turnover at Tetuan Covered Court.\n2. Check target shelter's current occupancy on Admin Dashboard.\n3. Inspect Evacuation Logs.",
                "Target shelter current count automatically incremented by rescued victim headcount; evacuation log entry created.",
                "Integration", "HIGH"
            )
        ]
    },
    {
        "title": "MODULE 8: SHELTER GATE INTAKE & OFFLINE QR SCANNING",
        "code": "SCAN",
        "cases": [
            (
                "SCAN-001", "Shelter Intake", "Resident Offline Digital QR ID Generation",
                "1. Log in to Mobile app as Resident.\n2. Switch device to Airplane Mode.\n3. Navigate to Digital ID tab.",
                "High-contrast QR code renders offline containing verified resident ID, family headcount, and signature hash.",
                "Functional", "HIGH"
            ),
            (
                "SCAN-002", "Shelter Intake", "Rapid Camera QR Scanning & Headcount Intake",
                "1. Log in to Mobile app as scanner1@lgu.gov.ph.\n2. Open Scanner tab (StaffScannerScreen).\n3. Scan resident digital QR ID from another phone screen.",
                "QR decoded in <1s; family name, registered headcount (+4), and vulnerable members display; shelter occupancy incremented.",
                "Functional", "HIGH"
            ),
            (
                "SCAN-003", "Shelter Intake", "Resident Geofence Auto Check-In",
                "1. Resident with active mobile app arrives physically inside 50m geofence perimeter of open shelter.\n2. Inspect backend CheckInController.",
                "Geofence arrival detected; resident receives prompt confirming shelter arrival; auto-check-in logged.",
                "Integration", "MEDIUM"
            ),
            (
                "SCAN-004", "Shelter Intake", "Manual Intake Search & Departure Check-Out",
                "1. Scanner staff switches to Manual Roster mode.\n2. Search resident by last name.\n3. Process manual check-in; then simulate departure check-out.",
                "Resident found; manual check-in recorded; check-out decrements shelter occupancy count accurately.",
                "Functional", "MEDIUM"
            ),
            (
                "SCAN-005", "Shelter Intake", "One-Tap Relief Claiming & Duplicate Prevention",
                "1. At shelter distribution gate, staff scans resident QR in Relief Mode.\n2. Tap 'Issue Meal Ration Pack'.\n3. Immediately scan the same resident QR again.",
                "First scan logs ration claimed; second scan immediately displays warning: 'RATION ALREADY CLAIMED for Current Cycle'.",
                "Functional", "HIGH"
            )
        ]
    },
    {
        "title": "MODULE 9: CSWDO RELIEF INVENTORY & RATION LOGISTICS",
        "code": "LOG",
        "cases": [
            (
                "LOG-001", "Logistics", "Warehouse Relief Stock Management",
                "1. Log in as CSWDO Logistics (logistics@lgu.gov.ph) at https://evacroute.app/admin/inventory.\n2. View current stock levels (Rice Sacks, Canned Goods, Mineral Water, Hygiene Kits).\n3. Perform manual stock adjustment (+50 boxes).",
                "Stock balance updates immediately; audit record generated documenting warehouse adjustment.",
                "Functional", "HIGH"
            ),
            (
                "LOG-002", "Logistics", "Dynamic Relief Need Calculation per Shelter",
                "1. Navigate to https://evacroute.app/admin/relief-distribution.\n2. Select active shelter (Tetuan Covered Court with 250 evacuees).\n3. Apply 'Standard 3-Day Family Food Pack' template.",
                "System multiplies total evacuee count by template ratios; calculates exact required commodity amounts automatically.",
                "Functional", "HIGH"
            ),
            (
                "LOG-003", "Logistics", "Automated 20% Emergency Contingency Buffer",
                "1. View computed commodity demand for shelter (e.g., 250 packs).\n2. Inspect contingency line item on dispatch calculation.",
                "System automatically computes and appends +20% emergency buffer (+50 packs = 300 total) to prevent mid-disaster stockouts.",
                "Functional", "HIGH"
            ),
            (
                "LOG-004", "Logistics", "Dispatch Order Creation & Inventory Deduction",
                "1. Click 'Generate Dispatch Order' for calculated shelter requirement.\n2. Confirm dispatch departure.\n3. Check warehouse inventory levels.",
                "Dispatch order status set to 'In Transit'; matching quantity automatically deducted from warehouse inventory.",
                "Functional", "HIGH"
            ),
            (
                "LOG-005", "Logistics", "Printable Relief Distribution Manifest",
                "1. On completed dispatch order, click 'Print Dispatch Manifest'.\n2. Inspect browser print preview window.",
                "Clean printable transfer manifest renders formatted with items, shelter destination, and signature blocks for Custodian and Transporter.",
                "Usability", "MEDIUM"
            )
        ]
    },
    {
        "title": "MODULE 10: WEATHER & EARLY WARNING FEEDS",
        "code": "WEATH",
        "cases": [
            (
                "WEATH-001", "Weather", "Live PAGASA Weather & Storm Signal Integration",
                "1. Open Web Command Suite at https://evacroute.app/admin/map or Mobile Weather widget.\n2. Inspect live weather status query (https://evacroute.app/api/weather/live-status).\n3. Verify storm warning signal level and rainfall rate.",
                "App renders active typhoon advisory, wind speed, and color-coded rainfall warning matching official meteorological data.",
                "Integration", "HIGH"
            ),
            (
                "WEATH-002", "Weather", "Threshold-Triggered Pre-Emptive Flood Advisory",
                "1. Simulate high-intensity rainfall accumulation exceeding 50mm/hr.\n2. Observe CDRRMO early warning console.",
                "System triggers 'Pre-emptive Evacuation Recommended' prompt for low-lying barangays along river basins.",
                "Functional", "HIGH"
            ),
            (
                "WEATH-003", "Weather", "Weather Feed Offline Caching & Fallback",
                "1. Disconnect mobile device from Internet.\n2. Open Weather status tab.\n3. Verify fallback behavior.",
                "Screen shows 'Cached Weather Advisory' with last-updated timestamp and offline indicator without crashing.",
                "Recovery", "MEDIUM"
            )
        ]
    },
    {
        "title": "MODULE 11: RESIDENT LOCATION TRACKING & EVACUEE STATUS",
        "code": "RES",
        "cases": [
            (
                "RES-001", "Resident Status", "Active Evacuation GPS Breadcrumb Tracking",
                "1. Resident commences navigation toward shelter on Mobile.\n2. App posts periodic background coordinates to POST https://evacroute.app/api/user/location.\n3. CDRRMO inspects resident tactical density map on Web.",
                "Resident location updates securely; CDRRMO can visualize evacuee clusters actively en route to centers.",
                "Functional", "HIGH"
            ),
            (
                "RES-002", "Resident Status", "Resident Safe Status & Assigned Shelter Check",
                "1. Resident queries GET https://evacroute.app/api/my-status.\n2. Verify displayed shelter assignment, check-in status, and ration eligibility.",
                "Displays real-time status: 'Safely Checked-In at Tetuan Covered Court' or 'In Transit', with active family headcount.",
                "Functional", "MEDIUM"
            ),
            (
                "RES-003", "Resident Status", "FCM Push Notification Device Token Binding",
                "1. Resident launches mobile app and grants notification permission.\n2. Inspect POST https://evacroute.app/api/user/push-token payload.",
                "Unique FCM token successfully registered to user ID, enabling targeted emergency broadcast push alerts.",
                "Functional", "MEDIUM"
            ),
            (
                "RES-004", "Resident Status", "Mobile Emergency Alert History Log",
                "1. Open Mobile app as Resident.\n2. Navigate to Alert History Screen (AlertHistoryScreen.jsx).\n3. Review list of previous emergency warnings and road closure advisories.",
                "Historical alerts display in reverse chronological order with timestamp, severity level, and read/unread status.",
                "Usability", "LOW"
            )
        ]
    },
    {
        "title": "MODULE 12: SYSTEM HEALTH, DATABASE BACKUP & HOUSEKEEPING",
        "code": "SYS",
        "cases": [
            (
                "SYS-001", "System Health", "Live System Health & API Performance Monitoring",
                "1. Log in as System Admin at https://evacroute.app/admin/system-health.\n2. Verify Database, Redis/Reverb, Disk Storage, and Cache service indicators.",
                "All subsystem indicators display green 'Operational' health badge with query latency metrics under 100ms.",
                "Functional", "HIGH"
            ),
            (
                "SYS-002", "System Health", "On-Demand Disaster Database Backup",
                "1. In Settings panel, trigger 'Run Instant Database Backup' (POST https://evacroute.app/api/settings/backup).\n2. Verify creation of compressed backup archive in storage/backups.",
                "Complete database dump created with timestamped archive; non-blocking operation completes in <5 seconds.",
                "Recovery", "HIGH"
            ),
            (
                "SYS-003", "System Health", "Disaster Log Housekeeping & Cache Invalidation",
                "1. Trigger 'Clear Stale Caches & Expired Transient Alerts' (POST https://evacroute.app/api/settings/housekeeping).\n2. Check application memory and Redis keys.",
                "Expired alerts and stale routing temp caches purged; active shelters, user sessions, and critical logs preserved intact.",
                "Functional", "MEDIUM"
            )
        ]
    },
    {
        "title": "MODULE 13: REAL-TIME BROADCASTS & LARAVEL REVERB WEBSOCKETS",
        "code": "RT",
        "cases": [
            (
                "RT-001", "Real-Time Sync", "CDRRMO Emergency Alert Broadcast Blast",
                "1. As CDRRMO Admin, open https://evacroute.app/admin/alerts.\n2. Compose emergency alert: 'Flash Flood Warning: Evacuate Low-Lying Areas in Tetuan'.\n3. Click 'Broadcast Alert'.",
                "Alert broadcasts via Reverb WebSockets (wss://evacroute.app:443); audio chime and high-contrast banner appear across all open web and mobile screens within 2s.",
                "Integration", "HIGH"
            ),
            (
                "RT-002", "Real-Time Sync", "Live Shelter Occupancy Synchronization",
                "1. Open Shelter Management on Web (https://evacroute.app/admin/shelters).\n2. On mobile phone, scanner checks in family of 5.\n3. Observe Web Shelter Dashboard without refreshing page.",
                "Shelter count and progress bar increment by 5 within 3 seconds via WebSocket channel without manual reload.",
                "Integration", "HIGH"
            ),
            (
                "RT-003", "Real-Time Sync", "Live Rescue Fleet GPS Position Tracking",
                "1. Rescuer advances along route in Mobile Staff mode.\n2. CDRRMO monitors Tactical Map console at https://evacroute.app/admin/map.",
                "Rescue vehicle pin (BOAT-ALPHA) updates its position dynamically along the map coordinates in real-time.",
                "Integration", "HIGH"
            )
        ]
    },
    {
        "title": "MODULE 14: DRRM REPORTING, SITUATION REPORT & AUDIT LOGS",
        "code": "REP",
        "cases": [
            (
                "REP-001", "Reporting", "Automated DRRM Situation Report (SitRep)",
                "1. Log in as CDRRMO Administrator at https://evacroute.app/admin/situation-report.\n2. Generate official SitRep.",
                "Consolidated SitRep generated summarizing: Total Evacuees, Open Shelters, Road Closures, Active Missions, and Relief Kits Dispatched.",
                "Functional", "HIGH"
            ),
            (
                "REP-002", "Reporting", "Barangay Population-at-Risk Summary",
                "1. Open Resident Registry at https://evacroute.app/admin/residents.\n2. Filter by Barangay summary.",
                "Summary table displays total registered residents, vulnerable individuals count (elderly, infants, PWDs), and evacuation status.",
                "Functional", "MEDIUM"
            ),
            (
                "REP-003", "Reporting", "System-Wide Non-Repudiable Audit Logging",
                "1. Navigate to Audit Logs at https://evacroute.app/admin/audit-logs.\n2. Perform hazard creation, shelter update, and dispatch mission.\n3. Check audit log stream.",
                "Every administrative action logged with User ID, IP address, timestamp, action type, and before/after JSON delta.",
                "Security", "HIGH"
            )
        ]
    },
    {
        "title": "MODULE 15: NON-FUNCTIONAL REQUIREMENTS & RESILIENCE",
        "code": "NF",
        "cases": [
            (
                "NF-001", "Non-Functional", "Zero-Connectivity Offline Resilience",
                "1. Load app on mobile device; put into Airplane Mode.\n2. Navigate through Digital QR ID, cached shelter list, and emergency hotlines.",
                "All pre-cached emergency screens render without crashing or displaying empty blank errors.",
                "Recovery", "HIGH"
            ),
            (
                "NF-002", "Non-Functional", "WebSocket Automatic Re-sync after Network Drop",
                "1. Connect mobile app to live Reverb WebSocket (wss://evacroute.app:443).\n2. Disconnect Wi-Fi for 30 seconds; then reconnect.",
                "WebSocket connection automatically re-establishes within 5 seconds; missing state events re-synced from API.",
                "Recovery", "HIGH"
            ),
            (
                "NF-003", "Non-Functional", "Emergency Touch Target Ergonomics & Contrast",
                "1. Inspect mobile UI components (SOS Trigger, Start Navigation, Accept Mission).\n2. Test accessibility on physical smartphone with one-handed thumb use.",
                "Action buttons adhere to minimum 56x56pt touch targets; text meets WCAG AA 7:1 contrast for high-stress usability.",
                "Usability", "HIGH"
            ),
            (
                "NF-004", "Non-Functional", "API Response Latency under Standard Mobile Bandwidth",
                "1. Execute critical REST endpoints (https://evacroute.app/api/resident/map-data, https://evacroute.app/api/shelters/active) over throttled 3G/LTE connection.\n2. Record response times.",
                "Endpoints respond in <1.5 seconds; payload sizes optimized via JSON bundling to preserve mobile battery and bandwidth.",
                "Performance", "HIGH"
            ),
            (
                "NF-005", "Non-Functional", "API Security, HTTPS & Token Expiration",
                "1. Attempt accessing protected endpoints with expired or forged Bearer token.\n2. Inspect network headers in browser DevTools.",
                "Unauthorized requests return 401 Unauthorized; all transmissions enforced over HTTPS (TLS); passwords and tokens never exposed in clear text.",
                "Security", "HIGH"
            )
        ]
    },
    {
        "title": "MODULE 16: END-TO-END OPERATIONAL LIFECYCLE FLOWS",
        "code": "FLOW",
        "cases": [
            (
                "FLOW-001", "E2E Rescue Flow", "Trapped Citizen SOS to Shelter Intake Turnover",
                "1. [Resident Mobile]: Trigger SOS Distress Beacon for 4 trapped persons.\n2. [CDRRMO Web]: At https://evacroute.app/admin/rescue-dispatch, hear acoustic ping; view SOS beacon in triage queue; click 'Deploy Unit' -> assign BOAT-ALPHA.\n3. [Rescuer Mobile]: On RescueDutyScreen, accept mission ('en_route'); arrive on scene ('on_scene'); secure victims ('transporting').\n4. [Turnover]: Transport to Tetuan Covered Court; tap '4. MISSION COMPLETED'.\n5. [Verify]: Check Tetuan Covered Court occupancy on Web.",
                "End-to-end chain completes seamlessly: distress broadcasts to command in real-time, rescuer steps through operational states, and target shelter's current occupancy increments by exactly 4 without manual intake entry.",
                "Integration", "HIGH"
            ),
            (
                "FLOW-002", "E2E Routing Flow", "Dynamic Hazard Broadcast & Live Mid-Route Recalculation",
                "1. [Resident Mobile]: Start A* evacuation navigation toward designated open shelter.\n2. [CDRRMO Web]: At https://evacroute.app/admin/map, pin sudden road closure / flash flood on the exact street the resident is currently routed through.\n3. [Reverb WebSocket]: Emergency alert broadcast blasts to active devices.\n4. [Resident Mobile]: Observe navigation trajectory and directions without touching phone.",
                "Mobile receives real-time hazard broadcast, triggers alert vibration, and recalculates safe alternative A* route in <2 seconds, steering resident completely clear of the newly closed road.",
                "Integration", "HIGH"
            ),
            (
                "FLOW-003", "E2E Logistics Flow", "Shelter Evacuee Surge to Gate Relief Claim & Fraud Block",
                "1. [Shelter Gate Mobile]: StaffScannerScreen logs arrival of 50 new families (200 persons).\n2. [CSWDO Web]: At https://evacroute.app/admin/relief-distribution, live demand updates; officer applies Family Food Pack ration template + 20% contingency buffer; approves dispatch order.\n3. [Warehouse]: Stock deducted; printable manifest generated and signed.\n4. [Distribution Gate Mobile]: Resident presents Digital QR ID; staff scans in Relief Claim Mode; ration pack marked claimed.\n5. [Fraud Check]: Resident attempts second claim within the same cycle.",
                "Logistics lifecycle completes accurately: dynamic demand computes correctly with contingency, inventory updates, relief claim logs immediately, and immediate second scan is rejected with 'Already Claimed' alert.",
                "Integration", "HIGH"
            ),
            (
                "FLOW-004", "E2E Amphibious Flow", "Rapid Shoreline Staging Handover (Boat to Land Transport)",
                "1. [Water Fleet Mobile]: BOAT-ALPHA extracts 8 flood victims from submerged riverside.\n2. [Shoreline Staging]: Boat reaches dry perimeter (cannot traverse streets); rescuer selects 'Shoreline Staging Handover'.\n3. [Secondary Fleet]: Transfer victims to standby 4x4 Heavy Rescue Truck (DELTA-3).\n4. [Land Transport Mobile]: DELTA-3 navigates evacuees to inland school gymnasium.\n5. [Shelter Intake]: Final turnover executed at gymnasium gate.",
                "Operational transfer protocol maintains chain of custody; victims transferred to land vehicle; BOAT-ALPHA returns to Standby water staging; gymnasium records arrival of 8 evacuees.",
                "Integration", "HIGH"
            ),
            (
                "FLOW-005", "E2E De-escalation", "Disaster De-escalation, Resident Check-Out & Audit Trail",
                "1. [CDRRMO Web]: At https://evacroute.app/admin/map, declare flood waters receded; resolve active hazard zones; lower alert level.\n2. [Shelter Gate Mobile]: Evacuee families prepare for home return; staff scans QR code in Check-Out Mode.\n3. [Occupancy]: Shelter occupancy decrements in real-time on Web and Mobile dashboards.\n4. [Audit Trail]: Navigate to Situation Report (https://evacroute.app/admin/situation-report) and Audit Logs (https://evacroute.app/admin/audit-logs).",
                "Shelter capacity restores to green; check-out events logged with timestamps; consolidated SitRep archive records accurate duration of stay and total relief consumed for post-disaster audit.",
                "Integration", "HIGH"
            )
        ]
    }
]

for mod in modules_data:
    p_head = doc.add_paragraph()
    p_head.paragraph_format.space_before = Pt(14)
    p_head.paragraph_format.space_after = Pt(3)
    p_head.paragraph_format.keep_with_next = True
    
    run_head = p_head.add_run(mod["title"])
    run_head.bold = True
    run_head.font.size = Pt(10.5)
    run_head.font.color.rgb = RGBColor(15, 23, 42)
    
    t = doc.add_table(rows=len(mod["cases"]) + 1, cols=11)
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    t.autofit = False
    
    hdr_row = t.rows[0]
    trPr = hdr_row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
    
    for i, col_name in enumerate(COL_HEADERS):
        cell = hdr_row.cells[i]
        cell.width = COL_WIDTHS[i]
        set_cell_background(cell, "1E293B")
        set_cell_margins(cell, 70, 70, 50, 50)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        make_run(p, col_name, size=8, bold=True, color=RGBColor(255, 255, 255))
    
    for r_idx, c_data in enumerate(mod["cases"]):
        row = t.rows[r_idx + 1]
        r_trPr = row._tr.get_or_add_trPr()
        r_trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        
        test_id, module_col, criteria, steps, expected, test_type, priority = c_data
        
        prio_bg = "FFFFFF"
        prio_color = RGBColor(30, 41, 59)
        if priority == "HIGH":
            prio_bg = "FEE2E2"
            prio_color = RGBColor(185, 28, 28)
        elif priority == "MEDIUM":
            prio_bg = "FEF3C7"
            prio_color = RGBColor(180, 83, 9)
        elif priority == "LOW":
            prio_bg = "E0F2FE"
            prio_color = RGBColor(3, 105, 161)
        
        row_vals = [
            (test_id, WD_ALIGN_PARAGRAPH.CENTER, True, "F8FAFC", RGBColor(15, 23, 42)),
            (module_col, WD_ALIGN_PARAGRAPH.LEFT, False, "FFFFFF", RGBColor(51, 65, 85)),
            (criteria, WD_ALIGN_PARAGRAPH.LEFT, False, "FFFFFF", RGBColor(15, 23, 42)),
            (steps, WD_ALIGN_PARAGRAPH.LEFT, False, "FFFFFF", RGBColor(51, 65, 85)),
            (expected, WD_ALIGN_PARAGRAPH.LEFT, False, "FFFFFF", RGBColor(51, 65, 85)),
            (test_type, WD_ALIGN_PARAGRAPH.CENTER, False, "FFFFFF", RGBColor(71, 85, 105)),
            (priority, WD_ALIGN_PARAGRAPH.CENTER, True, prio_bg, prio_color),
            ("", WD_ALIGN_PARAGRAPH.CENTER, False, "FFFFFF", RGBColor(0, 0, 0)),
            ("", WD_ALIGN_PARAGRAPH.LEFT, False, "FFFFFF", RGBColor(0, 0, 0)),
            ("", WD_ALIGN_PARAGRAPH.CENTER, False, "FFFFFF", RGBColor(0, 0, 0)),
            ("", WD_ALIGN_PARAGRAPH.CENTER, False, "FFFFFF", RGBColor(0, 0, 0))
        ]
        
        for c_idx, (val, align, is_b, bg, txt_col) in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.width = COL_WIDTHS[c_idx]
            if bg != "FFFFFF":
                set_cell_background(cell, bg)
            set_cell_margins(cell, 50, 50, 45, 45)
            p = cell.paragraphs[0]
            p.alignment = align
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            make_run(p, val, size=8, bold=is_b, color=txt_col)
            
    set_table_borders(t, color="D1D5DB")

# Sign-Off Section (Preserving user's customized 3 team members)
p_so = doc.add_paragraph()
p_so.paragraph_format.space_before = Pt(18)
p_so.paragraph_format.space_after = Pt(4)
p_so.paragraph_format.keep_with_next = True
r_so = p_so.add_run("UAT SIGN-OFF & APPROVAL MATRIX")
r_so.bold = True
r_so.font.size = Pt(11)
r_so.font.color.rgb = RGBColor(15, 23, 42)

so_table = doc.add_table(rows=4, cols=5)
so_table.alignment = WD_TABLE_ALIGNMENT.LEFT
so_table.autofit = False

so_widths = [Inches(2.6), Inches(2.3), Inches(1.8), Inches(1.3), Inches(2.2)]
for row in so_table.rows:
    for i, w in enumerate(so_widths):
        row.cells[i].width = w

so_headers = ["Role", "Name", "Signature", "Date Signed", "Remarks"]
for i, h in enumerate(so_headers):
    c = so_table.rows[0].cells[i]
    set_cell_background(c, "1E293B")
    set_cell_margins(c, 70, 70, 60, 60)
    p = c.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    make_run(p, h, size=8.5, bold=True, color=RGBColor(255, 255, 255))

so_roles = [
    ("Project Manager / Technical Lead", "Pheinz (Technical Lead)"),
    ("Lead QA / Tester", "Jenson Canones"),
    ("Ass. QA / Documentation", "Erica Aquino")
]

for idx, (role, name) in enumerate(so_roles):
    row = so_table.rows[idx + 1]
    r_trPr = row._tr.get_or_add_trPr()
    r_trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
    
    # Role
    c0 = row.cells[0]
    set_cell_background(c0, "F8FAFC")
    set_cell_margins(c0, 70, 70, 60, 60)
    p0 = c0.paragraphs[0]
    p0.paragraph_format.space_after = Pt(0)
    make_run(p0, role, size=8.5, bold=True, color=RGBColor(30, 41, 59))
    
    # Name
    c1 = row.cells[1]
    set_cell_margins(c1, 70, 70, 60, 60)
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(0)
    make_run(p1, name, size=8.5, color=RGBColor(51, 65, 85))
    
    # Signature (blank for physical sign)
    c2 = row.cells[2]
    set_cell_margins(c2, 70, 70, 60, 60)
    
    # Date Signed
    c3 = row.cells[3]
    set_cell_margins(c3, 70, 70, 60, 60)
    
    # Remarks
    c4 = row.cells[4]
    set_cell_margins(c4, 70, 70, 60, 60)

set_table_borders(so_table, color="D1D5DB")

linux_path = "/home/pheinz/Evac_Route/UAT_Form_EvacRoute.docx"
windows_path = "/mnt/c/Users/ASUS TUF A5/Downloads/UAT_Form_EvacRoute.docx"

doc.save(linux_path)
print(f"Saved successfully to Linux: {linux_path}")

try:
    doc.save(windows_path)
    print(f"Saved successfully to Windows: {windows_path}")
except Exception as e:
    print(f"Error saving to Windows: {e}")
