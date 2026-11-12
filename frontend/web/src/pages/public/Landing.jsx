import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Download,
  Smartphone,
  Navigation,
  QrCode,
  MapPin,
  CheckCircle2,
  Building2,
  Sun,
  Moon,
  ShieldCheck,
  Menu,
  X,
  Lock,
  Check,
  AlertTriangle,
  PhoneCall,
  ArrowLeft,
  ChevronRight,
  User,
  Camera,
  Layers,
  Compass,
  FileCheck2,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { MOBILE_APP_CONFIG } from '../../config/mobileRelease';

export default function Landing() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isIOS] = useState(() => {
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent || '';
      return (
        /iPad|iPhone|iPod/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );
    }
    return false;
  });
  const [activeSection, setActiveSection] = useState('overview');
  const [activeResidentScreen, setActiveResidentScreen] = useState('map'); // 'map' | 'report' | 'profile'
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
    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: Smartphone },
    { id: 'protection', label: 'Household Protection', shortLabel: 'Protection', icon: ShieldCheck },
    { id: 'shelters', label: 'Safe Shelters', shortLabel: 'Shelters', icon: Building2 },
    { id: 'install-guide', label: 'Installation', shortLabel: 'Install', icon: Download },
  ];

  const residentProtectionStats = [
    {
      stat: '112',
      color: 'text-blue-600 dark:text-blue-400',
      title: 'Official Safe Shelters',
      desc: 'High-ground courts, schools & ridges',
    },
    {
      stat: '0%',
      color: 'text-emerald-600 dark:text-emerald-400',
      title: 'Walk into Hazard Zones',
      desc: 'Avoids active flood surges & blocked paths',
    },
    {
      stat: '< 30s',
      color: 'text-red-600 dark:text-red-400',
      title: 'SOS Alert Delivery',
      desc: 'Dispatched directly to CDRRMO rescue units',
    },
    {
      stat: '98',
      color: 'text-amber-600 dark:text-amber-400',
      title: 'Barangays Covered',
      desc: 'Citywide Zamboanga DRRM safety matrix',
    },
  ];

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
    window.addEventListener('resize', updateUnderline);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateUnderline);
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

    window.addEventListener('wheel', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Active section scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 20);

      if (isClickScrollingRef.current) return;

      const sectionIds = ['overview', 'protection', 'shelters', 'install-guide'];
      const scrollThreshold = 140;

      if (scrollY < 80) {
        setActiveSection('overview');
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
      setActiveSection('overview');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && overviewSlide === 1) {
        setOverviewSlide(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [overviewSlide]);

  // Fetch real public database household stats
  useEffect(() => {
    let isMounted = true;
    api
      .get('/public-stats')
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
    const link = document.createElement('a');
    link.href = MOBILE_APP_CONFIG.downloadPath;
    link.setAttribute('download', MOBILE_APP_CONFIG.apkFileName);
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

    if (id === 'overview') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      const element = document.getElementById(id);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth',
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
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${overviewSlide === 1 ? 'hidden md:block' : 'block'
          } ${scrolled
            ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-3'
            : 'bg-transparent border-b border-transparent py-4'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

          {/* Brand Identity with Civic Attribution */}
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('overview');
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
                    navRefs.current[item.id] = el;
                  }}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer select-none rounded-md ${isActive
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
            </button>

            {/* Direct Flat Download CTA */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg transition duration-150 cursor-pointer shrink-0"
            >
              <Download size={14} className="shrink-0" />
              <span>Download APK</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">{MOBILE_APP_CONFIG.versionTag}</span>
            </button>
          </div>

          {/* Mobile Header Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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
                {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-blue-600" />}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SECTION 1: CITIZEN PLATFORM OVERVIEW (SUBSTANTIAL HERO) ── */}
      {/* ── SECTION 1: CITIZEN PLATFORM OVERVIEW (1:1 UNIFIED HERO FOLD) ── */}
      <section
        id="overview"
        className={`relative h-[100svh] min-h-[100svh] md:h-screen md:min-h-screen ${overviewSlide === 1
            ? 'p-0 overflow-hidden'
            : 'pt-14 pb-20 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-0 overflow-hidden'
          } md:pt-16 md:pb-6 flex flex-col justify-between transition-all duration-300`}
      >
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-blue-500/10 dark:bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-emerald-500/10 dark:bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className={`max-w-7xl mx-auto relative z-10 w-full flex-1 min-h-0 flex flex-col ${overviewSlide === 1 ? 'px-0 md:px-6 lg:px-8 h-full justify-stretch' : 'px-0 sm:px-0 md:px-6 lg:px-8 justify-between'}`}>

          {/* Responsive Slide Track Container */}
          <div
            className={`w-full overflow-hidden touch-pan-y flex-1 min-h-0 flex flex-col ${overviewSlide === 1 ? 'h-full my-0 justify-stretch' : 'my-auto justify-center'
              }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className={`flex md:grid md:grid-cols-12 md:gap-8 lg:gap-10 xl:gap-12 w-full transition-transform duration-300 ease-out ${overviewSlide === 1
                  ? '-translate-x-full md:translate-x-0 h-full flex-1 items-stretch md:items-center my-0 md:my-auto'
                  : 'translate-x-0 items-center my-auto'
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

                {/* Grounded Trust Signals (No Cheesy Icons or Badges) */}
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

                {/* Primary Action Buttons (Solid Fills, No Gradients) */}
                <div className="w-full max-w-sm sm:max-w-none">
                  <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 w-full">
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download size={16} />
                      <span>{downloading ? 'Preparing Download...' : 'Download EvacRoute APK'}</span>
                      <span className="text-[11px] font-mono bg-blue-800/60 px-1.5 py-0.5 rounded">{MOBILE_APP_CONFIG.fileSize}</span>
                    </button>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => scrollToSection('protection')}
                        className="w-full sm:w-auto px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>How It Protects</span>
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

                {/* Emergency Hotlines & Verified Community Coverage */}
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
                          <strong className="text-slate-900 dark:text-white tabular-nums">{householdStats.households.toLocaleString()}</strong> households registered
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
              <div className="w-full min-w-full shrink-0 md:min-w-0 md:w-full md:col-span-5 xl:col-span-5 flex flex-col items-center md:items-end justify-between md:justify-center relative my-0 md:my-auto px-0 md:px-0 h-full md:h-auto flex-1 md:flex-initial">
                {/* Mobile Back Button & Live Badge Bar (Visible on mobile when in Slide 1) */}
                <div className="flex md:hidden items-center justify-between w-full px-3.5 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2 shrink-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 z-20">
                  <button
                    type="button"
                    onClick={() => setOverviewSlide(0)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-sm border border-slate-200 dark:border-slate-800 active:scale-95 transition cursor-pointer"
                  >
                    <ArrowLeft size={14} className="text-blue-600 dark:text-blue-400" />
                    <span>Back to Overview</span>
                  </button>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Interactive Preview</span>
                  </div>
                </div>

                {/* Responsive Container: 3D Smartphone on Desktop (md+), Native Full-Width on Mobile (<md) */}
                <div className="relative w-full max-w-none md:w-[305px] lg:w-[325px] xl:w-[340px] rounded-none md:rounded-[42px] bg-transparent md:bg-slate-900 dark:md:bg-slate-950 p-0 md:p-2.5 lg:p-3 shadow-none md:shadow-2xl border-0 md:border-[4px] lg:border-[5px] md:border-slate-300 dark:md:border-slate-800 md:ring-0 md:ring-slate-400/30 dark:md:ring-slate-700/50 transition-colors duration-300 flex-1 md:flex-none flex flex-col justify-stretch md:justify-center overflow-hidden md:overflow-visible h-full md:h-auto">
                  {/* Phone Speaker Notch (Tablet & Desktop - hidden on small mobile) */}
                  <div className="hidden md:flex absolute top-5 left-1/2 -translate-x-1/2 w-24 h-3.5 bg-slate-900 dark:bg-slate-950 rounded-full z-30 items-center justify-center transition-colors">
                    <div className="w-10 h-1 bg-slate-700 dark:bg-slate-800 rounded-full" />
                  </div>

                  {/* Inner Screen Container - Native Edge-to-Edge on Mobile, Bezel Card on Desktop */}
                  <div className="w-full flex-1 min-h-0 md:flex-none rounded-none md:rounded-[34px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden flex flex-col h-full md:h-[510px] lg:h-[555px] xl:h-[585px] md:min-h-[510px] lg:min-h-[555px] xl:min-h-[585px] md:max-h-[510px] lg:max-h-[555px] xl:max-h-[585px] border-0 md:border md:border-slate-200 dark:md:border-slate-800 relative shadow-none md:shadow-inner transition-colors duration-300">

                    {/* Status Bar */}
                    <div className="pt-2 lg:pt-2.5 px-3.5 lg:px-5 pb-1 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold select-none z-30 bg-white/90 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-100 dark:border-transparent transition-colors">
                      <span className="font-bold text-slate-800 dark:text-slate-300">9:41 AM</span>
                      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider lg:hidden">EvacRoute Live</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px]">5G</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────────
                      SCREEN 1: EVACUATION MAP (DEFAULT SCREEN ON MOBILE APP OPEN)
                      Displays full-screen map with user's current location pin
                     ───────────────────────────────────────────────────────────── */}
                    {activeResidentScreen === 'map' && (
                      <div className="relative w-full h-full min-h-0 flex-1 overflow-hidden flex flex-col justify-between animate-enter select-none">

                        {/* Full-bleed Map Canvas (SVG) */}
                        <div className="absolute inset-0 w-full h-full">
                          <svg viewBox="0 0 320 480" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                            <defs>
                              <linearGradient id="floodGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={darkMode ? "0.5" : "0.35"} />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={darkMode ? "0.25" : "0.2"} />
                              </linearGradient>

                              <filter id="routeGlowFull" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3.5" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                              </filter>

                              <pattern id="mapGridFull" width="30" height="30" patternUnits="userSpaceOnUse">
                                <path d="M 30 0 L 0 0 0 30" fill="none" stroke={darkMode ? "#1e293b" : "#e2e8f0"} strokeWidth="0.6" strokeDasharray="2 2" />
                              </pattern>
                            </defs>

                            {/* Base Map Surface (Dynamic Light / Dark Map) */}
                            <rect width="320" height="480" fill={darkMode ? "#0b1120" : "#f8fafc"} />
                            <rect width="320" height="480" fill="url(#mapGridFull)" opacity={darkMode ? "0.6" : "0.7"} />

                            {/* River Basin (Tetuan River) */}
                            <path
                              d="M -20 220 C 70 240, 130 270, 180 300 C 230 330, 270 370, 340 400"
                              fill="none"
                              stroke={darkMode ? "#1e3a8a" : "#bfdbfe"}
                              strokeWidth="24"
                              strokeLinecap="round"
                              opacity={darkMode ? "0.9" : "0.95"}
                            />
                            <path
                              d="M -20 220 C 70 240, 130 270, 180 300 C 230 330, 270 370, 340 400"
                              fill="none"
                              stroke={darkMode ? "#38bdf8" : "#2563eb"}
                              strokeWidth="2.5"
                              strokeDasharray="6 8"
                              opacity={darkMode ? "0.6" : "0.7"}
                            />

                            {/* Street Network (Zamboanga City Tetuan Sector) */}
                            <path d="M 30 10 L 30 470" fill="none" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="3" />
                            <path d="M 90 10 L 90 470" fill="none" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="3" />
                            <path d="M 160 10 L 160 470" fill="none" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="3" />
                            <path d="M 240 10 L 240 470" fill="none" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="3" />
                            <path d="M 10 90 L 310 90" fill="none" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="3" />
                            <path d="M 10 170 L 310 170" fill="none" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="3" />
                            <path d="M 10 250 L 310 250" fill="none" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="3" />
                            <path d="M 10 330 L 310 330" fill="none" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="3" />

                            {/* Street Names */}
                            <text x="35" y="85" fill={darkMode ? "#475569" : "#64748b"} fontSize="7" fontWeight="bold" letterSpacing="0.4">DON ALFARO ST</text>
                            <text x="100" y="165" fill={darkMode ? "#475569" : "#64748b"} fontSize="7" fontWeight="bold" letterSpacing="0.4">GOV. ALVAREZ AVE</text>
                            <text x="175" y="80" fill={darkMode ? "#38bdf8" : "#0284c7"} fontSize="7.5" fontWeight="bold" letterSpacing="0.4">RIDGE HIGH BYPASS</text>

                            {/* Flood Hazard Polygon Area */}
                            <polygon
                              points="70,180 200,200 230,290 85,290"
                              fill="url(#floodGradFull)"
                              stroke="#ef4444"
                              strokeWidth="1.8"
                              strokeDasharray="5 3"
                            />
                            <g transform="translate(105, 230)">
                              <rect x="0" y="0" width="86" height="16" rx="8" fill={darkMode ? "#450a0a" : "#fee2e2"} stroke="#ef4444" strokeWidth="0.9" />
                              <text x="43" y="11" fill={darkMode ? "#fca5a5" : "#991b1b"} fontSize="6.5" fontWeight="bold" textAnchor="middle">
                                ⚠️ ACTIVE FLOOD SURGE
                              </text>
                            </g>

                            {/* Blocked Submerged Road */}
                            <path
                              d="M 65 250 L 175 250"
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="4"
                              strokeDasharray="5 4"
                              opacity="0.85"
                            />
                            <g transform="translate(110, 242)">
                              <circle cx="8" cy="8" r="8" fill="#ef4444" />
                              <text x="8" y="12" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">⛔</text>
                            </g>

                            {/* Calculated Safe Route Line */}
                            <path
                              d="M 60 290 L 60 90 L 190 90 L 250 60"
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth="8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity={darkMode ? "0.35" : "0.2"}
                            />
                            <path
                              d="M 60 290 L 60 90 L 190 90 L 250 60"
                              fill="none"
                              stroke={isNavigating ? (darkMode ? "#38bdf8" : "#0284c7") : (darkMode ? "#0284c7" : "#0369a1")}
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeDasharray={isNavigating ? "8 6" : "none"}
                              filter="url(#routeGlowFull)"
                            />

                            {/* Directional Chevrons */}
                            <g fill={darkMode ? "#93c5fd" : "#0284c7"} opacity="0.95">
                              <path d="M 60 240 L 64 246 L 56 246 Z" />
                              <path d="M 60 180 L 64 186 L 56 186 Z" />
                              <path d="M 60 130 L 64 136 L 56 136 Z" />
                              <path d="M 120 90 L 114 86 L 114 94 Z" />
                              <path d="M 210 80 L 205 76 L 205 84 Z" />
                            </g>

                            {/* ─── REAL MOBILE USER LOCATION AVATAR PIN (CENTER) ─── */}
                            <g transform="translate(60, 290)">
                              {/* Outer Pulsing Beacon Aura */}
                              <circle cx="0" cy="0" r="24" fill="rgba(56, 189, 248, 0.25)" stroke="rgba(56, 189, 248, 0.8)" strokeWidth="1.5" className="animate-ping" />
                              {/* Inner Avatar Circle */}
                              <circle cx="0" cy="0" r="15" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                              {/* User silhouette */}
                              <circle cx="0" cy="-3.5" r="4.5" fill="#ffffff" />
                              <path d="M -8 7 C -8 1.5, 8 1.5, 8 7 Z" fill="#ffffff" />
                              {/* YOU Pill Badge (Exact mobile UI style) */}
                              <rect x="-15" y="16" width="30" height="13" rx="6.5" fill={darkMode ? "#0f172a" : "#ffffff"} stroke="#0284c7" strokeWidth="1.2" />
                              <text x="0" y="25" fill={darkMode ? "#ffffff" : "#0284c7"} fontSize="7" fontWeight="900" letterSpacing="0.8" textAnchor="middle">YOU</text>
                            </g>

                            {/* Destination Shelter Marker (Tetuan Ridge) */}
                            <g transform="translate(250, 60)">
                              <circle cx="0" cy="0" r="16" fill="#10b981" opacity="0.25" className="animate-pulse" />
                              <circle cx="0" cy="0" r="10" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                              <text x="0" y="3.5" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">🏠</text>
                              <rect x="-42" y="-22" width="84" height="15" rx="4" fill={darkMode ? "#064e3b" : "#ecfdf5"} stroke="#10b981" strokeWidth="0.9" />
                              <text x="0" y="-12" fill={darkMode ? "#a7f3d0" : "#065f46"} fontSize="6" fontWeight="bold" textAnchor="middle">TETUAN RIDGE (+22m)</text>
                            </g>
                          </svg>
                        </div>

                        {/* Top Floating Mobile UI Overlay */}
                        <div className="relative z-20 pt-2 px-3">
                          {isNavigating ? (
                            /* Google Maps Style Turn-by-Turn Navigation Banner */
                            <div className="bg-white/95 dark:bg-slate-900/98 border-2 border-emerald-500 rounded-2xl p-2.5 shadow-2xl flex items-center justify-between animate-enter transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-600 border border-emerald-400 flex items-center justify-center text-white font-black text-base shadow-sm">
                                  ↱
                                </div>
                                <div>
                                  <div className="text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">IN 120 METERS</div>
                                  <div className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight">Turn Right onto Ridge High Bypass</div>
                                  <div className="text-[8px] text-slate-500 dark:text-slate-400">14 min · 1.2 km remaining</div>
                                </div>
                              </div>
                              <button
                                onClick={() => setIsNavigating(false)}
                                className="p-1.5 rounded-full bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-500 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-white cursor-pointer transition-colors"
                                title="Exit Navigation"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            /* Unified Floating Pill Header Bar (112 Shelters, 3 Hazards, Disasters filter) */
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 px-2.5 py-1.5 rounded-full shadow-lg transition-colors">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-bold text-slate-900 dark:text-white">112 Shelters</span>
                                <span className="w-px h-2.5 bg-slate-300 dark:bg-slate-700" />
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-red-600 dark:text-red-400">3 Hazards</span>
                              </div>

                              <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 px-2.5 py-1.5 rounded-full shadow-lg text-[9px] font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                🌊 Flood Event
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Floating Map Controls Canvas Overlay */}
                        <div className="relative flex-1 pointer-events-none z-10 w-full min-h-0">
                          {/* Top-Right Compass Heading Indicator */}
                          <div className="absolute top-2.5 right-3 pointer-events-auto">
                            <div
                              className="w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors"
                              title="Compass Heading"
                            >
                              <Compass size={16} />
                            </div>
                          </div>

                          {/* Bottom-Left Layers FAB (Docked cleanly above the bottom sheet) */}
                          <div className="absolute bottom-2.5 left-3 pointer-events-auto">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer active:scale-95 transition-all"
                              title="Map Layers"
                            >
                              <Layers size={15} />
                            </button>
                          </div>

                          {/* Bottom-Right Recenter & GPS Navigation FAB (Docked cleanly above the bottom sheet) */}
                          <div className="absolute bottom-2.5 right-3 pointer-events-auto flex flex-col gap-1.5 items-center">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 border border-blue-400 shadow-md flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
                              title="Recenter GPS Location"
                            >
                              <Navigation size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Docked Mobile Bottom Sheet Drawer */}
                        <div className="relative z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700/80 rounded-t-2xl p-3 shadow-2xl transition-colors">
                          {/* Pull Handle Bar */}
                          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-2" />

                          {/* Nearest Safe Shelter Details */}
                          <div className="flex items-start justify-between mb-1.5">
                            <div>
                              <div className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">NEAREST EVACUATION CENTER</div>
                              <div className="text-xs font-black text-slate-900 dark:text-white">Tetuan Elevated Ridge Center</div>
                            </div>
                            <span className="text-[8.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              OPEN · 68%
                            </span>
                          </div>

                          {/* Distance & High-Ground Telemetry */}
                          <div className="flex items-center justify-between text-[9.5px] text-slate-600 dark:text-slate-300 py-1 border-t border-slate-200 dark:border-slate-800/80">
                            <span>Distance: 1.4 km</span>
                            <span>ETA: 18 min walk</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+22m High Ground</span>
                          </div>

                          {/* Start Navigation Action Button */}
                          {!isNavigating ? (
                            <button
                              onClick={() => setIsNavigating(true)}
                              className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 uppercase tracking-wider transition cursor-pointer"
                            >
                              <Navigation size={13} />
                              <span>▶ START NAVIGATION</span>
                            </button>
                          ) : (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => setIsNavigating(false)}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <X size={13} />
                                <span>Exit Navigation</span>
                              </button>
                              <div className="flex-1 py-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Navigating Live</span>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                      SCREEN 2: REPORT HAZARD (ACTUAL RESIDENT INCIDENT REPORT UI)
                     ───────────────────────────────────────────────────────────── */}
                    {activeResidentScreen === 'report' && (
                      <div className="w-full h-full min-h-0 flex-1 overflow-y-auto p-3.5 space-y-3 animate-enter text-left bg-slate-50 dark:bg-slate-950 transition-colors">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white">Report Emergency Hazard</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400">Directly alerts CDRRMO Disaster Command</p>
                          </div>
                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            CITIZEN DISPATCH
                          </span>
                        </div>

                        {/* Auto-detected GPS location */}
                        <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2 shadow-sm">
                          <MapPin size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <div>
                            <p className="text-[8.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">GPS LOCATION DETECTED</p>
                            <p className="text-[10px] font-bold text-slate-900 dark:text-white">Tetuan Highway (6.9214° N, 122.0790° E)</p>
                          </div>
                        </div>

                        {/* Hazard Type Selector Chips */}
                        <div>
                          <p className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select Hazard Type</p>
                          <div className="grid grid-cols-2 gap-1.5 text-xs">
                            {['🌊 Flash Flood', '🔥 Building Fire', '🚧 Blocked Road', '⚔️ Security Risk'].map((hazard, i) => (
                              <div
                                key={hazard}
                                className={`p-2 rounded-lg border text-[10px] font-bold cursor-pointer transition ${i === 0
                                    ? 'bg-blue-50 dark:bg-blue-600/30 border-blue-500 text-blue-700 dark:text-blue-300'
                                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm'
                                  }`}
                              >
                                {hazard}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Severity level */}
                        <div>
                          <p className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">Severity Level</p>
                          <div className="flex gap-1.5">
                            <span className="flex-1 py-1 text-center rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-400">LOW</span>
                            <span className="flex-1 py-1 text-center rounded bg-amber-100 dark:bg-amber-950 border border-amber-400 dark:border-amber-600 text-[9px] font-bold text-amber-800 dark:text-amber-400">MEDIUM</span>
                            <span className="flex-1 py-1 text-center rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-400">HIGH</span>
                          </div>
                        </div>

                        {/* Description Preview */}
                        <div>
                          <p className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">Incident Details</p>
                          <div className="p-2.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] text-slate-700 dark:text-slate-300 shadow-sm">
                            River surge is rising rapidly onto the main road. Vehicles can no longer pass through.
                          </div>
                        </div>

                        {/* Photo Attachment Bar */}
                        <div className="p-2 bg-white dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-1.5 text-[9.5px] text-slate-500 dark:text-slate-400">
                          <Camera size={14} />
                          <span>Geo-tagged Photo Attached</span>
                        </div>

                        {/* Submit Action Button */}
                        <button
                          onClick={() => {
                            setReportSubmitted(true);
                            setTimeout(() => setReportSubmitted(false), 3000);
                          }}
                          className={`w-full py-2.5 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer ${reportSubmitted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 hover:bg-amber-500 active:scale-95 text-white'
                            }`}
                        >
                          {reportSubmitted ? (
                            <>
                              <Check size={14} />
                              <span>Report Sent to CDRRMO Queue</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={14} />
                              <span>Submit Hazard Report</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                      SCREEN 3: PROFILE & PASS (ACTUAL RESIDENT PROFILE QR UI)
                     ───────────────────────────────────────────────────────────── */}
                    {activeResidentScreen === 'profile' && (
                      <div className="w-full h-full min-h-0 flex-1 overflow-y-auto p-3.5 space-y-3 animate-enter text-left bg-slate-50 dark:bg-slate-950 transition-colors">
                        {/* Resident Identity Header Card */}
                        <div className="p-3 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3 shadow-sm">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white font-black text-base shadow-sm">
                              RS
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-emerald-600 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white">
                              <Check size={10} />
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-black text-slate-900 dark:text-white">Maria Santos</p>
                              <span className="text-[8px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">VERIFIED</span>
                            </div>
                            <p className="text-[9.5px] text-slate-500 dark:text-slate-400">ID: RES-000412 · Brgy. Tetuan</p>
                            <p className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Family Headcount: 4 Members</p>
                          </div>
                        </div>

                        {/* Offline Family QR Pass */}
                        <div className="p-3 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-2 shadow-sm">
                          <div className="inline-block p-2 bg-slate-50 dark:bg-white rounded-xl shadow-sm border border-slate-200 dark:border-transparent">
                            <QrCode size={100} className="text-slate-900" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white">OFFLINE FAMILY PASS</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400">CSWDO Shelter Gate &amp; Food Relief Scanner</p>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-[8.5px] font-bold">
                            <CheckCircle2 size={11} />
                            <span>NO INTERNET REQUIRED AT GATE</span>
                          </div>
                        </div>

                        {/* Relief Goods Eligibility */}
                        <div className="p-2.5 bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-[9.5px] space-y-1">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Relief Allocation:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Eligible (Food Packs + Water)</span>
                          </div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Assigned Center:</span>
                            <span className="text-slate-800 dark:text-white font-semibold">Tetuan Elevated Ridge</span>
                          </div>
                        </div>

                        {/* Save Pass Button */}
                        <button
                          onClick={() => {
                            setPassSaved(true);
                            setTimeout(() => setPassSaved(false), 2500);
                          }}
                          className={`w-full py-2.5 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer ${passSaved
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white'
                            }`}
                        >
                          {passSaved ? (
                            <>
                              <Check size={14} />
                              <span>Pass Cached Offline to Device</span>
                            </>
                          ) : (
                            <>
                              <Download size={14} />
                              <span>Save Pass Offline</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                      AUTHENTIC RESIDENT BOTTOM TAB BAR (MATCHING APPNAVIGATOR)
                     ───────────────────────────────────────────────────────────── */}
                    <div className="mt-auto bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-30 transition-colors shrink-0">
                      <div className="grid grid-cols-3 gap-1">
                        {/* Tab 1: Evacuation Map */}
                        <button
                          onClick={() => setActiveResidentScreen('map')}
                          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${activeResidentScreen === 'map'
                              ? 'text-blue-600 dark:text-blue-400 font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                          <MapPin size={17} className={activeResidentScreen === 'map' ? 'text-blue-600 dark:text-blue-400 scale-110 transition-transform' : 'transition-transform'} />
                          <span className="text-[9px] mt-0.5 font-semibold">Evacuation Map</span>
                        </button>

                        {/* Tab 2: Report Hazard */}
                        <button
                          onClick={() => setActiveResidentScreen('report')}
                          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${activeResidentScreen === 'report'
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                          <AlertTriangle size={17} className={activeResidentScreen === 'report' ? 'text-amber-600 dark:text-amber-400 scale-110 transition-transform' : 'transition-transform'} />
                          <span className="text-[9px] mt-0.5 font-semibold">Report Hazard</span>
                          <span className="absolute top-0.5 right-3 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        </button>

                        {/* Tab 3: Profile */}
                        <button
                          onClick={() => setActiveResidentScreen('profile')}
                          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${activeResidentScreen === 'profile'
                              ? 'text-blue-600 dark:text-blue-400 font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                          <User size={17} className={activeResidentScreen === 'profile' ? 'text-blue-600 dark:text-blue-400 scale-110 transition-transform' : 'transition-transform'} />
                          <span className="text-[9px] mt-0.5 font-semibold">Profile</span>
                        </button>
                      </div>

                      {/* Smartphone Home Indicator Bar */}
                      <div className="w-20 h-1 bg-slate-300 dark:bg-slate-700/80 rounded-full mx-auto mt-2 transition-colors" />
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Mobile Pagination Indicator Dots - docked at the very edge of the bottom navigation bar */}
          <div className={`${overviewSlide === 1 ? 'hidden' : 'flex md:hidden'} items-center justify-center gap-2.5 mt-auto pt-2 pb-1 select-none transition-opacity duration-300`}>
            <button
              type="button"
              onClick={() => setOverviewSlide(0)}
              aria-label="Overview slide"
              className="p-1 cursor-pointer focus:outline-none"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${overviewSlide === 0
                    ? 'w-7 bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-500/30'
                    : 'w-2.5 bg-slate-300 dark:bg-slate-700'
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
                className={`block h-2 rounded-full transition-all duration-300 ${overviewSlide === 1
                    ? 'w-7 bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-500/30'
                    : 'w-2.5 bg-slate-300 dark:bg-slate-700'
                  }`}
              />
            </button>
          </div>

        </div>
      </section>

      {/* ── SECTION 2: HOW EVACROUTE PROTECTS YOUR HOUSEHOLD ── */}
      <section id="protection" className="scroll-mt-16 border-t border-slate-200 dark:border-slate-800">

        {/* Continuous Telemetry Metric Ticker */}
        <div className="py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden select-none">
          <div className="flex animate-marquee-right items-center">
            <div className="flex items-center shrink-0">
              {[...residentProtectionStats, ...residentProtectionStats].map((item, idx) => (
                <div key={`stat-1-${idx}`} className="flex items-center shrink-0">
                  <div className="flex items-center gap-3 px-6 py-1">
                    <span className={`text-xl font-black tracking-tight shrink-0 tabular-nums ${item.color}`}>
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
              {[...residentProtectionStats, ...residentProtectionStats].map((item, idx) => (
                <div key={`stat-2-${idx}`} className="flex items-center shrink-0">
                  <div className="flex items-center gap-3 px-6 py-1">
                    <span className={`text-xl font-black tracking-tight shrink-0 tabular-nums ${item.color}`}>
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

        {/* Asymmetrical 3-Pillar Architectural Layout (Replaces the Generic 6-Card Icon Grid) */}
        <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="max-w-3xl mb-12 text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              How EvacRoute Keeps Your Family Safe
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Engineered specifically to solve real-world emergency hurdles faced by Zamboanga City residents during severe typhoons, storm surges, and fires.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Pillar 1: Dynamic Threat-Avoidance Routing (Hero Feature Spanning 7 Cols) */}
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
                  Standard consumer navigation apps direct vehicles and pedestrians along the shortest geographic path, frequently steering families into rising flood basins, submerged underpasses, or blocked bridges. EvacRoute continuously calculates detour vectors using real-time field reports, steering households to verified high-ground evacuation centers.
                </p>
              </div>

              {/* Technical Comparison Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60">
                  <div className="font-bold text-red-700 dark:text-red-400 mb-0.5">Commercial Navigation</div>
                  <div className="text-slate-600 dark:text-slate-400 text-[11px]">Unaware of active flood surges. Directs traffic through impassable river channels.</div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">EvacRoute Telemetry</div>
                  <div className="text-slate-600 dark:text-slate-400 text-[11px]">Dynamic routing via ridge bypasses, guaranteeing elevation above storm surge waterlines.</div>
                </div>
              </div>
            </div>

            {/* Pillar 2: Offline Cryptographic Family Passes (Spanning 5 Cols) */}
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
                  During widespread grid failures and cellular outages, digital tools that require server round-trips become unusable. EvacRoute caches your household registration and QR token directly in your device storage, allowing immediate admission and relief ration scanning at shelter gates without internet.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Tamper-Proof QR Generation</p>
                  <p className="text-[11px] text-slate-500">Instant registration at CSWDO checkpoints</p>
                </div>
                <FileCheck2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
            </div>

            {/* Pillar 3: Sub-30s SOS Alert Dispatch (Full Width Banner) */}
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
                    When trapped by rising water or structural collapse, one tap on Emergency SOS broadcasts your verified coordinates, household headcount, and registered medical vulnerabilities directly to CDRRMO fleet dispatchers, bypassing noisy social media channels.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dispatch Latency:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">&lt; 30 Seconds</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transmitted Payload:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">GPS + Family Roster</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Receiving Desk:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">CDRRMO Rescue Operations</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Secondary Civic Systems Strip (Clean Spec Points) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">112 Official Safe Shelters</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Calibrated elevation meter readings, real-time capacities, and water amenities across all 98 barangays.</p>
            </div>

            <div className="p-4 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">Official Municipal Advisories</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Direct disaster bulletins issued by local DRRM officials without social media distortion or rumors.</p>
            </div>

            <div className="p-4 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">Household Vulnerability Profiles</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pre-registered infant formula, elderly mobility, and medication needs for rapid triage at camp reception.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 3: 112 OFFICIAL SAFE SHELTERS DIRECTORY ── */}
      <section id="shelters" className="py-16 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800">
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
                Zamboanga City has 112 official evacuation shelters calibrated into the EvacRoute mobile network. The app automatically identifies your closest safe haven based on your location and road conditions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-0.5">High-Ground Ridges</div>
                  <p className="text-xs text-slate-500">Pasonanca Park (+45m), Upper La Paz, and elevated mountain clusters safe from coastal surges.</p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-blue-600 dark:text-blue-400 font-bold text-sm mb-0.5">Primary Centers</div>
                  <p className="text-xs text-slate-500">Equipped with clean water filtration, solar backup generators, and CSWDO medical stations.</p>
                </div>
              </div>
            </div>

            {/* Verified Shelter Directory Card */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Sample Verified High-Ground Centers</h3>
                  <p className="text-xs text-slate-500">Cached in full within the mobile offline database</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded">
                  OFFICIAL
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: 'Tetuan Central Evacuation Center', type: 'Primary Center', cap: '600 Persons', elev: '+14m' },
                  { name: 'Pasonanca Park Safe Haven', type: 'High-Ground Ridge', cap: '1,200 Persons', elev: '+45m' },
                  { name: 'Tumaga Riverbank Primary Court', type: 'Primary Cluster', cap: '500 Persons', elev: '+18m' },
                  { name: 'Guiwan Barangay Staging Center', type: 'Secondary Shelter', cap: '350 Persons', elev: '+12m' },
                ].map((s, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.type} · Ground Elevation: {s.elev}</p>
                    </div>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{s.cap}</span>
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

      {/* ── SECTION 4: VERIFIED INSTALLATION GUIDE ── */}
      <section id="install-guide" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10 text-left">
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Android Sideloading Walkthrough
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 mb-2">
            How to Install EvacRoute on Your Phone
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Deploy the verified municipal emergency application directly to your Android device in three straightforward steps.
          </p>
        </div>

        {/* Clean Semantic Step Progression (No Circled Number Badges) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
              Phase 01
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Download the Official Package
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Save the verified <span className="font-semibold text-blue-600 dark:text-blue-400">{MOBILE_APP_CONFIG.apkFileName}</span> (~{MOBILE_APP_CONFIG.fileSize}) package directly to your phone via the download button.
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
              When prompted by Android Security, navigate to <span className="font-semibold text-slate-800 dark:text-slate-200">Settings</span> and toggle on <span className="font-semibold text-slate-800 dark:text-slate-200">"Install apps from this source"</span>.
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
              Launch the application, enter your household members, and generate your offline relief pass for immediate emergency preparedness.
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
              Always free, zero surveillance telemetry, built for the citizens of Zamboanga City.
            </p>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Download size={16} />
            <span>{downloading ? 'Preparing Package...' : `Download ${MOBILE_APP_CONFIG.apkFileName} (${MOBILE_APP_CONFIG.versionTag})`}</span>
          </button>
        </div>

      </section>

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
                Civic emergency evacuation planning and household protection platform operated by CDRRMO Zamboanga City.
              </p>
            </div>

            <div>
              <p className="font-bold text-white uppercase tracking-wider mb-3">Quick Navigation</p>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('overview')} className="hover:text-blue-400 transition cursor-pointer">Platform Overview</button></li>
                <li><button onClick={() => scrollToSection('protection')} className="hover:text-blue-400 transition cursor-pointer">Household Protection</button></li>
                <li><button onClick={() => scrollToSection('shelters')} className="hover:text-blue-400 transition cursor-pointer">112 Safe Shelters</button></li>
                <li><button onClick={() => scrollToSection('install-guide')} className="hover:text-blue-400 transition cursor-pointer">Installation Guide</button></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white uppercase tracking-wider mb-3">Zamboanga Emergency Hotlines</p>
              <ul className="space-y-1.5">
                <li><span className="text-slate-300 font-semibold">City Emergency (CDRRMO):</span> 911 / (062) 992-3181</li>
                <li><span className="text-slate-300 font-semibold">Bureau of Fire Protection:</span> 160 / 0917-FIRE-160</li>
                <li><span className="text-slate-300 font-semibold">Police Station 11 (Central):</span> 0917-POLICE-911</li>
                <li><span className="text-slate-300 font-semibold">Zamboanga City Medical Center:</span> (062) 991-0573</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white uppercase tracking-wider mb-3">Barangay Coordination</p>
              <p className="text-slate-400 mb-2 leading-relaxed">
                For questions regarding your designated high-ground cluster, coordinate directly with your local Barangay DRRM Council.
              </p>
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 size={14} />
                <span>Public Civic Safety Asset</span>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
            <p>© 2026 City Disaster Risk Reduction &amp; Management Office (CDRRMO), Zamboanga City.</p>
            <div className="flex items-center gap-4">
              <span>{MOBILE_APP_CONFIG.versionTag}</span>
              <span>•</span>
              <button onClick={handleDownload} className="text-blue-400 hover:underline cursor-pointer">Download APK</button>
              <span>•</span>
              <Link to="/admin/login" className="text-slate-600 hover:text-slate-400 transition flex items-center gap-1" title="Authorized Staff Access">
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
        className={`${overviewSlide === 1 ? 'hidden' : 'md:hidden fixed'} bottom-0 left-0 right-0 z-40 flex justify-center px-4`}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
      >
        <div
          className={`flex items-center justify-around px-2 py-1.5 w-full max-w-sm rounded-xl border transition-all ${isIOS
              ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/80 dark:border-slate-800 shadow-xl'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg'
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
                <Icon
                  size={17}
                  className={
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }
                />
                <span
                  className={`text-[10px] mt-0.5 ${isActive
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                  {item.shortLabel || item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

