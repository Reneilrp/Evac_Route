import { Download } from "lucide-react";

export const SAMPLE_VERIFIED_SHELTERS = [
  {
    name: "Tetuan Central Evacuation Center",
    type: "Primary Center",
    cap: "600 Persons",
    elev: "+14m",
  },
  {
    name: "Pasonanca Park Safe Haven",
    type: "High-Ground Ridge",
    cap: "1,200 Persons",
    elev: "+45m",
  },
  {
    name: "Tumaga Riverbank Primary Court",
    type: "Primary Cluster",
    cap: "500 Persons",
    elev: "+18m",
  },
  {
    name: "Guiwan Barangay Staging Center",
    type: "Secondary Shelter",
    cap: "350 Persons",
    elev: "+12m",
  },
];

export default function LandingSheltersSection({
  handleDownload,
  shelters = SAMPLE_VERIFIED_SHELTERS,
}) {
  return (
    <section
      id="shelters"
      className="py-16 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Geographic Coverage
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Know Your Nearest High-Ground Haven Before Disaster Strikes.
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              Zamboanga City has 112 official evacuation shelters calibrated into
              the EvacRoute mobile network. The app automatically identifies your
              closest safe haven based on your location and road conditions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-0.5">
                  High-Ground Ridges
                </div>
                <p className="text-xs text-slate-500">
                  Pasonanca Park (+45m), Upper La Paz, and elevated mountain clusters
                  safe from coastal surges.
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-blue-600 dark:text-blue-400 font-bold text-sm mb-0.5">
                  Primary Centers
                </div>
                <p className="text-xs text-slate-500">
                  Equipped with clean water filtration, solar backup generators,
                  and CSWDO medical stations.
                </p>
              </div>
            </div>
          </div>

          {/* Verified Shelter Directory Card */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sample Verified High-Ground Centers
                </h3>
                <p className="text-xs text-slate-500">
                  Cached in full within the mobile offline database
                </p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded">
                OFFICIAL
              </span>
            </div>

            <div className="space-y-2.5">
              {shelters.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex justify-between items-center text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {s.type} · Ground Elevation: {s.elev}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {s.cap}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownload}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download size={14} />
                <span>Download App to Access All 112 Centers Offline</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
