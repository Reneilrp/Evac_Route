import { useState, useEffect, useRef, useCallback } from "react";
import {
  Smartphone,
  ShieldCheck,
  Building2,
  Download,
  CheckCircle2,
  QrCode,
  PhoneCall,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import api from "../../services/api";
import { MOBILE_APP_CONFIG } from "../../config/mobileRelease";

import LandingNavbar from "../../components/landing/LandingNavbar";
import LandingHeroPhone from "../../components/landing/LandingHeroPhone";
import LandingProtectionSection, {
  DEFAULT_RESIDENT_PROTECTION_STATS,
} from "../../components/landing/LandingProtectionSection";
import LandingSheltersSection from "../../components/landing/LandingSheltersSection";
import LandingInstallGuideSection from "../../components/landing/LandingInstallGuideSection";
import LandingFooter from "../../components/landing/LandingFooter";

export default function Landing() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isIOS] = useState(() => {
    if (typeof navigator !== "undefined") {
      const userAgent = navigator.userAgent || "";
      return (
        /iPad|iPhone|iPod/.test(userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      );
    }
    return false;
  });
  const [activeSection, setActiveSection] = useState("overview");
  const [activeResidentScreen, setActiveResidentScreen] = useState("map"); // "map" | "report" | "profile"
  const [householdStats, setHouseholdStats] = useState({
    households: 0,
    residents: 0,
    loaded: false,
  });
  const [downloading, setDownloading] = useState(false);

  // Interactive resident preview states
  const [isNavigating, setIsNavigating] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [passSaved, setPassSaved] = useState(false);

  // Mobile Overview 2-Slide State (0: Overview, 1: Mobile UI Showcasing)
  const [overviewSlide, setOverviewSlide] = useState(0);
  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    if (distance > 45) {
      setOverviewSlide(1);
    } else if (distance < -45) {
      setOverviewSlide(0);
    }
  };

  const navRefs = useRef({});
  const isClickScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const navItems = [
    { id: "overview", label: "Overview", shortLabel: "Overview", icon: Smartphone },
    { id: "how-it-works", label: "How it Works", shortLabel: "How it Works", icon: ShieldCheck },
    { id: "shelters", label: "Safe Shelters", shortLabel: "Shelters", icon: Building2 },
    { id: "install-guide", label: "Installation", shortLabel: "Install", icon: Download },
  ];

  const residentProtectionStats = DEFAULT_RESIDENT_PROTECTION_STATS;

  // Sliding underline calculation
  const updateUnderline = useCallback(() => {
    const activeEl = navRefs.current[activeSection];
    if (activeEl) {
      const inset = 6;
      setUnderlineStyle({
        left: activeEl.offsetLeft + inset,
        width: Math.max(0, activeEl.offsetWidth - inset * 2),
        opacity: 1,
      });
    }
  }, [activeSection]);

  useEffect(() => {
    updateUnderline();
    const rafId = requestAnimationFrame(updateUnderline);
    window.addEventListener("resize", updateUnderline);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateUnderline);
    };
  }, [updateUnderline]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleUserInteraction = () => {
      if (isClickScrollingRef.current) {
        isClickScrollingRef.current = false;
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      }
    };

    window.addEventListener("wheel", handleUserInteraction, { passive: true });
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  // Active section scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 20);

      if (isClickScrollingRef.current) return;

      const sectionIds = ["overview", "how-it-works", "shelters", "install-guide"];
      const scrollThreshold = 140;

      if (scrollY < 80) {
        setActiveSection("overview");
        return;
      }

      if (window.innerHeight + scrollY >= document.documentElement.scrollHeight - 50) {
        setActiveSection(sectionIds[sectionIds.length - 1]);
        return;
      }

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= scrollThreshold) {
            setActiveSection(sectionIds[i]);
            return;
          }
        }
      }
      setActiveSection("overview");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && overviewSlide === 1) {
        setOverviewSlide(0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [overviewSlide]);

  // Fetch real public database household stats
  useEffect(() => {
    let isMounted = true;
    api
      .get("/public-stats")
      .then((res) => {
        if (isMounted && res.data?.data) {
          setHouseholdStats({
            households: res.data.data.households || 0,
            residents: res.data.data.residents || 0,
            loaded: true,
          });
        }
      })
      .catch(() => {
        // Fallback gracefully without breaking UI
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    const link = document.createElement("a");
    link.href = MOBILE_APP_CONFIG.downloadPath;
    link.setAttribute("download", MOBILE_APP_CONFIG.apkFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 2000);
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    setActiveSection(id);
    isClickScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    if (id === "overview") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      const element =
        document.getElementById(id) ||
        (id === "protection" ? document.getElementById("how-it-works") : null);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: "smooth",
        });
      }
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
      scrollTimeoutRef.current = null;
    }, 850);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-150">
      {/* ── Fixed Navigation Bar ── */}
      <LandingNavbar
        overviewSlide={overviewSlide}
        scrolled={scrolled}
        activeSection={activeSection}
        navItems={navItems}
        navRefs={navRefs}
        underlineStyle={underlineStyle}
        scrollToSection={scrollToSection}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleDownload={handleDownload}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* ── SECTION 1: CITIZEN PLATFORM OVERVIEW (1:1 UNIFIED HERO FOLD) ── */}
      <section
        id="overview"
        className={`relative h-[100svh] min-h-[100svh] md:h-screen md:min-h-screen ${
          overviewSlide === 1
            ? "p-0 overflow-hidden"
            : "pt-14 pb-20 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-0 overflow-hidden"
        } md:pt-16 md:pb-6 flex flex-col justify-between transition-all duration-300`}
      >
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-blue-500/10 dark:bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-emerald-500/10 dark:bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div
          className={`max-w-7xl mx-auto relative z-10 w-full flex-1 min-h-0 flex flex-col ${
            overviewSlide === 1
              ? "px-0 md:px-6 lg:px-8 h-full justify-stretch"
              : "px-0 sm:px-0 md:px-6 lg:px-8 justify-between"
          }`}
        >
          {/* Responsive Slide Track Container */}
          <div
            className={`w-full overflow-hidden touch-pan-y flex-1 min-h-0 flex flex-col ${
              overviewSlide === 1 ? "h-full my-0 justify-stretch" : "my-auto justify-center"
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className={`flex md:grid md:grid-cols-12 md:gap-8 lg:gap-10 xl:gap-12 w-full transition-transform duration-300 ease-out ${
                overviewSlide === 1
                  ? "-translate-x-full md:translate-x-0 h-full flex-1 items-stretch md:items-center my-0 md:my-auto"
                  : "translate-x-0 items-center my-auto"
              }`}
            >
              {/* Column 1 / Slide 0: Dynamic Viewport Fitting & Proportional Spacing */}
              <div className="w-full min-w-full shrink-0 md:min-w-0 md:w-full md:col-span-7 xl:col-span-7 flex flex-col items-center md:items-start justify-evenly md:justify-center gap-[clamp(0.75rem,2.2vh,1.65rem)] md:gap-6 text-center md:text-left my-auto px-2 sm:px-4 md:px-0">
                {/* 2-Line Strict Display Headline (No Gradient Text) */}
                <div className="w-full">
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] max-w-2xl mx-auto md:mx-0 mb-3">
                    Intelligent Evacuation Routing for Every Household.
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto md:mx-0 leading-relaxed font-normal">
                    Live flood-evasion navigation to high-ground shelters and verified offline relief passes across Zamboanga City.
                  </p>
                </div>

                {/* Grounded Trust Signals */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>SHA-256 Verified Build</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>100% Free Public Tool</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <QrCode size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Works Completely Offline</span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="w-full max-w-sm sm:max-w-none">
                  <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 w-full">
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download size={16} />
                      <span>{downloading ? "Preparing Download..." : "Download EvacRoute APK"}</span>
                      <span className="text-[11px] font-mono bg-blue-800/60 px-1.5 py-0.5 rounded">
                        {MOBILE_APP_CONFIG.fileSize}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => scrollToSection("how-it-works")}
                        className="w-full sm:w-auto px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>How it Works</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOverviewSlide(1)}
                        className="sm:hidden w-full px-3.5 py-2.5 bg-blue-50/90 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl border border-blue-200/80 dark:border-blue-900/60 shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Smartphone size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="truncate">App Preview</span>
                        <ChevronRight size={13} className="text-blue-500/80 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Emergency Hotlines & Community Coverage */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center md:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 w-full">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={13} className="text-red-600 dark:text-red-400 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">CDRRMO Hotlines:</span>
                    <a href="tel:911" className="font-bold text-red-600 dark:text-red-400 hover:underline">
                      911
                    </a>
                    <span>|</span>
                    <a href="tel:0629923181" className="font-medium text-slate-700 dark:text-slate-300 hover:underline">
                      (062) 992-3181
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      {householdStats.loaded && householdStats.households > 0 ? (
                        <>
                          <strong className="text-slate-900 dark:text-white tabular-nums">
                            {householdStats.households.toLocaleString()}
                          </strong>{" "}
                          households registered
                        </>
                      ) : (
                        <>
                          Covering <strong className="text-slate-900 dark:text-white">98 Barangays</strong> in Zamboanga City
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 2 / Slide 1: Responsive Dual-Mode Mockup / App Preview Card */}
              <LandingHeroPhone
                overviewSlide={overviewSlide}
                setOverviewSlide={setOverviewSlide}
                darkMode={darkMode}
                activeResidentScreen={activeResidentScreen}
                setActiveResidentScreen={setActiveResidentScreen}
                isNavigating={isNavigating}
                setIsNavigating={setIsNavigating}
                reportSubmitted={reportSubmitted}
                setReportSubmitted={setReportSubmitted}
                passSaved={passSaved}
                setPassSaved={setPassSaved}
              />
            </div>
          </div>

          {/* Mobile Pagination Indicator Dots */}
          <div
            className={`${
              overviewSlide === 1 ? "hidden" : "flex md:hidden"
            } items-center justify-center gap-2.5 mt-auto pt-2 pb-1 select-none transition-opacity duration-300`}
          >
            <button
              type="button"
              onClick={() => setOverviewSlide(0)}
              aria-label="Overview slide"
              className="p-1 cursor-pointer focus:outline-none"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${
                  overviewSlide === 0
                    ? "w-7 bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-500/30"
                    : "w-2.5 bg-slate-300 dark:bg-slate-700"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => setOverviewSlide(1)}
              aria-label="Mobile UI slide"
              className="p-1 cursor-pointer focus:outline-none"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${
                  overviewSlide === 1
                    ? "w-7 bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-500/30"
                    : "w-2.5 bg-slate-300 dark:bg-slate-700"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: HOW EVACROUTE PROTECTS YOUR HOUSEHOLD ── */}
      <LandingProtectionSection stats={residentProtectionStats} />

      {/* ── SECTION 3: 112 OFFICIAL SAFE SHELTERS DIRECTORY ── */}
      <LandingSheltersSection handleDownload={handleDownload} />

      {/* ── SECTION 4: VERIFIED INSTALLATION GUIDE ── */}
      <LandingInstallGuideSection handleDownload={handleDownload} downloading={downloading} />

      {/* ── FOOTER & OFFICIAL CITY DIRECTORY & MOBILE BOTTOM NAV ── */}
      <LandingFooter
        scrollToSection={scrollToSection}
        handleDownload={handleDownload}
        overviewSlide={overviewSlide}
        isIOS={isIOS}
        navItems={navItems}
        activeSection={activeSection}
      />
    </div>
  );
}
