/**
 * Mobile Changelog & Patch Notes Hub
 * Detailed historical record of updates, features, and fixes for EvacRoute Mobile.
 */
export const PATCH_NOTES_HISTORY = [
  {
    version: '1.3.1',
    date: 'November 2026',
    title: 'Disaster Hazard Semantic Color Mapping & Fleet Operations Polish',
    badge: 'LATEST RELEASE',
    badgeVariant: 'success',
    highlights: [
      '🌊 Standardized Disaster Hazard Color Semantics: Flood hazards rendered in Blue (#0284c7), Fire in Red (#dc2626), and Landslides in Earth Brown (#8B4513) across resident evacuation and CDRRMO tactical rescue maps.',
      '🚑 Multi-Crew Fleet Details Modal: Full crew inspection displaying assigned Captain, lead medics, drivers, and rescue swimmers with real-time operational status.',
      '📱 Enhanced Fleet Readiness Controls: In-place Standby and Off-Duty toggle with instant map marker synchronization.',
    ],
    fixes: [
      'Resolved container clipping and added responsive vertical scrolling on CDRRMO Fleet Management Console.',
      'Updated resident hazard layers to use semantic hazard color tokens with Mapbox match fallbacks.',
    ],
  },
  {
    version: '1.3.0',
    date: 'November 2026',
    title: 'Dynamic SOS Dispatch Simulation & Tactical Staging',
    badge: 'STABLE',
    badgeVariant: 'secondary',
    highlights: [
      '⚡ Dynamic SOS Rescuer Simulator: Directly binds tactical routing to actual resident SOS distress calls dispatched from CDRRMO Web.',
      '🌊 Shoreline Staging Handover: Boat Alpha can stage evacuees at designated shoreline safe points and immediately return to flood zones.',
      '🔄 In-App OTA Update Engine: Seamless Over-The-Air patching with zero manual APK re-downloads via EAS Updates.',
      '🛡️ 20-Meter Proximity Geofencing: Automated arrival detection and CSWDO intake handover with hands-free step transitions.',
      '📋 Dedicated Patch Notes Hub: View full release notes, build metadata, and manual update checks in Settings.',
    ],
    fixes: [
      'Resolved JSX newline parsing warnings in Disaster Warning and Proximity modals.',
      'Eliminated native bridge re-tessellation bottlenecks during 10m/s simulation navigation.',
      'Synchronized vehicle marker telemetry with CDRRMO Web Map at a 3-second heartbeat.',
    ],
  },
  {
    version: '1.2.4',
    date: 'October 2026',
    title: 'Disaster Risk Awareness & Multi-Roadblock Detour Engine',
    badge: 'STABLE',
    badgeVariant: 'secondary',
    highlights: [
      '🚧 Dynamic Roadblock Reporting: On-the-fly obstruction injection with real-time A* path recalculation.',
      '🌊 Multi-Hazard Penetrability Matrix: Boat Alpha navigates deep waters; 4x4 trucks wade medium floods.',
      '📍 Strategic Zamboanga City Clamping: Guaranteed in-bounds GPS coordinates across all emulators and field devices.',
    ],
    fixes: [
      'Refined TOTP QR intake scanning with live cryptographic HMAC SHA-256 validation.',
      'Hardened safe check-in offline queue with SQLite fallback during cellular blackouts.',
    ],
  },
  {
    version: '1.2.0',
    date: 'October 2026',
    title: 'Tactical Search & Rescue (QRT) Launch',
    badge: 'ARCHIVE',
    badgeVariant: 'secondary',
    highlights: [
      '🚤 Rescue Duty Command Hub with live mission dispatches.',
      '🗺️ Mapbox 3D Tactical Navigation with speed presets (1x, 2x, 5x).',
      '📦 CSWDO Relief Goods Intake Scanner & Distribution Desk.',
    ],
    fixes: [
      'Initial release of unified DRRM response for Zamboanga City.',
    ],
  },
];

export default PATCH_NOTES_HISTORY;
