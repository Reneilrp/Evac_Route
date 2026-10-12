import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Download,
  Smartphone,
  Navigation,
  QrCode,
  Flame,
  Radio,
  MapPin,
  CheckCircle2,
  Building2,
  Sun,
  Moon,
  ShieldCheck,
  Menu,
  X,
  Compass,
  Zap,
  ArrowDown,
  Heart,
  Users,
  AlertCircle,
  HelpCircle,
  Lock,
  ArrowUpRight,
  Check,
  AlertTriangle,
  User,
  Camera,
  Layers,
  PhoneCall,
  ArrowRight,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function LandingPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [activeResidentScreen, setActiveResidentScreen] = useState('map'); // 'map' | 'report' | 'profile'
  const [householdStats, setHouseholdStats] = useState({
    households: 0,
    residents: 0,
    loaded: false,
  });
  const [downloading, setDownloading] = useState(false);

  // Platform detection for mobile touch & iOS HIG styling
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent || '';
      const isApple =
        /iPad|iPhone|iPod/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isApple);
    }
  }, []);

  // Interactive phone preview states
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
      // Swiped left -> slide to Mobile UI Showcasing
      setOverviewSlide(1);
    } else if (distance < -45) {
      // Swiped right -> slide back to Overview
      setOverviewSlide(0);
    }
  };

  const navRefs = useRef({});
  const isClickScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const navItems = [
    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: Smartphone },
    { id: 'protection', label: 'How It Protects You', shortLabel: 'Protection', icon: ShieldCheck },
    { id: 'shelters', label: 'Safe Shelters', shortLabel: 'Shelters', icon: Building2 },
    { id: 'install-guide', label: 'Installation Guide', shortLabel: 'Install', icon: Download },
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
      title: 'Walk into Danger',
      desc: 'Avoids active flood & fire zones',
    },
    {
      stat: '< 30s',
      color: 'text-red-600 dark:text-red-400',
      title: 'SOS Alert Delivery',
      desc: 'Transmitted directly to rescue units',
    },
    {
      stat: '98',
      color: 'text-amber-600 dark:text-amber-400',
      title: 'Barangays Covered',
      desc: 'Complete Zamboanga City safety net',
    },
  ];

  // Sliding underline position calculation
  const updateUnderline = useCallback(() => {
    const activeEl = navRefs.current[activeSection];
    if (activeEl) {
      const inset = 6;
      setUnderlineStyle({
        left: activeEl.offsetLeft + inset,
        width: Math.max(0, activeEl.offsetWidth - (inset * 2)),
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

  // Clean up any pending scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Cancel programmatic smooth scroll lock immediately when user manually scrolls or touches
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

  // Monitor scroll for blurred header transition & active section spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 20);

      // Prevent scroll-spy from jittering through intermediate sections while smoothly scrolling programmatically
      if (isClickScrollingRef.current) return;

      const sectionIds = ['overview', 'protection', 'shelters', 'install-guide'];
      const scrollThreshold = 140; // pixel offset below header

      // At or near very top of page activates overview
      if (scrollY < 80) {
        setActiveSection('overview');
        return;
      }

      // Near bottom of page activates the last section
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

  // Fetch real database household & resident statistics on mount
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
        // Fallback gracefully without throwing errors
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    
    // Direct browser download
    const link = document.createElement('a');
    link.href = '/downloads/EvacRoute.apk';
    link.setAttribute('download', 'EvacRoute.apk');
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

    // Release programmatic scroll lock once smooth scroll completes
    scrollTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
      scrollTimeoutRef.current = null;
    }, 850);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-200">
      
      {/* ── Fixed Navigation Bar (Resident-Focused, No Public Admin Buttons) ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-md py-3'
            : 'bg-transparent border-b border-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <a
            href="#overview"
            onClick={(e) => { e.preventDefault(); scrollToSection('overview'); }}
            className="flex items-center gap-3 group focus:outline-none cursor-pointer"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <ShieldAlert size={22} className="text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider text-slate-900 dark:text-white">
                EvacRoute
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links with Sliding Underline Indicator */}
          <nav className="relative hidden md:flex items-center gap-1 lg:gap-2 py-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => { navRefs.current[item.id] = el; }}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-3 py-2 text-xs font-bold transition-colors duration-200 cursor-pointer select-none ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Sliding Underline Indicator Bar */}
            <span
              className="absolute bottom-0 h-[2.5px] bg-blue-600 dark:bg-blue-400 rounded-full shadow-sm shadow-blue-500/50 transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: `${underlineStyle.left}px`,
                width: `${underlineStyle.width}px`,
                opacity: underlineStyle.opacity,
              }}
            />
          </nav>

          {/* Desktop Right Action Buttons (hidden on phone, visible md+) */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition shadow-sm cursor-pointer shrink-0"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-700" />}
            </button>

            {/* Direct Citizen Download CTA Button */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 lg:px-5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 tracking-wide cursor-pointer shrink-0"
            >
              <Download size={14} className="shrink-0" />
              <span>Download APK</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">v1.0.1</span>
            </button>
          </div>

          {/* Mobile Header Menu Trigger (Phone only) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close quick action menu' : 'Open quick action menu'}
              className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                mobileMenuOpen ? 'z-[60]' : 'z-10'
              } ${
                isIOS
                  ? 'border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 active:scale-90'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-800 active:scale-95'
              }`}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Top-Right Quick Action Menu (Download App & Theme Toggle Only) ── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop overlay — dims top header, hero content, and bottom nav */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden animate-enter"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Floating Quick Action Dropdown Menu (40-50% screen width, right-aligned) */}
          <div
            data-testid="mobile-top-action-menu"
            className={`fixed top-[calc(3.75rem+env(safe-area-inset-top,0px))] right-[max(0.75rem,env(safe-area-inset-right))] w-[50%] min-w-[175px] max-w-[220px] z-[60] p-2 rounded-2xl border shadow-2xl md:hidden animate-enter ${
              isIOS
                ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-slate-200/70 dark:border-slate-800/70 ring-1 ring-white/10 shadow-black/25'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-[0_12px_32px_rgba(0,0,0,0.35)]'
            }`}
          >
            <div className="flex flex-col gap-1">
              {/* Download App */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDownload();
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer text-left"
              >
                <Download size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">Download App</span>
              </button>

              {/* Theme Toggle (Light / Dark mode) */}
              <button
                type="button"
                onClick={() => {
                  toggleDarkMode();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
              >
                {darkMode ? (
                  <Sun size={15} className="text-amber-400 shrink-0" />
                ) : (
                  <Moon size={15} className="text-blue-600 shrink-0" />
                )}
                <span className="truncate">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SECTION 1: CITIZEN PLATFORM OVERVIEW (UNIFIED HERO FOLD) ── */}
      <section id="overview" className="relative min-h-[calc(100svh-4rem)] pt-16 pb-20 md:py-12 lg:py-16 flex flex-col justify-between overflow-x-clip">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-blue-500/10 dark:bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-emerald-500/10 dark:bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10 w-full flex-1 flex flex-col justify-between">
          
          {/* Responsive Slide Track Container */}
          <div
            className="w-full overflow-hidden touch-pan-y my-auto flex-1 flex flex-col justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className={`flex md:grid md:grid-cols-12 gap-6 md:gap-8 lg:gap-10 xl:gap-12 items-center w-full my-auto transition-transform duration-300 ease-out ${
                overviewSlide === 1 ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
              }`}
            >
              {/* Column 1 / Slide 0: Refined Headline, Subtitle, CTA, and Trust Badges */}
              <div className="w-full shrink-0 md:shrink md:w-auto md:col-span-7 xl:col-span-7 space-y-3.5 sm:space-y-4 lg:space-y-5 text-center md:text-left my-auto px-1 sm:px-2 md:px-0 flex flex-col justify-center">
                
                {/* Scaled Headline & Concise Subtitle (At the Top) */}
                <div className="space-y-2 sm:space-y-2.5">
                  <h1 className="text-[clamp(1.45rem,5.2vw,2.5rem)] md:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.18]">
                    Smart Evacuation Routes &amp; Emergency Protection for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Every Household.</span>
                  </h1>
                  <p className="text-[clamp(0.8rem,2.6vw,1rem)] text-slate-600 dark:text-slate-300 max-w-lg mx-auto md:mx-0 leading-relaxed font-normal">
                    Real-time flood evasion routing to safe high-ground shelters and offline family passes.
                  </p>
                </div>

                {/* Micro Citizen Trust Row - Positioned directly above Download APK */}
                <div className="pt-0.5 flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-[clamp(0.68rem,2.2vw,0.8rem)] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                    <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                    <span>SHA-256 Clean</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 hidden xs:inline">•</span>
                  <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                    <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                    <span>100% Free · No Ads</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 hidden xs:inline">•</span>
                  <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                    <QrCode size={13} className="text-emerald-500 shrink-0" />
                    <span>Works 100% Offline</span>
                  </div>
                </div>

                {/* Direct APK Download & Action Buttons */}
                <div className="pt-0.5 space-y-2.5 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2.5 sm:gap-3.5">
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 xl:px-7 xl:py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs sm:text-sm lg:text-base rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group"
                    >
                      <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                      <span>{downloading ? "Preparing Download..." : "Download APK"}</span>
                      <span className="text-[10px] sm:text-xs font-semibold py-0.5 px-2 bg-white/20 rounded-md">90.2 MB</span>
                    </button>

                    <button
                      onClick={() => scrollToSection('protection')}
                      className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 xl:py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck size={15} className="text-emerald-500" />
                      <span>How It Protects</span>
                      <ArrowDown size={13} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Group 4: Compact Emergency Hotline & Live Protection Footer */}
                <div className="pt-2.5 sm:pt-3.5 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-center md:justify-between gap-1.5 sm:gap-2.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={12} className="text-red-500 shrink-0 animate-pulse" />
                    <span className="font-medium text-slate-600 dark:text-slate-300">Emergency:</span>
                    <a href="tel:911" className="font-extrabold text-red-600 dark:text-red-400 hover:underline">
                      Dial 911
                    </a>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <a href="tel:0629923181" className="font-semibold text-slate-700 dark:text-slate-300 hover:underline">
                      (062) 992-3181
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>
                      {householdStats.loaded && householdStats.households > 0 ? (
                        <>
                          <strong className="text-slate-900 dark:text-white font-bold">{householdStats.households.toLocaleString()}</strong> households protected
                        </>
                      ) : (
                        <>
                          Covering <strong className="text-slate-900 dark:text-white font-bold">98 Barangays</strong> in Zamboanga City
                        </>
                      )}
                    </span>
                  </div>
                </div>

              </div>

              {/* Column 2 / Slide 1: Responsive Dual-Mode Mockup / App Preview Card */}
              <div className="w-full shrink-0 md:shrink md:w-auto md:col-span-5 xl:col-span-5 flex flex-col items-center justify-center md:justify-end relative my-auto px-1 sm:px-2 md:px-0">
                {/* Responsive Container: 3D Smartphone on Desktop (md+), Clean App Card on Mobile (<md) */}
              <div className="relative w-full max-w-[285px] xs:max-w-[310px] sm:max-w-[330px] md:w-[295px] lg:w-[320px] xl:w-[335px] rounded-[24px] sm:rounded-[32px] lg:rounded-[42px] bg-slate-900 dark:bg-slate-950 p-2 sm:p-2.5 lg:p-3 shadow-2xl border border-slate-300 dark:border-slate-800/80 md:border-[4px] lg:border-[5px] md:border-slate-300 dark:md:border-slate-800 md:ring-1 md:ring-slate-400/30 dark:md:ring-slate-700/50 transition-colors duration-300">
                {/* Phone Speaker Notch (Tablet & Desktop - hidden on small mobile) */}
                <div className="hidden md:flex absolute top-5 left-1/2 -translate-x-1/2 w-24 h-3.5 bg-slate-900 dark:bg-slate-950 rounded-full z-30 items-center justify-center transition-colors">
                  <div className="w-10 h-1 bg-slate-700 dark:bg-slate-800 rounded-full" />
                </div>

                {/* Inner Screen Container - fills full vertical space dynamically */}
                <div className="w-full rounded-[18px] sm:rounded-[24px] lg:rounded-[34px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden flex flex-col h-[420px] xs:h-[450px] sm:h-[480px] md:h-[460px] lg:h-[500px] xl:h-[540px] border border-slate-200 dark:border-slate-800 relative shadow-inner transition-colors duration-300">
                  
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
                    <div className="relative flex-1 overflow-hidden flex flex-col justify-between animate-enter select-none">
                      
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

                      {/* Floating Map Controls (Right & Left) */}
                      <div className="relative z-10 px-3 flex justify-between items-end mb-2 pointer-events-none">
                        {/* Layers FAB (Left) */}
                        <div className="pointer-events-auto w-7 h-7 rounded-full bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-md transition-colors">
                          <Layers size={13} />
                        </div>

                        {/* Zoom & Recenter Controls (Right) */}
                        <div className="pointer-events-auto space-y-1.5">
                          <div className="w-7 h-7 rounded-full bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-md transition-colors">
                            <Compass size={13} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="w-7 h-7 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-white shadow-md">
                            <Navigation size={13} />
                          </div>
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
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 animate-enter text-left bg-slate-50 dark:bg-slate-950 transition-colors">
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
                              className={`p-2 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                                i === 0
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
                        className={`w-full py-2.5 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer ${
                          reportSubmitted
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
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 animate-enter text-left bg-slate-50 dark:bg-slate-950 transition-colors">
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
                        className={`w-full py-2.5 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer ${
                          passSaved
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
                  <div className="mt-auto bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-2 pt-2 pb-2 z-30 transition-colors">
                    <div className="grid grid-cols-3 gap-1">
                      {/* Tab 1: Evacuation Map */}
                      <button
                        onClick={() => setActiveResidentScreen('map')}
                        className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
                          activeResidentScreen === 'map'
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
                        className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
                          activeResidentScreen === 'report'
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
                        className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
                          activeResidentScreen === 'profile'
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
        <div className="flex md:hidden items-center justify-center gap-2.5 mt-auto pt-2 pb-1 select-none">
          <button
            type="button"
            onClick={() => setOverviewSlide(0)}
            aria-label="Overview slide"
            className="p-1 cursor-pointer focus:outline-none"
          >
            <span
              className={`block h-2 rounded-full transition-all duration-300 ${
                overviewSlide === 0
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
              className={`block h-2 rounded-full transition-all duration-300 ${
                overviewSlide === 1
                  ? 'w-7 bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-500/30'
                  : 'w-2.5 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          </button>
        </div>

        </div>
      </section>

      {/* ── Resident Protection Metrics Infinite Ticker (Rightward Marquee) ── */}
      <section className="py-4 sm:py-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-y border-slate-200/80 dark:border-slate-800/80 overflow-hidden relative transition-colors select-none">
        {/* Left & Right gradient edge fades for smooth entry/exit */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />

        {/* Continuous Marquee Track moving right */}
        <div className="flex animate-marquee-right items-center">
          {/* Half 1 */}
          <div className="flex items-center shrink-0">
            {[...residentProtectionStats, ...residentProtectionStats].map((item, idx) => (
              <div key={`stat-1-${idx}`} className="flex items-center shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-1">
                  <span className={`text-xl sm:text-2xl font-black tracking-tight shrink-0 ${item.color}`}>
                    {item.stat}
                  </span>
                  <div className="text-left leading-tight">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {item.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {item.desc}
                    </p>
                  </div>
                </div>
                {/* Styled vertical divider line between metrics */}
                <div className="h-6 sm:h-7 w-[1.5px] bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent shrink-0" />
              </div>
            ))}
          </div>

          {/* Half 2 (Exact Duplicate for Infinite Seamless Loop) */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            {[...residentProtectionStats, ...residentProtectionStats].map((item, idx) => (
              <div key={`stat-2-${idx}`} className="flex items-center shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-1">
                  <span className={`text-xl sm:text-2xl font-black tracking-tight shrink-0 ${item.color}`}>
                    {item.stat}
                  </span>
                  <div className="text-left leading-tight">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {item.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {item.desc}
                    </p>
                  </div>
                </div>
                {/* Styled vertical divider line between metrics */}
                <div className="h-6 sm:h-7 w-[1.5px] bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: HOW EVACROUTE PROTECTS YOUR HOUSEHOLD ── */}
      <section id="protection" className="py-10 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Zap size={13} /> Resident Protection
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How EvacRoute Keeps Your Family Safe
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            Built specifically to solve real-world emergency hurdles faced by Zamboanga City residents during severe typhoons, storm surges, and fires.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          
          {/* Card 1 */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition duration-200 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3.5 shrink-0">
              <Navigation size={20} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">Smart Threat-Avoidance Routing</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Standard GPS maps can lead you into flooded streets or blocked bridges. EvacRoute dynamically steers your family around active hazard zones to safe high ground.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition duration-200 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center mb-3.5 shrink-0">
              <Radio size={20} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">Instant Emergency SOS</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              If floodwaters rise or family members are trapped, tap Emergency SOS. Your exact GPS coordinates and household headcount are immediately dispatched to CDRRMO rescue units.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition duration-200 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5 shrink-0">
              <QrCode size={20} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">Offline Family QR Passports</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              During blackouts or cell network failures, your digital pass remains ready offline. Shelter staff scan your QR code for rapid entry and relief goods without manual forms.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition duration-200 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3.5 shrink-0">
              <Building2 size={20} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">112 Official Safe Shelters</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Find verified evacuation centers in your barangay with live open/closed status, current occupancy levels, elevation meters, and available relief amenities.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition duration-200 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3.5 shrink-0">
              <AlertCircle size={20} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">Authoritative Neighborhood Alerts</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Receive verified emergency alerts directly from Zamboanga City DRRM without false social media rumors or delayed text advisories.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition duration-200 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3.5 shrink-0">
              <Users size={20} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">Household Profile Preparedness</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Pre-register family members, infant needs, and elderly mobility requirements so rescue teams and camp managers understand your exact household needs.
            </p>
          </div>

        </div>
      </section>

      {/* ── SECTION 3: 112 OFFICIAL SAFE SHELTERS DIRECTORY ── */}
      <section id="shelters" className="py-12 sm:py-16 lg:py-20 bg-slate-100/70 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-5 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <MapPin size={14} /> Citywide Coverage
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Know Your Nearest High-Ground Haven Before Disaster Strikes
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed">
                Zamboanga City has 112 official evacuation shelters calibrated into the EvacRoute mobile network. The app automatically identifies your closest safe haven based on your location and road conditions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="text-emerald-500 font-bold text-base sm:text-lg mb-1 flex items-center gap-2">
                    <MapPin size={18} /> High-Ground Havens
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pasonanca Park, Tetuan Elevated Ridge, and safe high hills.</p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="text-blue-500 font-bold text-base sm:text-lg mb-1 flex items-center gap-2">
                    <Building2 size={18} /> Primary Centers
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Equipped with clean water, solar backup, and medical stations.</p>
                </div>
              </div>
            </div>

            {/* Quick Resident Shelter Reference Card */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 sm:p-7 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 sm:space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Sample Verified High-Ground Shelters</h3>
                  <p className="text-xs text-slate-500">Available offline in the EvacRoute app</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-lg">
                  VERIFIED
                </span>
              </div>

              <div className="space-y-4">
                {[
                  { name: "Tetuan Central Evacuation Center", type: "Primary Center", cap: "600 Persons", elev: "14m" },
                  { name: "Pasonanca Park High-Ground Safe Haven", type: "Tsunami/Flood Ridge", cap: "1,200 Persons", elev: "45m" },
                  { name: "Tumaga Riverbank Primary Evacuation Court", type: "Primary Cluster", cap: "500 Persons", elev: "18m" },
                  { name: "Guiwan Barangay Staging Court", type: "Secondary Shelter", cap: "350 Persons", elev: "12m" },
                ].map((s, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{s.type} · Elevation: {s.elev}</p>
                    </div>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{s.cap}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDownload}
                  className="w-full py-3 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download App to Access All 112 Shelters Offline</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 4: 3-STEP INSTALLATION GUIDE ── */}
      <section id="install-guide" className="py-10 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Download size={13} /> Direct Android Download
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How to Install EvacRoute on Your Phone
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-2">
            Install the official application in 3 simple steps directly on your Android device.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center relative shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-3.5 shadow-md shadow-blue-500/20">
              1
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">1. Download the APK</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tap the download button to save the verified <span className="font-bold text-blue-600 dark:text-blue-400">EvacRoute.apk</span> (~90.2 MB) directly to your phone.
            </p>
          </div>

          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center relative shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-3.5 shadow-md shadow-blue-500/20">
              2
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">2. Allow Unknown Sources</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              When prompted by Android, tap <span className="font-semibold text-slate-800 dark:text-slate-200">Settings</span> and toggle on <span className="font-semibold text-slate-800 dark:text-slate-200">"Install apps from this source"</span>.
            </p>
          </div>

          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center relative shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-3.5 shadow-md shadow-blue-500/20">
              3
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">3. Open &amp; Register Household</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tap <span className="font-semibold text-slate-800 dark:text-slate-200">Install</span>. Launch the app and register your household profile to generate your offline family pass!
            </p>
          </div>

        </div>

        {/* Download Banner CTA */}
        <div className="mt-8 sm:mt-10 p-5 sm:p-8 lg:p-10 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Protect Your Household Today
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
              Download the official EvacRoute app now. Always free, zero telemetry tracking, and built to safeguard every family in Zamboanga City.
            </p>
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 transition duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Download size={18} />
                <span>{downloading ? "Preparing Download..." : "Download EvacRoute.apk (v1.0.1)"}</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>
                {householdStats.loaded && householdStats.households > 0
                  ? `Protecting ${householdStats.households.toLocaleString()} registered households · Verified Android Build`
                  : "Official City Emergency Tool · Verified Android Build"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer with City Hotlines & Discreet Staff Link ── */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 pt-10 sm:pt-14 pb-28 md:pb-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 pb-8 border-b border-slate-800">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-black text-lg">
                <ShieldAlert size={22} className="text-blue-500" />
                <span>EvacRoute</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart hazard-aware emergency evacuation planning and family protection platform for the citizens of Zamboanga City.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Quick Navigation</p>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => scrollToSection('overview')} className="hover:text-blue-400 transition cursor-pointer">Overview</button></li>
                <li><button onClick={() => scrollToSection('protection')} className="hover:text-blue-400 transition cursor-pointer">How It Protects You</button></li>
                <li><button onClick={() => scrollToSection('shelters')} className="hover:text-blue-400 transition cursor-pointer">112 Safe Shelters</button></li>
                <li><button onClick={() => scrollToSection('install-guide')} className="hover:text-blue-400 transition cursor-pointer">Installation Guide</button></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Zamboanga Emergency Hotlines</p>
              <ul className="space-y-1.5 text-xs">
                <li><span className="text-slate-300 font-bold">City Emergency (CDRRMO):</span> 0917-DRRM-911 / 911</li>
                <li><span className="text-slate-300 font-bold">Bureau of Fire Protection (BFP):</span> 0917-FIRE-160 / 160</li>
                <li><span className="text-slate-300 font-bold">Police Station 11 (Central):</span> 0917-POLICE-911</li>
                <li><span className="text-slate-300 font-bold">Zamboanga City Medical Center:</span> 0917-ZCMC-999</li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Resident Support</p>
              <p className="text-xs text-slate-400 mb-3">
                Have questions about your barangay evacuation routes or safe shelters? Reach out to your local Barangay DRRM Committee.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 size={15} />
                <span>Always Free &amp; Community Supported</span>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 EvacRoute • City Disaster Risk Reduction &amp; Management Office (CDRRMO), Zamboanga City.</p>
            <div className="flex items-center gap-4">
              <span>Version 1.0.1</span>
              <span>•</span>
              <button onClick={handleDownload} className="text-blue-400 hover:underline cursor-pointer">Download APK</button>
              <span>•</span>
              {/* Discreet, unhighlighted link for authorized LGU staff only */}
              <Link to="/admin/login" className="text-slate-600 hover:text-slate-400 transition flex items-center gap-1" title="Official Staff Access">
                <Lock size={11} />
                <span className="text-[11px]">Staff Access</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation Bar (iOS Frosted Glass / Android M3 Elevation) ── */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <div
          className={`flex items-center justify-around px-2 pt-2 pb-1.5 w-full max-w-sm rounded-2xl border transition-all duration-200 ${
            isIOS
              ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-slate-200/60 dark:border-slate-800/60 shadow-2xl shadow-black/20 ring-1 ring-inset ring-white/10'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.25)]'
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
                className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-150 cursor-pointer ${
                  isIOS ? 'active:scale-90' : 'active:scale-95 active:bg-slate-100 dark:active:bg-slate-800'
                }`}
              >
                <div
                  className={`flex items-center justify-center transition-all duration-200 ${
                    isIOS
                      ? isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-500'
                      : isActive
                        ? 'px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                        : 'px-3 py-1 rounded-full text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Icon size={18} className={isActive && !isIOS ? 'scale-105' : ''} />
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                    isActive
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : 'font-medium text-slate-500 dark:text-slate-400'
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
