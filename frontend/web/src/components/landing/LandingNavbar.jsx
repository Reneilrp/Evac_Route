import { ShieldAlert, Sun, Moon, Download, Menu, X } from "lucide-react";
import { MOBILE_APP_CONFIG } from "../../config/mobileRelease";

export default function LandingNavbar({
  overviewSlide,
  scrolled,
  activeSection,
  navItems,
  navRefs,
  underlineStyle,
  scrollToSection,
  darkMode,
  toggleDarkMode,
  handleDownload,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  return (
    <>
      {/* ── Fixed Navigation Bar ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          overviewSlide === 1 ? "hidden md:block" : "block"
        } ${
          scrolled
            ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-3"
            : "bg-transparent border-b border-transparent py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Identity with Civic Attribution */}
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("overview");
            }}
            className="flex items-center gap-3 group focus:outline-none cursor-pointer"
          >
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 group-hover:bg-blue-700 transition-colors">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  EvacRoute
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                  CDRRMO
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Zamboanga City Emergency Network
              </p>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="relative hidden md:flex items-center gap-1 py-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    if (navRefs?.current) {
                      navRefs.current[item.id] = el;
                    }
                  }}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer select-none rounded-md ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Sliding Underline Indicator */}
            <span
              className="absolute bottom-0 h-[2px] bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-200 ease-out pointer-events-none"
              style={{
                left: `${underlineStyle.left}px`,
                width: `${underlineStyle.width}px`,
                opacity: underlineStyle.opacity,
              }}
            />
          </nav>

          {/* Desktop Right Action Controls */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun size={16} className="text-amber-400" />
              ) : (
                <Moon size={16} className="text-slate-700" />
              )}
            </button>

            {/* Direct Flat Download CTA */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg transition duration-150 cursor-pointer shrink-0"
            >
              <Download size={14} className="shrink-0" />
              <span>Download APK</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                {MOBILE_APP_CONFIG.versionTag}
              </span>
            </button>
          </div>

          {/* Mobile Header Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 active:scale-95 transition cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Quick Action Drawer ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div
            data-testid="mobile-top-action-menu"
            className="fixed top-16 right-4 w-52 z-[60] p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl md:hidden"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDownload();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-left"
              >
                <Download size={15} />
                <span>Download App ({MOBILE_APP_CONFIG.versionTag})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleDarkMode();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-left"
              >
                {darkMode ? (
                  <Sun size={15} className="text-amber-400" />
                ) : (
                  <Moon size={15} className="text-blue-600" />
                )}
                <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
