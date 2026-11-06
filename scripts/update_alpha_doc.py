import docx

doc_path = '/mnt/c/Users/ASUS TUF A5/Downloads/AlphaTesting_EvacRoute-Revised-FromGDrive.docx'
doc = docx.Document(doc_path)

# Updates for test steps and expected results
# Specifically desk-simulation steps for untested cases + URL fixes for failed ones
updates = {
    'AUTH-004': {
        'steps': "1. [Web RBAC]: On laptop browser, log in to https://evacroute.app as CSWDO Logistics (logistics@lgu.gov.ph); attempt direct URL access to /admin/rescue-dispatch or /admin/map.\n2. [Mobile RBAC]: Log in to Mobile Staff Portal as Scanner (scanner1@lgu.gov.ph); verify Rescue Duty mission dispatch controls are hidden/inaccessible.\n3. [API Security]: Test API endpoint protection (POST https://evacroute.app/api/hazards) using a Scanner token.",
        'expected': "Web navigation blocked with 403 Forbidden alert; mobile staff portal strictly restricted to scanner intake tools; backend API returns HTTP 403."
    },
    'LOG-002': {
        # Keep result & comments, just fix test steps for clarity
        'steps': "1. Log in as CSWDO Logistics at https://evacroute.app/admin/inventory.\n2. Click the 'Relief Distribution / Rations' tab.\n3. Select active shelter (Tetuan Covered Court with 250 evacuees).\n4. Apply 'Standard 3-Day Family Food Pack' ration template.",
        'expected': "System multiplies total evacuee count by template commodity ratios; calculates required amounts automatically."
    },
    'REP-001': {
        # Keep result & comments, just fix test steps for clarity
        'steps': "1. Log in as CDRRMO Administrator.\n2. Navigate to https://evacroute.app/admin/sitrep (or click 'Situation Report' in sidebar navigation).\n3. Click 'Generate Official SitRep'.",
        'expected': "Consolidated SitRep generated summarizing: Total Evacuees, Open Shelters, Road Closures, Active Missions, and Relief Kits Dispatched."
    },
    'DISP-005': {
        'steps': "1. [Desk Simulation]: On phone, log in to Mobile Staff Portal as rescue1@lgu.gov.ph.\n2. Open Rescue Duty screen with an active mission assigned to BOAT-ALPHA.\n3. Tap 'Transfer to Secondary Fleet' (Shoreline Staging Handover).\n4. Select standby ground truck (DELTA-3) from the dropdown and confirm transfer.",
        'expected': "Handover protocol logged; victims reassigned to land vehicle; BOAT-ALPHA status resets to 'Standby' without requiring physical travel."
    },
    'DISP-006': {
        'steps': "1. [Desk Simulation]: On laptop, open https://evacroute.app/admin/shelters; note current occupancy of Tetuan Covered Court.\n2. On phone, in Rescue Duty screen, complete mission turnover for 4 rescued victims at Tetuan Covered Court (tap '4. MISSION COMPLETED').\n3. On laptop, observe the shelter occupancy without refreshing.",
        'expected': "Target shelter current count automatically incremented by exactly 4 rescued victims; evacuation log record created for CSWDO auditing."
    },
    'SCAN-005': {
        'steps': "1. [Desk Simulation]: On phone, open StaffScannerScreen in Relief Claim Mode.\n2. Scan resident QR code from a second screen (or enter QR hash manually).\n3. Tap 'Issue Meal Ration Pack'.\n4. Immediately scan or enter the same resident QR again.",
        'expected': "First scan records ration claimed; second scan immediately displays warning: 'RATION ALREADY CLAIMED for Current Cycle'."
    },
    'WEATH-002': {
        'steps': "1. [Desk Simulation]: On laptop, navigate to CDRRMO Tactical Map (https://evacroute.app/admin/map).\n2. Open Weather Advisory panel and review simulated high-rainfall alert (>50mm/hr).\n3. Verify pre-emptive evacuation advisory recommendations for river basin barangays.",
        'expected': "System triggers 'Pre-emptive Evacuation Recommended' advisory prompt for low-lying barangays along river basins."
    },
    'RES-001': {
        'steps': "1. [Desk Simulation]: On mobile app as Resident, open Map and tap 'Start Navigation'.\n2. Inspect network traffic / backend logs for periodic background POST https://evacroute.app/api/user/location.\n3. On laptop Tactical Map (https://evacroute.app/admin/map), verify resident coordinate pin updates.",
        'expected': "Resident location updates securely; CDRRMO console visualizes evacuee coordinates actively en route."
    },
    'RES-002': {
        'steps': "1. [Desk Simulation]: On mobile app as Resident, navigate to Profile / My Status screen.\n2. Check displayed shelter assignment, check-in status, and registered family headcount.",
        'expected': "Displays real-time status: 'Safely Checked-In at Tetuan Covered Court' or 'Registered - En Route', with active family headcount."
    },
    'RES-003': {
        'steps': "1. [Desk Simulation]: Launch mobile app on phone; grant notification permission when prompted.\n2. Inspect POST https://evacroute.app/api/user/push-token in API network requests.",
        'expected': "Unique FCM token successfully registered to user ID, enabling targeted emergency broadcast push alerts."
    },
    'RES-004': {
        'steps': "1. [Desk Simulation]: On mobile app, tap the Bell / Notification icon to open AlertHistoryScreen.\n2. Review list of previous emergency warnings and road closure advisories.",
        'expected': "Historical alerts display in reverse chronological order with timestamp, severity level, and read/unread status."
    },
    'SYS-002': {
        'steps': "1. [Desk Simulation]: On laptop, log in as Admin at https://evacroute.app/admin/system-health.\n2. Click 'Run Instant Database Backup' (POST https://evacroute.app/api/settings/backup).\n3. Verify confirmation message.",
        'expected': "Complete database dump created with timestamped archive in storage/backups; completes in <5 seconds."
    },
    'SYS-003': {
        'steps': "1. [Desk Simulation]: On laptop, in System Health panel, click 'Clear Stale Caches & Expired Transient Alerts' (POST https://evacroute.app/api/settings/housekeeping).\n2. Check confirmation prompt.",
        'expected': "Expired alerts and stale routing temp caches purged; active shelters, user sessions, and critical logs preserved intact."
    },
    'NF-002': {
        'steps': "1. [Desk Simulation]: On phone, open EvacRoute app connected to live Reverb WebSocket (wss://evacroute.app:443).\n2. Turn on Airplane Mode for 15 seconds; then turn Airplane Mode off.\n3. Observe connection status indicator.",
        'expected': "WebSocket connection automatically re-establishes within 5 seconds; missing state events re-synced from API without app restart."
    },
    'NF-004': {
        'steps': "1. [Desk Simulation]: Open browser DevTools Network tab on laptop.\n2. Execute critical REST endpoints (https://evacroute.app/api/resident/map-data, https://evacroute.app/api/shelters/active).\n3. Record response times.",
        'expected': "Endpoints respond in <1.5 seconds; payload sizes optimized via JSON bundling to preserve mobile battery and bandwidth."
    },
    'NF-005': {
        'steps': "1. [Desk Simulation]: Attempt accessing protected endpoint (e.g., https://evacroute.app/api/rescue/missions) with expired or missing Bearer token.\n2. Inspect network headers.",
        'expected': "Unauthorized requests return 401 Unauthorized; all transmissions enforced over HTTPS (TLS); passwords/tokens never exposed in clear text."
    },
    'FLOW-001': {
        'steps': "1. [Phone 1 - Resident]: Tap 'EMERGENCY RESCUE SOS - TRAPPED CITIZEN BEACON', enter trapped headcount (4), tap Confirm.\n2. [Laptop - CDRRMO]: At https://evacroute.app/admin/rescue-dispatch, hear acoustic ping; view SOS card in queue; click 'Deploy Unit' -> select BOAT-ALPHA.\n3. [Phone 2 - Rescuer]: On RescueDutyScreen, tap '1. Accept & En Route' -> '2. Arrived on Scene' -> '3. Victims Secured' -> '4. Mission Completed (Turnover)'.\n4. [Laptop - Verify]: Observe Tetuan Covered Court occupancy at https://evacroute.app/admin/shelters.",
        'expected': "Full lifecycle completes at desk in <2 minutes; target shelter occupancy increments automatically by +4 without physical travel."
    },
    'FLOW-002': {
        'steps': "1. [Phone - Resident]: Tap 'Find Nearest Shelter' -> 'Start Evacuation Navigation'.\n2. [Laptop - CDRRMO]: At https://evacroute.app/admin/map, click street on active route (e.g. Don Alfaro St) -> set to 'Impassable / Blocked'.\n3. [Phone - Observe]: Watch phone screen without touching it.",
        'expected': "Phone receives WebSocket broadcast, vibrates, and redraws alternative safe A* route bypassing blocked street in <2 seconds."
    },
    'FLOW-003': {
        'steps': "1. [Laptop - CSWDO]: At https://evacroute.app/admin/inventory (Relief tab), select shelter with evacuees; apply ration template + 20% contingency buffer; click 'Generate Dispatch Order'.\n2. [Phone - Resident]: Display Digital QR ID on screen.\n3. [Phone - Scanner]: In StaffScannerScreen, scan resident QR; issue ration pack.\n4. [Fraud Attempt]: Immediately scan the same resident QR again.",
        'expected': "Logistics lifecycle completes accurately: dynamic demand computes correctly with contingency, inventory updates, relief claim logs immediately, and duplicate scan is rejected with 'Already Claimed' alert."
    },
    'FLOW-004': {
        'steps': "1. [Phone - Rescuer]: On RescueDutyScreen assigned to BOAT-ALPHA, tap 'Transfer to Secondary Fleet' (Shoreline Staging Handover).\n2. Select standby land vehicle DELTA-3 and confirm transfer.\n3. Switch duty to DELTA-3; tap 'Mission Completed' at target shelter.\n4. [Laptop - Verify]: Observe shelter occupancy at https://evacroute.app/admin/shelters.",
        'expected': "Operational transfer protocol maintains chain of custody at desk; victims transferred to land vehicle; BOAT-ALPHA returns to Standby; shelter records arrival of victims."
    },
    'FLOW-005': {
        'steps': "1. [Laptop - CDRRMO]: At https://evacroute.app/admin/map, resolve active flood hazard.\n2. [Phone - Scanner]: In StaffScannerScreen, switch to Check-Out mode; scan resident QR (or lookup name).\n3. [Laptop - Verify]: Observe shelter occupancy decrement in real-time on https://evacroute.app/admin/shelters.\n4. [Audit Trail]: Navigate to https://evacroute.app/admin/audit-logs to verify non-repudiable log entry.",
        'expected': "Shelter occupancy decrements safely; check-out events logged with timestamps; consolidated SitRep archive records accurate duration of stay."
    }
}

count_updated = 0
for t in doc.tables[2:18]:
    for r in t.rows[1:]:
        cells = r.cells
        tid = cells[0].text.strip()
        
        # Clean ID typo if needed
        if tid == 'rSHEL-005':
            cells[0].paragraphs[0].text = 'SHEL-005'
            tid = 'SHEL-005'
            
        if tid in updates:
            # Update test steps (cell 3)
            p_steps = cells[3].paragraphs[0]
            p_steps.text = updates[tid]['steps']
            p_steps.paragraph_format.line_spacing = 1.05
            
            # Update expected result (cell 4) if present
            if 'expected' in updates[tid]:
                p_exp = cells[4].paragraphs[0]
                p_exp.text = updates[tid]['expected']
                p_exp.paragraph_format.line_spacing = 1.05
            
            count_updated += 1
            print(f'Updated steps for {tid} (preserved result: "{cells[7].text.strip()}", comments: "{cells[8].text.strip()[:30]}")')

doc.save(doc_path)
print(f'\nSuccessfully updated {count_updated} test cases in {doc_path}!')
