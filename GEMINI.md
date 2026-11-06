# Evac_Route: Emergency Evacuation & DRRM Directives

## 1. Domain Context: Mission-Critical Emergency Management
This project is an **Emergency Evacuation & Disaster Risk Reduction Management (DRRM) System** (`Evac_RouteMobile`, `Evac_RouteWeb`, and backend services).

Unlike commercial or tourism applications, users interact with this system under **high stress, low visibility, power outages, or weak connectivity**.
- **Cognitive Load**: Eliminate all decorative clutter, non-essential animations, and generic AI tropes.
- **Speed to Action**: Critical actions ("Start Evacuation", "Find Nearest Shelter", "SOS Emergency") must be reachable in **under 2 taps**.
- **Offline & Low-Bandwidth Resilience**: Never block UI rendering on remote network requests. Always provide offline cached state and clear connection status indicators.

---

## 2. Emergency Severity Color Palette & Semantic Rules
Strict color semantics must never be used decoratively:
- **Danger / Evacuate Now / Impassable** (`#EF4444` / `rose-600`): Blocked roads, flooded zones, high-risk warnings, SOS triggers.
- **Warning / Standby / Rising Hazard** (`#F59E0B` / `amber-500`): Advisory alerts, shelters nearing capacity (80%+), weather watches.
- **Safe / Open Shelter / Clear Route** (`#10B981` / `emerald-600`): Active open evacuation centers, verified safe paths.
- **Active Navigation / Route Tracking** (`#0284C7` / `sky-600`): Dynamic route path, turn-by-turn guidance, current GPS location.
- **Surfaces & High Contrast**:
  - High-contrast text (`text-slate-900 dark:text-slate-50`) guaranteeing at least **7:1 contrast** for critical emergency instructions.
  - Dark mode support for battery preservation during power outages.

---

## 3. UI/UX Standards: View vs. Edit Parity (from `UI_UX_DESIGN_GUIDELINES.md`)
Whenever managing shelters, relief routes, dispatch fleets, or volunteer rosters:
1. **Single-Surface In-Place Morphing**: View mode and Edit mode must occupy the exact same modal or container without Cumulative Layout Shift (CLS). Clicking "Edit" unlocks fields in place.
2. **1:1 Spatial Parity**: Form inputs and labels must stay in the identical grid positions across both View and Edit modes.
3. **Never Gray-Out Everything**: Do not use `<input disabled>` for view mode. Render high-contrast, fully selectable plain text.
4. **Predictable Action Placements**: "Cancel / Close" on bottom-left, primary "Save / Update" on bottom-right. Destructive actions ("Revoke / Deactivate") must require explicit confirmation.

---

## 4. Mobile Ergonomics (Emergency First)
For `frontend/Evac_RouteMobile`:
- **Large Action Targets**: Emergency actions must have minimum **56×56pt touch targets** for easy tapping while moving or with gloved/wet hands.
- **Thumb-Zone Navigation**: Primary route initiation, shelter switcher, and panic/SOS buttons must remain in the bottom thumb zone.
- **Haptic Confirmations**: Use `expo-haptics` (`notificationAsync` on emergency alerts; `impactAsync(Heavy)` on SOS press).
- **Safe Area Insets**: Full notch and home-bar clearance via `useSafeAreaInsets()`.
