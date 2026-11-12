import { FileCheck2 } from "lucide-react";

export const DEFAULT_RESIDENT_PROTECTION_STATS = [
  {
    stat: "112",
    color: "text-blue-600 dark:text-blue-400",
    title: "Official Safe Shelters",
    desc: "High-ground courts, schools & ridges",
  },
  {
    stat: "0%",
    color: "text-emerald-600 dark:text-emerald-400",
    title: "Walk into Hazard Zones",
    desc: "Avoids active flood surges & blocked paths",
  },
  {
    stat: "< 30s",
    color: "text-red-600 dark:text-red-400",
    title: "SOS Alert Delivery",
    desc: "Dispatched directly to CDRRMO rescue units",
  },
  {
    stat: "98",
    color: "text-amber-600 dark:text-amber-400",
    title: "Barangays Covered",
    desc: "Citywide Zamboanga DRRM safety matrix",
  },
];

export default function LandingProtectionSection({
  stats = DEFAULT_RESIDENT_PROTECTION_STATS,
}) {
  return (
    <section
      id="protection"
      className="scroll-mt-16 border-t border-slate-200 dark:border-slate-800"
    >
      {/* Continuous Telemetry Metric Ticker */}
      <div className="py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden select-none">
        <div className="flex animate-marquee-right items-center">
          <div className="flex items-center shrink-0">
            {[...stats, ...stats].map((item, idx) => (
              <div key={`stat-1-${idx}`} className="flex items-center shrink-0">
                <div className="flex items-center gap-3 px-6 py-1">
                  <span
                    className={`text-xl font-black tracking-tight shrink-0 tabular-nums ${item.color}`}
                  >
                    {item.stat}
                  </span>
                  <div className="text-left leading-tight">
                    <p className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-500 whitespace-nowrap">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
              </div>
            ))}
          </div>

          <div className="flex items-center shrink-0" aria-hidden="true">
            {[...stats, ...stats].map((item, idx) => (
              <div key={`stat-2-${idx}`} className="flex items-center shrink-0">
                <div className="flex items-center gap-3 px-6 py-1">
                  <span
                    className={`text-xl font-black tracking-tight shrink-0 tabular-nums ${item.color}`}
                  >
                    {item.stat}
                  </span>
                  <div className="text-left leading-tight">
                    <p className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-500 whitespace-nowrap">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asymmetrical 3-Pillar Architectural Layout */}
      <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12 text-left">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            How EvacRoute Keeps Your Family Safe
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            Engineered specifically to solve real-world emergency hurdles faced
            by Zamboanga City residents during severe typhoons, storm surges, and
            fires.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pillar 1: Dynamic Threat-Avoidance Routing */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Core Operational Capability
                </span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  Active Roadway Telemetry
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                Dynamic Threat-Avoidance Routing
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                Standard consumer navigation apps direct vehicles and pedestrians
                along the shortest geographic path, frequently steering families
                into rising flood basins, submerged underpasses, or blocked bridges.
                EvacRoute continuously calculates detour vectors using real-time
                field reports, steering households to verified high-ground
                evacuation centers.
              </p>
            </div>

            {/* Technical Comparison Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60">
                <div className="font-bold text-red-700 dark:text-red-400 mb-0.5">
                  Commercial Navigation
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Unaware of active flood surges. Directs traffic through impassable
                  river channels.
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                  EvacRoute Telemetry
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Dynamic routing via ridge bypasses, guaranteeing elevation above
                  storm surge waterlines.
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 2: Offline Cryptographic Family Passes */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Zero-Connectivity Mode
                </span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  CSWDO Relief Sync
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                Offline Cryptographic Family Passports
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                During widespread grid failures and cellular outages, digital tools
                that require server round-trips become unusable. EvacRoute caches
                your household registration and QR token directly in your device
                storage, allowing immediate admission and relief ration scanning at
                shelter gates without internet.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  Tamper-Proof QR Generation
                </p>
                <p className="text-[11px] text-slate-500">
                  Instant registration at CSWDO checkpoints
                </p>
              </div>
              <FileCheck2
                size={20}
                className="text-emerald-600 dark:text-emerald-400 shrink-0"
              />
            </div>
          </div>

          {/* Pillar 3: Sub-30s SOS Alert Dispatch */}
          <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  Emergency Rescue Pipeline
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 mb-2">
                  Sub-30-Second Emergency SOS Propagation
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  When trapped by rising water or structural collapse, one tap on
                  Emergency SOS broadcasts your verified coordinates, household
                  headcount, and registered medical vulnerabilities directly to
                  CDRRMO fleet dispatchers, bypassing noisy social media channels.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dispatch Latency:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    &lt; 30 Seconds
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transmitted Payload:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    GPS + Family Roster
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Receiving Desk:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    CDRRMO Rescue Operations
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Civic Systems Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
              112 Official Safe Shelters
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calibrated elevation meter readings, real-time capacities, and water
              amenities across all 98 barangays.
            </p>
          </div>

          <div className="p-4 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
              Official Municipal Advisories
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct disaster bulletins issued by local DRRM officials without
              social media distortion or rumors.
            </p>
          </div>

          <div className="p-4 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
              Household Vulnerability Profiles
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pre-registered infant formula, elderly mobility, and medication
              needs for rapid triage at camp reception.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
