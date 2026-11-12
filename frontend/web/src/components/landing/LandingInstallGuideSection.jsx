import { Download } from "lucide-react";
import { MOBILE_APP_CONFIG } from "../../config/mobileRelease";

export default function LandingInstallGuideSection({
  handleDownload,
  downloading,
}) {
  return (
    <section
      id="install-guide"
      className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-2xl mb-10 text-left">
        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Android Sideloading Walkthrough
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 mb-2">
          How to Install EvacRoute on Your Phone
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          Deploy the verified municipal emergency application directly to your
          Android device in three straightforward steps.
        </p>
      </div>

      {/* Clean Semantic Step Progression */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
            Phase 01
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Download the Official Package
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Save the verified{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {MOBILE_APP_CONFIG.apkFileName}
            </span>{" "}
            (~{MOBILE_APP_CONFIG.fileSize}) package directly to your phone via
            the download button.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
            Phase 02
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Enable Package Installation
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            When prompted by Android Security, navigate to{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Settings
            </span>{" "}
            and toggle on{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              "Install apps from this source"
            </span>
            .
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
            Phase 03
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Register Household Profile
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Launch the application, enter your household members, and generate
            your offline relief pass for immediate emergency preparedness.
          </p>
        </div>
      </div>

      {/* Action Callout */}
      <div className="mt-8 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Equip Your Household Before Storm Season
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Always free, zero surveillance telemetry, built for the citizens of
            Zamboanga City.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Download size={16} />
          <span>
            {downloading
              ? "Preparing Package..."
              : `Download ${MOBILE_APP_CONFIG.apkFileName} (${MOBILE_APP_CONFIG.versionTag})`}
          </span>
        </button>
      </div>
    </section>
  );
}
