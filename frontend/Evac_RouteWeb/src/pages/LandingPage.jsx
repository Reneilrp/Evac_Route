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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [activeResidentScreen, setActiveResidentScreen] = useState('map'); // 'map' | 'report' | 'profile'
  const [downloadCount, setDownloadCount] = useState(1420);
  const [downloading, setDownloading] = useState(false);

  // Interactive phone preview states
  const [isNavigating, setIsNavigating] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [passSaved, setPassSaved] = useState(false);

  const navRefs = useRef({});
  const isClickScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'protection', label: 'How It Protects You' },
    { id: 'shelters', label: 'Safe Shelters' },
    { id: 'install-guide', label: 'Installation Guide' },
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
    window.addEventListener('resize', updateUnderline);
    return () => {
      window.removeEventListener('resize', updateUnderline);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [updateUnderline]);

  // Monitor scroll for blurred header transition & active section spy
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Prevent scroll-spy from jittering through intermediate sections while smoothly scrolling
      if (isClickScrollingRef.current) return;

      const sectionIds = ['overview', 'protection', 'shelters', 'install-guide'];
      const scrollThreshold = 140; // pixel offset below header

      // Near bottom of page activates the last section
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
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

  const handleDownload = () => {
    setDownloading(true);
    setDownloadCount(prev => prev + 1);
    
    // Direct browser download
    const link = document.createElement('a');
    link.href = '/downloads/Evac_Route.apk';
    link.setAttribute('download', 'Evac_Route.apk');
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
    }

    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }

    // Release programmatic scroll lock once smooth scroll completes
    scrollTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
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
                EVAC_ROUTE
              </span>
              <span className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
                Zamboanga City Citizen Safety
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

          {/* Action CTAs: Focused Exclusively on Citizen Download & Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition shadow-sm cursor-pointer"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
            </button>

            {/* Direct Citizen Download CTA Button */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 tracking-wide cursor-pointer"
            >
              <Download size={15} />
              <span>Download APK</span>
              <span className="hidden sm:inline-block text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">v1.0.1</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 md:hidden rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-3 pb-6 space-y-1.5 animate-enter shadow-xl">
            {navItems.map((item, idx) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border-l-4 border-blue-600 dark:border-blue-400 shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-l-4 border-transparent'
                  }`}
                >
                  <span>{`${idx + 1}. ${item.label}`}</span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-500/50" />
                  )}
                </button>
              );
            })}
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95 text-white font-bold text-sm shadow-md transition cursor-pointer"
            >
              <Download size={16} />
              <span>Download Evac_Route APK · 90+ MB</span>
            </button>
          </div>
        )}
      </header>

      {/* ── SECTION 1: CITIZEN PLATFORM OVERVIEW (UNIFIED HERO FOLD) ── */}
      <section id="overview" className="relative min-h-screen lg:h-[100dvh] pt-20 pb-4 lg:pt-24 lg:pb-6 flex items-center overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-blue-500/10 dark:bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-emerald-500/10 dark:bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full h-full flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-center w-full my-auto">
            
            {/* Left Column: Headline, Description, Download CTA, Trust Badges, Emergency Hotlines */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-3.5 sm:space-y-4 xl:space-y-5 text-center lg:text-left my-auto">
              
              {/* Resident Safety Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold tracking-wide shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                </span>
                <span>Official Citizen Safety App · Zamboanga City DRRM</span>
              </div>

              {/* Major Resident Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
                Smart Evacuation Routes &amp; Emergency Protection for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Every Household.</span>
              </h1>

              {/* Resident Subtitle */}
              <p className="text-xs sm:text-sm md:text-base xl:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Never get trapped by rising floodwaters or blocked roads. Evac_Route automatically calculates safe escape paths away from active disasters to the nearest high-ground shelter, provides 1-tap SOS rescue alerts, and keeps your family pass ready offline.
              </p>

              {/* Direct APK Download & Explore Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full sm:w-auto px-7 py-3.5 xl:px-8 xl:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                  <span>{downloading ? "Preparing Download..." : "Download Evac_Route APK"}</span>
                  <span className="text-xs font-semibold py-0.5 px-2 bg-white/20 rounded-md">90+ MB</span>
                </button>

                <button
                  onClick={() => scrollToSection('protection')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck size={18} className="text-emerald-500" />
                  <span>How It Protects</span>
                  <ArrowDown size={14} className="text-slate-400" />
                </button>
              </div>

              {/* Citizen Trust Badges */}
              <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>SHA-256 Verified Clean</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 size={16} className="text-blue-500" />
                  <span>100% Free · No Ads</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <QrCode size={16} className="text-emerald-500" />
                  <span>Works 100% Offline</span>
                </div>
              </div>

              {/* Emergency Hotline Alert Strip */}
              <div className="p-2.5 sm:p-3 bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300">
                  <PhoneCall size={16} className="text-red-600 animate-pulse" />
                  <span>Emergency Hotlines:</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href="tel:911" className="font-extrabold text-red-600 dark:text-red-400 hover:underline">
                    Dial 911
                  </a>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <a href="tel:0629923181" className="font-bold text-slate-700 dark:text-slate-300 hover:underline">
                    CDRRMO: (062) 992-3181
                  </a>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Over <strong className="text-slate-900 dark:text-white">{downloadCount.toLocaleString()}</strong> households protected across Zamboanga City.
              </div>

            </div>

            {/* Right: Responsive Dual-Mode Mockup / App Preview Card */}
            <div className="lg:col-span-5 xl:col-span-5 flex justify-center relative w-full my-auto">
              {/* Responsive Container: 3D Smartphone on Desktop (lg), Clean App Card on Mobile (<lg) */}
              <div className="relative w-full max-w-[320px] sm:max-w-[340px] lg:w-[320px] xl:w-[335px] rounded-[24px] sm:rounded-[32px] lg:rounded-[44px] bg-slate-950 p-2 sm:p-2.5 lg:p-3 shadow-2xl border border-slate-800/80 lg:border-[5px] lg:border-slate-800 lg:ring-1 lg:ring-slate-700/50">
                {/* Phone Speaker Notch (Desktop Only - hidden on mobile/tablet) */}
                <div className="hidden lg:flex absolute top-5 left-1/2 -translate-x-1/2 w-24 h-3.5 bg-slate-950 rounded-full z-30 items-center justify-center">
                  <div className="w-10 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Inner Screen Container - fills full vertical space dynamically */}
                <div className="w-full rounded-[18px] sm:rounded-[24px] lg:rounded-[34px] bg-slate-950 text-white overflow-hidden flex flex-col h-[460px] sm:h-[480px] lg:h-[calc(100dvh-13rem)] lg:max-h-[580px] lg:min-h-[460px] border border-slate-800 relative shadow-inner">
                  
                  {/* Status Bar */}
                  <div className="pt-2 lg:pt-2.5 px-3.5 lg:px-5 pb-1 flex justify-between items-center text-[10px] text-slate-400 font-semibold select-none z-30 bg-slate-950/80 backdrop-blur-sm">
                    <span className="font-bold text-slate-300">9:41 AM</span>
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider lg:hidden">Evac_Route Live</span>
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
                              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.25" />
                            </linearGradient>

                            <filter id="routeGlowFull" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="3.5" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>

                            <pattern id="mapGridFull" width="30" height="30" patternUnits="userSpaceOnUse">
                              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="2 2" />
                            </pattern>
                          </defs>

                          {/* Dark Base Map Surface */}
                          <rect width="320" height="480" fill="#0b1120" />
                          <rect width="320" height="480" fill="url(#mapGridFull)" opacity="0.6" />

                          {/* River Basin (Tetuan River) */}
                          <path
                            d="M -20 220 C 70 240, 130 270, 180 300 C 230 330, 270 370, 340 400"
                            fill="none"
                            stroke="#1e3a8a"
                            strokeWidth="24"
                            strokeLinecap="round"
                            opacity="0.9"
                          />
                          <path
                            d="M -20 220 C 70 240, 130 270, 180 300 C 230 330, 270 370, 340 400"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2.5"
                            strokeDasharray="6 8"
                            opacity="0.6"
                          />

                          {/* Street Network (Zamboanga City Tetuan Sector) */}
                          <path d="M 30 10 L 30 470" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <path d="M 90 10 L 90 470" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <path d="M 160 10 L 160 470" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <path d="M 240 10 L 240 470" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <path d="M 10 90 L 310 90" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <path d="M 10 170 L 310 170" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <path d="M 10 250 L 310 250" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <path d="M 10 330 L 310 330" fill="none" stroke="#1e293b" strokeWidth="3" />

                          {/* Street Names */}
                          <text x="35" y="85" fill="#475569" fontSize="7" fontWeight="bold" letterSpacing="0.4">DON ALFARO ST</text>
                          <text x="100" y="165" fill="#475569" fontSize="7" fontWeight="bold" letterSpacing="0.4">GOV. ALVAREZ AVE</text>
                          <text x="175" y="80" fill="#38bdf8" fontSize="7.5" fontWeight="bold" letterSpacing="0.4">RIDGE HIGH BYPASS</text>

                          {/* Flood Hazard Polygon Area */}
                          <polygon
                            points="70,180 200,200 230,290 85,290"
                            fill="url(#floodGradFull)"
                            stroke="#ef4444"
                            strokeWidth="1.8"
                            strokeDasharray="5 3"
                          />
                          <g transform="translate(105, 230)">
                            <rect x="0" y="0" width="86" height="16" rx="8" fill="#450a0a" stroke="#ef4444" strokeWidth="0.9" />
                            <text x="43" y="11" fill="#fca5a5" fontSize="6.5" fontWeight="bold" textAnchor="middle">
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
                            opacity="0.35"
                          />
                          <path
                            d="M 60 290 L 60 90 L 190 90 L 250 60"
                            fill="none"
                            stroke={isNavigating ? "#38bdf8" : "#0284c7"}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={isNavigating ? "8 6" : "none"}
                            filter="url(#routeGlowFull)"
                          />

                          {/* Directional Chevrons */}
                          <g fill="#93c5fd" opacity="0.95">
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
                            <rect x="-15" y="16" width="30" height="13" rx="6.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
                            <text x="0" y="25" fill="#ffffff" fontSize="7" fontWeight="900" letterSpacing="0.8" textAnchor="middle">YOU</text>
                          </g>

                          {/* Destination Shelter Marker (Tetuan Ridge) */}
                          <g transform="translate(250, 60)">
                            <circle cx="0" cy="0" r="16" fill="#10b981" opacity="0.25" className="animate-pulse" />
                            <circle cx="0" cy="0" r="10" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                            <text x="0" y="3.5" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">🏠</text>
                            <rect x="-42" y="-22" width="84" height="15" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="0.9" />
                            <text x="0" y="-12" fill="#a7f3d0" fontSize="6" fontWeight="bold" textAnchor="middle">TETUAN RIDGE (+22m)</text>
                          </g>
                        </svg>
                      </div>

                      {/* Top Floating Mobile UI Overlay */}
                      <div className="relative z-20 pt-2 px-3">
                        {isNavigating ? (
                          /* Google Maps Style Turn-by-Turn Navigation Banner */
                          <div className="bg-slate-900/98 border-2 border-emerald-500 rounded-2xl p-2.5 shadow-2xl flex items-center justify-between animate-enter">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 border border-emerald-400 flex items-center justify-center text-white font-black text-base shadow-sm">
                                ↱
                              </div>
                              <div>
                                <div className="text-[8.5px] font-black text-emerald-400 tracking-wider uppercase">IN 120 METERS</div>
                                <div className="text-[10px] font-bold text-white leading-tight">Turn Right onto Ridge High Bypass</div>
                                <div className="text-[8px] text-slate-400">14 min · 1.2 km remaining</div>
                              </div>
                            </div>
                            <button
                              onClick={() => setIsNavigating(false)}
                              className="p-1.5 rounded-full bg-red-950/80 border border-red-500 text-red-400 hover:text-white cursor-pointer"
                              title="Exit Navigation"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          /* Unified Floating Pill Header Bar (112 Shelters, 3 Hazards, Disasters filter) */
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-full shadow-lg">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="text-[9px] font-bold text-white">112 Shelters</span>
                              <span className="w-px h-2.5 bg-slate-700" />
                              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                              <span className="text-[9px] font-bold text-red-400">3 Hazards</span>
                            </div>

                            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-full shadow-lg text-[9px] font-bold text-slate-200">
                              🌊 Flood Event
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Floating Map Controls (Right & Left) */}
                      <div className="relative z-10 px-3 flex justify-between items-end mb-2 pointer-events-none">
                        {/* Layers FAB (Left) */}
                        <div className="pointer-events-auto w-7 h-7 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center text-slate-200 shadow-md">
                          <Layers size={13} />
                        </div>

                        {/* Zoom & Recenter Controls (Right) */}
                        <div className="pointer-events-auto space-y-1.5">
                          <div className="w-7 h-7 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center text-slate-200 shadow-md">
                            <Compass size={13} className="text-blue-400" />
                          </div>
                          <div className="w-7 h-7 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-white shadow-md">
                            <Navigation size={13} />
                          </div>
                        </div>
                      </div>

                      {/* Docked Mobile Bottom Sheet Drawer */}
                      <div className="relative z-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/80 rounded-t-2xl p-3 shadow-2xl">
                        {/* Pull Handle Bar */}
                        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-2" />

                        {/* Nearest Safe Shelter Details */}
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <div className="text-[8px] font-bold text-blue-400 uppercase tracking-wider">NEAREST EVACUATION CENTER</div>
                            <div className="text-xs font-black text-white">Tetuan Elevated Ridge Center</div>
                          </div>
                          <span className="text-[8.5px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                            OPEN · 68%
                          </span>
                        </div>

                        {/* Distance & High-Ground Telemetry */}
                        <div className="flex items-center justify-between text-[9.5px] text-slate-300 py-1 border-t border-slate-800/80">
                          <span>Distance: 1.4 km</span>
                          <span>ETA: 18 min walk</span>
                          <span className="text-emerald-400 font-bold">+22m High Ground</span>
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
                              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1"
                            >
                              <X size={13} />
                              <span>Exit Navigation</span>
                            </button>
                            <div className="flex-1 py-2 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 animate-enter text-left">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                          <p className="text-xs font-black text-white">Report Emergency Hazard</p>
                          <p className="text-[9px] text-slate-400">Directly alerts CDRRMO Disaster Command</p>
                        </div>
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800">
                          CITIZEN DISPATCH
                        </span>
                      </div>

                      {/* Auto-detected GPS location */}
                      <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center gap-2">
                        <MapPin size={16} className="text-blue-400 flex-shrink-0" />
                        <div>
                          <p className="text-[8.5px] font-bold text-slate-400 uppercase">GPS LOCATION DETECTED</p>
                          <p className="text-[10px] font-bold text-white">Tetuan Highway (6.9214° N, 122.0790° E)</p>
                        </div>
                      </div>

                      {/* Hazard Type Selector Chips */}
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-300 mb-1.5">Select Hazard Type</p>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {['🌊 Flash Flood', '🔥 Building Fire', '🚧 Blocked Road', '⚔️ Security Risk'].map((hazard, i) => (
                            <div
                              key={hazard}
                              className={`p-2 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                                i === 0
                                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                                  : 'bg-slate-800/60 border-slate-700 text-slate-300'
                              }`}
                            >
                              {hazard}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Severity level */}
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-300 mb-1">Severity Level</p>
                        <div className="flex gap-1.5">
                          <span className="flex-1 py-1 text-center rounded bg-slate-800 border border-slate-700 text-[9px] font-bold text-slate-400">LOW</span>
                          <span className="flex-1 py-1 text-center rounded bg-amber-950 border border-amber-600 text-[9px] font-bold text-amber-400">MEDIUM</span>
                          <span className="flex-1 py-1 text-center rounded bg-slate-800 border border-slate-700 text-[9px] font-bold text-slate-400">HIGH</span>
                        </div>
                      </div>

                      {/* Description Preview */}
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-300 mb-1">Incident Details</p>
                        <div className="p-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-[10px] text-slate-300">
                          River surge is rising rapidly onto the main road. Vehicles can no longer pass through.
                        </div>
                      </div>

                      {/* Photo Attachment Bar */}
                      <div className="p-2 bg-slate-800/60 border border-dashed border-slate-700 rounded-xl flex items-center justify-center gap-1.5 text-[9.5px] text-slate-400">
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
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 animate-enter text-left">
                      {/* Resident Identity Header Card */}
                      <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-2xl flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white font-black text-base">
                            RS
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-emerald-600 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-white">
                            <Check size={10} />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-white">Maria Santos</p>
                            <span className="text-[8px] bg-blue-950 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-800">VERIFIED</span>
                          </div>
                          <p className="text-[9.5px] text-slate-400">ID: RES-000412 · Brgy. Tetuan</p>
                          <p className="text-[9.5px] text-emerald-400 font-semibold mt-0.5">Family Headcount: 4 Members</p>
                        </div>
                      </div>

                      {/* Offline Family QR Pass */}
                      <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-center space-y-2">
                        <div className="inline-block p-2 bg-white rounded-xl shadow-md">
                          <QrCode size={100} className="text-slate-900" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-white">OFFLINE FAMILY PASS</p>
                          <p className="text-[9px] text-slate-400">CSWDO Shelter Gate &amp; Food Relief Scanner</p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 text-[8.5px] font-bold">
                          <CheckCircle2 size={11} />
                          <span>NO INTERNET REQUIRED AT GATE</span>
                        </div>
                      </div>

                      {/* Relief Goods Eligibility */}
                      <div className="p-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-[9.5px] space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Relief Allocation:</span>
                          <span className="text-emerald-400 font-bold">Eligible (Food Packs + Water)</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Assigned Center:</span>
                          <span className="text-white font-semibold">Tetuan Elevated Ridge</span>
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
                  <div className="mt-auto bg-slate-950 border-t border-slate-800 px-2 pt-2 pb-2 z-30">
                    <div className="grid grid-cols-3 gap-1">
                      {/* Tab 1: Evacuation Map */}
                      <button
                        onClick={() => setActiveResidentScreen('map')}
                        className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
                          activeResidentScreen === 'map'
                            ? 'text-blue-400 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <MapPin size={17} className={activeResidentScreen === 'map' ? 'text-blue-400 scale-110 transition-transform' : 'transition-transform'} />
                        <span className="text-[9px] mt-0.5 font-semibold">Evacuation Map</span>
                      </button>

                      {/* Tab 2: Report Hazard */}
                      <button
                        onClick={() => setActiveResidentScreen('report')}
                        className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
                          activeResidentScreen === 'report'
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <AlertTriangle size={17} className={activeResidentScreen === 'report' ? 'text-amber-400 scale-110 transition-transform' : 'transition-transform'} />
                        <span className="text-[9px] mt-0.5 font-semibold">Report Hazard</span>
                        <span className="absolute top-0.5 right-3 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      </button>

                      {/* Tab 3: Profile */}
                      <button
                        onClick={() => setActiveResidentScreen('profile')}
                        className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
                          activeResidentScreen === 'profile'
                            ? 'text-blue-400 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <User size={17} className={activeResidentScreen === 'profile' ? 'text-blue-400 scale-110 transition-transform' : 'transition-transform'} />
                        <span className="text-[9px] mt-0.5 font-semibold">Profile</span>
                      </button>
                    </div>

                    {/* Smartphone Home Indicator Bar */}
                    <div className="w-20 h-1 bg-slate-700/80 rounded-full mx-auto mt-2" />
                  </div>

                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── Resident Protection Metrics Strip ── */}
      <section className="py-8 sm:py-10 lg:py-12 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            
            <div className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <p className="text-4xl sm:text-5xl font-black text-blue-600 dark:text-blue-400 tracking-tight">112</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-2">Official Safe Shelters</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">High-ground courts, schools &amp; ridges</p>
            </div>

            <div className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <p className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">0%</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-2">Walk into Danger</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avoids active flood &amp; fire zones</p>
            </div>

            <div className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <p className="text-4xl sm:text-5xl font-black text-red-600 dark:text-red-400 tracking-tight">&lt; 30s</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-2">SOS Alert Delivery</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Transmitted directly to rescue units</p>
            </div>

            <div className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <p className="text-4xl sm:text-5xl font-black text-amber-600 dark:text-amber-400 tracking-tight">98</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-2">Barangays Covered</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Complete Zamboanga City safety net</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 2: HOW EVAC_ROUTE PROTECTS YOUR HOUSEHOLD ── */}
      <section id="protection" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Zap size={14} /> Resident Protection
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            How Evac_Route Keeps Your Family Safe
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-base mt-4">
            Built specifically to solve real-world emergency hurdles faced by Zamboanga City residents during severe typhoons, storm surges, and fires.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
              <Navigation size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Smart Threat-Avoidance Routing</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Standard GPS maps can lead you directly into flooded streets or collapsed bridges. Evac_Route dynamically recalculates safe escape paths that steer your family around active hazard zones.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center mb-6">
              <Radio size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Instant Emergency SOS</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              If water is rising fast or family members are trapped, tap the Emergency SOS button. Your exact coordinates and household headcount are immediately dispatched to nearby rescue teams.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
              <QrCode size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Offline Family QR Passports</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              During blackouts or cell network failures, your digital family pass remains safely stored on your device. Shelter staff scan your QR code for rapid entry and relief goods without paperwork.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-6">
              <Building2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">112 Official Safe Shelters</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Find the nearest verified evacuation center in your barangay with live open/closed status, current occupancy levels, elevation meters, and available amenities.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Authoritative Neighborhood Alerts</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Receive verified emergency alerts directly from Zamboanga City DRRM without false social media rumors or delayed text advisories.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Household Profile Preparedness</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Pre-register family members, infant formula needs, elderly mobility requirements, and emergency contacts so responders and camp managers know your exact household needs.
            </p>
          </div>

        </div>
      </section>

      {/* ── SECTION 4: 112 OFFICIAL SAFE SHELTERS DIRECTORY ── */}
      <section id="shelters" className="py-20 bg-slate-100/70 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <MapPin size={14} /> Citywide Coverage
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Know Your Nearest High-Ground Haven Before Disaster Strikes
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                Zamboanga City has 112 official evacuation shelters calibrated into the Evac_Route mobile network. The app automatically identifies your closest safe haven based on your location and road conditions.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="text-emerald-500 font-bold text-lg mb-1 flex items-center gap-2">
                    <MapPin size={18} /> High-Ground Havens
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pasonanca Park, Tetuan Elevated Ridge, and safe high hills.</p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="text-blue-500 font-bold text-lg mb-1 flex items-center gap-2">
                    <Building2 size={18} /> Primary Centers
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Equipped with clean water, solar backup, and medical stations.</p>
                </div>
              </div>
            </div>

            {/* Quick Resident Shelter Reference Card */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Sample Verified High-Ground Shelters</h3>
                  <p className="text-xs text-slate-500">Available offline in the Evac_Route app</p>
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

      {/* ── SECTION 5: 3-STEP INSTALLATION GUIDE ── */}
      <section id="install-guide" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Download size={14} /> Direct Android Download
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            How to Install Evac_Route on Your Phone
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-base mt-3">
            Install the official application in 3 simple steps directly on your Android device.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center relative">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-blue-500/20">
              1
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">1. Download the APK</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tap the button below. Your browser will download the verified <span className="font-bold text-blue-600 dark:text-blue-400">Evac_Route.apk</span> (~90 MB) directly to your phone.
            </p>
          </div>

          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center relative">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-blue-500/20">
              2
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">2. Allow Unknown Sources</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              When prompted by Android, tap <span className="font-semibold text-slate-800 dark:text-slate-200">Settings</span> and toggle on <span className="font-semibold text-slate-800 dark:text-slate-200">"Install apps from this source"</span>.
            </p>
          </div>

          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center relative">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-blue-500/20">
              3
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">3. Open &amp; Register Household</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tap <span className="font-semibold text-slate-800 dark:text-slate-200">Install</span>. Launch the app and register your household profile to generate your offline family pass!
            </p>
          </div>

        </div>

        {/* Big Download Banner CTA */}
        <div className="mt-16 p-8 sm:p-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Protect Your Household Today
            </h3>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Download the official Evac_Route app now. Always free, zero telemetry tracking, and built to safeguard every family in Zamboanga City.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-blue-700 font-black text-base rounded-2xl shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition duration-200 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Download size={20} className="text-blue-700" />
                <span>{downloading ? "Downloading..." : "Download Evac_Route.apk (v1.0.1)"}</span>
              </button>
            </div>
            <p className="text-xs text-blue-200 pt-2 font-medium">
              Over {downloadCount.toLocaleString()} installations recorded · Verified Android Build
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer with City Hotlines & Discreet Staff Link ── */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-800">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-black text-lg">
                <ShieldAlert size={22} className="text-blue-500" />
                <span>EVAC_ROUTE</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart hazard-aware emergency evacuation planning and family protection platform for the citizens of Zamboanga City.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Quick Navigation</p>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => scrollToSection('overview')} className="hover:text-blue-400 transition cursor-pointer">Overview</button></li>
                <li><button onClick={() => scrollToSection('app-preview')} className="hover:text-blue-400 transition cursor-pointer">App Preview</button></li>
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
            <p>© 2026 EVAC_ROUTE • City Disaster Risk Reduction &amp; Management Office (CDRRMO), Zamboanga City.</p>
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

    </div>
  );
}
