import { Link } from "react-router-dom";
import { ShieldAlert, CheckCircle2, Lock } from "lucide-react";
import { MOBILE_APP_CONFIG } from "../../config/mobileRelease";

export default function LandingFooter({
  scrollToSection,
  handleDownload,
  overviewSlide,
  isIOS,
  navItems,
  activeSection,
}) {
  return (
    <>
      {/* ── FOOTER & OFFICIAL CITY DIRECTORY ── */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 pt-12 pb-24 md:pb-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-black text-base">
                <ShieldAlert size={20} className="text-blue-500" />
                <span>EvacRoute</span>
              </div>
              <p className="leading-relaxed text-slate-400">
                Civic emergency evacuation planning and household protection
                platform operated by CDRRMO Zamboanga City.
              </p>
            </div>

            <div>
              <p className="font-bold text-white uppercase tracking-wider mb-3">
                Quick Navigation
              </p>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => scrollToSection("overview")}
                    className="hover:text-blue-400 transition cursor-pointer"
                  >
                    Platform Overview
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("how-it-works")}
                    className="hover:text-blue-400 transition cursor-pointer"
                  >
                    How it Works
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("shelters")}
                    className="hover:text-blue-400 transition cursor-pointer"
                  >
                    112 Safe Shelters
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("install-guide")}
                    className="hover:text-blue-400 transition cursor-pointer"
                  >
                    Installation Guide
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white uppercase tracking-wider mb-3">
                Zamboanga Emergency Hotlines
              </p>
              <ul className="space-y-1.5">
                <li>
                  <span className="text-slate-300 font-semibold">
                    City Emergency (CDRRMO):
                  </span>{" "}
                  911 / (062) 992-3181
                </li>
                <li>
                  <span className="text-slate-300 font-semibold">
                    Bureau of Fire Protection:
                  </span>{" "}
                  160 / 0917-FIRE-160
                </li>
                <li>
                  <span className="text-slate-300 font-semibold">
                    Police Station 11 (Central):
                  </span>{" "}
                  0917-POLICE-911
                </li>
                <li>
                  <span className="text-slate-300 font-semibold">
                    Zamboanga City Medical Center:
                  </span>{" "}
                  (062) 991-0573
                </li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white uppercase tracking-wider mb-3">
                Barangay Coordination
              </p>
              <p className="text-slate-400 mb-2 leading-relaxed">
                For questions regarding your designated high-ground cluster,
                coordinate directly with your local Barangay DRRM Council.
              </p>
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 size={14} />
                <span>Public Civic Safety Asset</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
            <p>
              © 2026 City Disaster Risk Reduction &amp; Management Office
              (CDRRMO), Zamboanga City.
            </p>
            <div className="flex items-center gap-4">
              <span>{MOBILE_APP_CONFIG.versionTag}</span>
              <span>•</span>
              <button
                onClick={handleDownload}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                Download APK
              </button>
              <span>•</span>
              <Link
                to="/admin/login"
                className="text-slate-600 hover:text-slate-400 transition flex items-center gap-1"
                title="Authorized Staff Access"
              >
                <Lock size={11} />
                <span>Staff Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation Bar (iOS Blur & Clean Elevations) ── */}
      <nav
        aria-label="Mobile navigation"
        className={`${
          overviewSlide === 1 ? "hidden" : "md:hidden fixed"
        } bottom-0 left-0 right-0 z-40 flex justify-center px-4`}
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))",
        }}
      >
        <div
          className={`flex items-center justify-around px-2 py-1.5 w-full max-w-sm rounded-xl border transition-all ${
            isIOS
              ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/80 dark:border-slate-800 shadow-xl"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg"
          }`}
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                aria-label={`Jump to ${item.label}`}
                className="flex flex-col items-center justify-center flex-1 py-1 rounded-lg cursor-pointer transition active:scale-95"
              >
                {Icon && (
                  <Icon
                    size={17}
                    className={
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-400 dark:text-slate-500"
                    }
                  />
                )}
                <span
                  className={`text-[10px] mt-0.5 ${
                    isActive
                      ? "font-bold text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {item.shortLabel || item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
