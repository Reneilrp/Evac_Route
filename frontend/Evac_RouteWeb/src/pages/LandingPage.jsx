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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [activeResidentScreen, setActiveResidentScreen] = useState('route'); // 'route' | 'sos' | 'qr'
  const [downloadCount, setDownloadCount] = useState(1420);
  const [downloading, setDownloading] = useState(false);

  // Interactive phone preview states
  const [isNavigating, setIsNavigating] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [passSaved, setPassSaved] = useState(false);

  const navRefs = useRef({});
  const isClickScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'app-preview', label: 'App Preview' },
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

      const sectionIds = ['overview', 'app-preview', 'protection', 'shelters', 'install-guide'];
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

      {/* ── SECTION 1: CITIZEN PLATFORM OVERVIEW (HERO FOLD) ── */}
      <section id="overview" className="relative pt-32 pb-20 md:pt-40 md:pb-24 overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-blue-500/10 dark:bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-emerald-500/10 dark:bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="space-y-6 max-w-3xl mx-auto">
            
            {/* Resident Safety Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold tracking-wide shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <span>Official Citizen Safety App · Zamboanga City DRRM</span>
            </div>

            {/* Major Resident Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
              Smart Evacuation Routes &amp; Emergency Protection for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Every Household.</span>
            </h1>

            {/* Resident Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Never get trapped by rising floodwaters or blocked roads. Evac_Route automatically calculates safe escape paths away from active disasters to the nearest high-ground shelter, provides 1-tap SOS rescue alerts, and keeps your family pass ready offline.
            </p>

            {/* Resident Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Direct APK Download Button */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group"
              >
                <Download size={22} className="group-hover:translate-y-0.5 transition-transform" />
                <span>{downloading ? "Preparing Download..." : "Download Evac_Route APK"}</span>
                <span className="text-xs font-semibold py-0.5 px-2 bg-white/20 rounded-md">90+ MB</span>
              </button>

              {/* Explore Resident App Preview */}
              <button
                onClick={() => scrollToSection('app-preview')}
                className="w-full sm:w-auto px-6 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone size={18} className="text-blue-600 dark:text-blue-400" />
                <span>See App Preview Below</span>
                <ArrowDown size={14} className="text-slate-400" />
              </button>
            </div>

            {/* Citizen Trust Badges */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>SHA-256 Verified Clean APK</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Heart size={16} className="text-red-500" />
                <span>100% Free · No Ads · No Tracking</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <QrCode size={16} className="text-blue-500" />
                <span>Works Offline in Blackouts</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Resident Protection Metrics Strip ── */}
      <section className="py-14 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 transition-colors">
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

      {/* ── SECTION 2: DEDICATED RESIDENT MOBILE SHOWCASE & DIRECT APK DOWNLOAD ── */}
      <section id="app-preview" className="py-24 bg-slate-100/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 relative overflow-hidden">
        
        {/* Glow ambient background effects for mobile section */}
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/15 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Smartphone size={14} /> Resident Mobile Interface · Android v1.0.1
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Designed for Immediate Action in Crises
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base mt-4 leading-relaxed">
              When disaster strikes, every second matters. Tap the bottom navigation tabs in the phone preview below to explore how Evac_Route guides your household step-by-step.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Resident Capabilities & Direct APK Download */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Download Evac_Route to Your Android Device
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                  Install the free APK file directly on your smartphone. All 112 city shelters, emergency contacts, offline digital family passes, and GPS flood avoidance maps are bundled for immediate use without needing internet access later.
                </p>
              </div>

              {/* Direct 1-Click Download Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <Download size={22} className="group-hover:translate-y-0.5 transition-transform" />
                  <span>{downloading ? "Starting Download..." : "Download Evac_Route.apk"}</span>
                  <span className="text-xs font-semibold py-0.5 px-2 bg-white/20 rounded-md">90+ MB</span>
                </button>

                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  <span>SHA-256 Verified Clean</span>
                </div>
              </div>

              {/* Citizen Trust Badges */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Android 8.0+</p>
                  <p className="text-[10px] text-slate-500">Universal support</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Offline Pass</p>
                  <p className="text-[10px] text-slate-500">Works without data</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">v1.0.1 Stable</p>
                  <p className="text-[10px] text-slate-500">Official release</p>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 font-medium">
                Over <strong className="text-slate-900 dark:text-white">{downloadCount.toLocaleString()}</strong> households protected across Zamboanga City.
              </div>

            </div>

            {/* Right: The Interactive 3D Smartphone Mockup (100% Resident UI) */}
            <div className="lg:col-span-6 flex justify-center relative">
              
              {/* Floating Badge: Top Right */}
              <div className="hidden sm:flex absolute -top-4 -right-2 z-20 items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">112 Verified Shelters</p>
                  <p className="text-[10px] text-slate-500 font-medium">Calibrated high-ground zones</p>
                </div>
              </div>

              {/* Floating Badge: Bottom Left */}
              <div className="hidden sm:flex absolute -bottom-4 -left-4 z-20 items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">Offline Digital Pass</p>
                  <p className="text-[10px] text-slate-500 font-medium">Instant gate check-in</p>
                </div>
              </div>

              {/* Smartphone Frame */}
              <div className="relative w-[300px] sm:w-[325px] rounded-[48px] bg-slate-950 p-3.5 shadow-2xl border-[6px] border-slate-800 ring-1 ring-slate-700/50">
                {/* Phone Speaker Notch */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-center">
                  <div className="w-12 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Inner Screen Container */}
                <div className="w-full rounded-[38px] bg-slate-900 text-white overflow-hidden flex flex-col min-h-[580px] border border-slate-800 relative">
                  
                  {/* Status Bar */}
                  <div className="pt-3 px-6 pb-2 flex justify-between items-center text-[10px] text-slate-400 font-semibold select-none">
                    <span>9:41 AM</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px]">5G</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Phone App Header */}
                  <div className="px-4 py-2 mb-1 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white">
                        <ShieldAlert size={12} />
                      </div>
                      <span className="text-[11px] font-black text-white tracking-wide">EVAC_ROUTE</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/70 text-[9px] font-bold text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Tetuan Live</span>
                    </div>
                  </div>

                  {/* Dynamic Resident Screen Content */}
                  <div className="px-3.5 flex-1 space-y-3 pb-3 overflow-y-auto">
                    
                    {/* RESIDENT SCREEN 1: SAFE EVACUATION ROUTE & INTERACTIVE MAP */}
                    {activeResidentScreen === 'route' && (
                      <div className="space-y-2.5 animate-enter">
                        
                        {/* Interactive Emergency GPS Map */}
                        <div className="relative w-full h-[200px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-inner group">
                          <svg viewBox="0 0 320 200" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              {/* Flood hazard warning gradient */}
                              <linearGradient id="floodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.25" />
                              </linearGradient>

                              {/* Safe route glow */}
                              <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                              </filter>

                              {/* Subtle map terrain grid */}
                              <pattern id="mapGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" />
                              </pattern>
                            </defs>

                            {/* Base Navigation Map Background */}
                            <rect width="320" height="200" fill="#080d1a" />
                            <rect width="320" height="200" fill="url(#mapGrid)" opacity="0.6" />

                            {/* River Basin (Tetuan River Flood Source) */}
                            <path
                              d="M -10 130 C 50 140, 100 155, 150 170 C 210 185, 260 195, 330 205"
                              fill="none"
                              stroke="#1e3a8a"
                              strokeWidth="15"
                              strokeLinecap="round"
                              opacity="0.85"
                            />
                            <path
                              d="M -10 130 C 50 140, 100 155, 150 170 C 210 185, 260 195, 330 205"
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2"
                              strokeDasharray="6 8"
                              opacity="0.6"
                            />

                            {/* City Street Grid Network */}
                            <path d="M 20 15 L 20 190" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                            <path d="M 75 10 L 75 190" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                            <path d="M 140 10 L 140 190" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                            <path d="M 220 10 L 220 190" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                            <path d="M 10 60 L 310 60" fill="none" stroke="#1e293b" strokeWidth="2.5" />
                            <path d="M 10 120 L 310 120" fill="none" stroke="#1e293b" strokeWidth="2.5" />

                            {/* Street Names */}
                            <text x="30" y="55" fill="#475569" fontSize="6" fontWeight="600" letterSpacing="0.4">DON ALFARO ST</text>
                            <text x="85" y="115" fill="#475569" fontSize="6" fontWeight="600" letterSpacing="0.4">GOV. ALVAREZ AVE</text>
                            <text x="165" y="50" fill="#3b82f6" fontSize="6.5" fontWeight="bold" letterSpacing="0.4">RIDGE HIGH BYPASS</text>

                            {/* Flood Hazard Polygon (Lower Tetuan River Surge) */}
                            <polygon
                              points="55,115 180,125 210,185 80,185"
                              fill="url(#floodGrad)"
                              stroke="#ef4444"
                              strokeWidth="1.5"
                              strokeDasharray="4 2"
                            />
                            {/* Flood Warning Pill on Map */}
                            <g transform="translate(95, 142)">
                              <rect x="0" y="0" width="80" height="14" rx="7" fill="#450a0a" stroke="#ef4444" strokeWidth="0.8" />
                              <text x="40" y="9.5" fill="#fca5a5" fontSize="5.5" fontWeight="bold" textAnchor="middle">
                                ⚠️ FLOOD SURGE ZONE
                              </text>
                            </g>

                            {/* Blocked Submerged Road */}
                            <path
                              d="M 55 160 L 145 160"
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="3.5"
                              strokeDasharray="4 4"
                              opacity="0.8"
                            />
                            <g transform="translate(90, 154)">
                              <circle cx="6" cy="6" r="6" fill="#ef4444" />
                              <text x="6" y="9" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">⛔</text>
                            </g>

                            {/* SAFE EVACUATION ROUTE (Avoids Flood, Climbs to High Ground) */}
                            <path
                              d="M 45 165 L 45 60 L 165 60 L 255 40"
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth="7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.35"
                            />
                            <path
                              d="M 45 165 L 45 60 L 165 60 L 255 40"
                              fill="none"
                              stroke={isNavigating ? "#38bdf8" : "#2563eb"}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeDasharray={isNavigating ? "8 5" : "none"}
                              filter="url(#routeGlow)"
                            />

                            {/* Directional Waypoint Markers */}
                            <g fill="#93c5fd" opacity="0.9">
                              <path d="M 45 125 L 48 130 L 42 130 Z" />
                              <path d="M 45 90 L 48 95 L 42 95 Z" />
                              <path d="M 105 60 L 100 57 L 100 63 Z" />
                              <path d="M 195 55 L 191 52 L 191 58 Z" />
                            </g>

                            {/* User GPS Location (Tetuan) */}
                            <g transform="translate(45, 165)">
                              <circle cx="0" cy="0" r="13" fill="#38bdf8" opacity="0.3" className="animate-ping" />
                              <circle cx="0" cy="0" r="6" fill="#0284c7" stroke="#ffffff" strokeWidth="1.8" />
                              <circle cx="0" cy="0" r="2" fill="#ffffff" />
                              <rect x="-20" y="8" width="40" height="12" rx="3.5" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
                              <text x="0" y="16.5" fill="#e2e8f0" fontSize="5.5" fontWeight="bold" textAnchor="middle">YOU (HERE)</text>
                            </g>

                            {/* Destination Safe Shelter (Tetuan Ridge) */}
                            <g transform="translate(255, 40)">
                              <circle cx="0" cy="0" r="14" fill="#10b981" opacity="0.25" className="animate-pulse" />
                              <circle cx="0" cy="0" r="8" fill="#059669" stroke="#ffffff" strokeWidth="1.8" />
                              <text x="0" y="2.5" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">🏠</text>
                              <rect x="-38" y="-19" width="76" height="14" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="0.8" />
                              <text x="0" y="-9.5" fill="#a7f3d0" fontSize="5.5" fontWeight="bold" textAnchor="middle">TETUAN RIDGE (+22m)</text>
                            </g>

                            {/* High Ground Contour Badge */}
                            <g transform="translate(165, 38)">
                              <rect x="0" y="0" width="50" height="11" rx="5.5" fill="#1e293b" stroke="#3b82f6" strokeWidth="0.7" />
                              <text x="25" y="7.5" fill="#60a5fa" fontSize="5" fontWeight="bold" textAnchor="middle">⛰️ ELEVATED</text>
                            </g>
                          </svg>

                          {/* Floating Map HUD Top Overlay */}
                          <div className="absolute top-2 left-2 right-2 pointer-events-none">
                            {isNavigating ? (
                              <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/70 p-2 rounded-xl shadow-lg flex items-center justify-between animate-enter">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white">
                                    <ArrowUpRight size={13} />
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-black text-white leading-tight">In 120m · Turn Right</div>
                                    <div className="text-[7.5px] text-blue-300 font-medium leading-tight">Follow Ridge High Bypass</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-black text-emerald-400">14 min</span>
                                  <span className="block text-[7.5px] text-slate-400">1.2 km left</span>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2 py-1 rounded-xl flex items-center justify-between shadow-md">
                                <div className="flex items-center gap-1 text-red-400 text-[8.5px] font-bold">
                                  <Flame size={11} className="animate-pulse" />
                                  <span>Flash Flood: Riverbed Submerged</span>
                                </div>
                                <span className="text-[7.5px] font-black text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                                  BYPASS ACTIVE
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Map Compass Widget */}
                          <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-1.5 py-0.5 rounded border border-slate-700 text-[7.5px] text-slate-300 font-bold flex items-center gap-1">
                            <Compass size={9} className="text-blue-400" />
                            <span>N 34° W</span>
                          </div>

                          {/* Live Status Badge */}
                          <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur px-1.5 py-0.5 rounded border border-slate-700 text-[7.5px] text-emerald-400 font-bold">
                            {isNavigating ? "GPS Active · 4.5 km/h" : "Safe Haven Ready"}
                          </div>
                        </div>

                        {/* Optimal Safe Shelter Path Summary */}
                        <div className="p-2.5 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[8.5px] uppercase font-bold text-blue-400 tracking-wider">Computed Safe Haven</span>
                              <p className="text-xs font-black text-white mt-0.5">Tetuan Elevated Ridge</p>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                              OPEN · 68%
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[9.5px] text-slate-300 pt-1 border-t border-slate-700/60">
                            <span>Route: 1.4 km</span>
                            <span>ETA: 18 min walk</span>
                            <span className="text-emerald-400 font-bold">+22m High Ground</span>
                          </div>
                        </div>

                        {/* Interactive GPS Navigation Toggle Buttons (No APK download!) */}
                        {!isNavigating ? (
                          <button
                            onClick={() => setIsNavigating(true)}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 uppercase tracking-wider transition cursor-pointer"
                          >
                            <Navigation size={14} />
                            <span>Start GPS Navigation</span>
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setIsNavigating(false)}
                              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <X size={13} />
                              <span>Exit Navigation</span>
                            </button>
                            <div className="flex-1 py-2 bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                              <span>Navigating Live</span>
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                    {/* RESIDENT SCREEN 2: EMERGENCY SOS BUTTON (Interactive Simulation) */}
                    {activeResidentScreen === 'sos' && (
                      <div className="space-y-3 animate-enter text-center">
                        <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-xl">
                          <p className="text-xs font-black text-red-400 uppercase tracking-wide">Emergency Rescue Distress</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">Trapped or cut off by rising water? Tap the SOS button below to simulate sending your GPS beacon.</p>
                        </div>

                        {/* Interactive Giant SOS Button (Toggles state, no download!) */}
                        <div className="py-2 flex justify-center">
                          <button
                            onClick={() => setSosTriggered(prev => !prev)}
                            className={`w-28 h-28 rounded-full border-4 shadow-xl flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer ${
                              sosTriggered
                                ? 'bg-gradient-to-br from-red-600 to-red-800 border-red-300 shadow-red-500/70 scale-105'
                                : 'bg-gradient-to-br from-red-500 to-red-700 border-red-400/40 shadow-red-600/50'
                            }`}
                          >
                            <Radio size={28} className={`text-white ${sosTriggered ? 'animate-ping' : 'animate-pulse'}`} />
                            <span className="text-base font-black text-white tracking-widest mt-1">
                              {sosTriggered ? "ACTIVE" : "SOS"}
                            </span>
                          </button>
                        </div>

                        {/* SOS Alert Status Banner */}
                        {sosTriggered ? (
                          <div className="p-3 bg-red-950/90 border border-red-500 rounded-xl space-y-1.5 text-left animate-enter">
                            <div className="flex items-center justify-between text-[10px] font-bold text-red-400">
                              <span className="flex items-center gap-1">
                                <Radio size={12} className="animate-ping" />
                                <span>DISTRESS BEACON TRANSMITTED</span>
                              </span>
                              <span className="bg-red-800 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">BROADCASTING</span>
                            </div>
                            <p className="text-[9.5px] text-slate-200">
                              GPS pin: <strong className="text-red-300">6.9214° N, 122.0790° E</strong> transmitted to CDRRMO Command &amp; QRT Rescue Squad 4.
                            </p>
                            <button
                              onClick={() => setSosTriggered(false)}
                              className="w-full mt-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9.5px] font-bold rounded-lg border border-slate-700 transition cursor-pointer"
                            >
                              End Distress Signal
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-left space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400">Registered Family:</span>
                              <span className="text-white font-bold">4 Members (1 Infant, 1 Elderly)</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400">Target Dispatch:</span>
                              <span className="text-emerald-400 font-bold">CDRRMO QRT Squad &amp; BFP</span>
                            </div>
                          </div>
                        )}

                        <p className="text-[9px] text-slate-400">
                          Encrypted beacon alerts responders within 30 seconds.
                        </p>
                      </div>
                    )}

                    {/* RESIDENT SCREEN 3: OFFLINE FAMILY QR PASS (Interactive Simulation) */}
                    {activeResidentScreen === 'qr' && (
                      <div className="space-y-2.5 animate-enter">
                        <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-center space-y-2">
                          <div className="inline-block p-2.5 bg-white rounded-2xl shadow-md">
                            <QrCode size={110} className="text-slate-900" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Santos Household Pass</p>
                            <p className="text-[10px] text-slate-400">Head: Maria Santos · 4 Family Members</p>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 text-[9px] font-bold">
                            <CheckCircle2 size={12} />
                            <span>OFFLINE READY · SCANNABLE AT GATE</span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-[10px] space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>Barangay:</span>
                            <span className="text-white font-semibold">Tetuan (Zone 2)</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Relief Goods Status:</span>
                            <span className="text-emerald-400 font-semibold">Eligible (Food + Hygiene Kits)</span>
                          </div>
                        </div>

                        {/* Interactive Save Pass Button (No APK download!) */}
                        <button
                          onClick={() => {
                            setPassSaved(true);
                            setTimeout(() => setPassSaved(false), 2500);
                          }}
                          className={`w-full py-2.5 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer ${
                            passSaved
                              ? 'bg-emerald-700 text-white shadow-emerald-700/40'
                              : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-600/30'
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

                  </div>

                  {/* Interactive Resident Bottom Navigation Bar */}
                  <div className="mt-auto bg-slate-950/95 border-t border-slate-800/90 px-2 pt-2 pb-2.5 backdrop-blur z-20">
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => setActiveResidentScreen('route')}
                        className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                          activeResidentScreen === 'route'
                            ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        <Navigation size={17} className={activeResidentScreen === 'route' ? 'text-blue-400 scale-110 transition-transform' : 'transition-transform'} />
                        <span className="text-[9px] mt-1 font-semibold">Safe Route</span>
                      </button>

                      <button
                        onClick={() => setActiveResidentScreen('sos')}
                        className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                          activeResidentScreen === 'sos'
                            ? 'bg-red-600/20 text-red-400 font-bold border border-red-500/30'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        <Radio size={17} className={activeResidentScreen === 'sos' ? 'text-red-400 scale-110 animate-pulse transition-transform' : 'transition-transform'} />
                        <span className="text-[9px] mt-1 font-semibold">SOS Alert</span>
                        <span className="absolute top-1 right-2.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      </button>

                      <button
                        onClick={() => setActiveResidentScreen('qr')}
                        className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                          activeResidentScreen === 'qr'
                            ? 'bg-emerald-600/20 text-emerald-400 font-bold border border-emerald-500/30'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        <QrCode size={17} className={activeResidentScreen === 'qr' ? 'text-emerald-400 scale-110 transition-transform' : 'transition-transform'} />
                        <span className="text-[9px] mt-1 font-semibold">Family Pass</span>
                      </button>
                    </div>

                    {/* Smartphone Home Indicator Bar */}
                    <div className="w-20 h-1 bg-slate-700/80 rounded-full mx-auto mt-2.5" />
                  </div>

                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 3: HOW EVAC_ROUTE PROTECTS YOUR HOUSEHOLD ── */}
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
