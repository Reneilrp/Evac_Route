import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeResidentScreen, setActiveResidentScreen] = useState('route'); // 'route' | 'sos' | 'qr'
  const [downloadCount, setDownloadCount] = useState(1420);
  const [downloading, setDownloading] = useState(false);

  // Monitor scroll for blurred header transition
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-full border border-slate-200 dark:border-slate-700/60 backdrop-blur">
            <button
              onClick={() => scrollToSection('overview')}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer"
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection('app-preview')}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer"
            >
              App Preview
            </button>
            <button
              onClick={() => scrollToSection('protection')}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer"
            >
              How It Protects You
            </button>
            <button
              onClick={() => scrollToSection('shelters')}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer"
            >
              Safe Shelters
            </button>
            <button
              onClick={() => scrollToSection('install-guide')}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer"
            >
              Installation Guide
            </button>
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
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-3 pb-6 space-y-2 animate-enter">
            <button
              onClick={() => scrollToSection('overview')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              1. Overview
            </button>
            <button
              onClick={() => scrollToSection('app-preview')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              2. App Preview &amp; Download
            </button>
            <button
              onClick={() => scrollToSection('protection')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              3. How It Protects You
            </button>
            <button
              onClick={() => scrollToSection('shelters')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              4. Safe Shelters Network
            </button>
            <button
              onClick={() => scrollToSection('install-guide')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              5. Installation Guide
            </button>
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md"
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Copy: Resident Focus */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              
              {/* Resident Safety Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold tracking-wide shadow-sm">
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
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Never get trapped by rising floodwaters or blocked roads. Evac_Route automatically calculates safe escape paths away from active disasters to the nearest high-ground shelter, provides 1-tap SOS rescue alerts, and keeps your family pass ready offline.
              </p>

              {/* Resident Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
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
                  <span>See How It Works</span>
                  <ArrowDown size={14} className="text-slate-400" />
                </button>
              </div>

              {/* Citizen Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800/80">
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

            {/* Right: Resident Household Disaster Shield Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 relative overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                      Citizen Lifeline HUD
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    CITYWIDE READY
                  </span>
                </div>

                {/* Live Safe Path Highlight */}
                <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-black text-blue-700 dark:text-blue-300">
                    <span className="flex items-center gap-1.5">
                      <Navigation size={15} /> Dynamic High-Ground Routing
                    </span>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/80 px-2 py-0.5 rounded-full font-bold">SAFE PATH</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Automatically recalculates your route around flooded riverbanks and active debris directly to elevated safe havens.
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span>Target: Tetuan High-Ground Ridge</span>
                    <span className="text-emerald-600 dark:text-emerald-400">+22m Above Sea Level</span>
                  </div>
                </div>

                {/* 2 Resident Safety Pillars */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold mb-1">
                      <Radio size={14} className="animate-pulse" /> 1-Tap SOS Beacon
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Directly alerts rescue boats &amp; QRT squads with your exact pin.</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                      <QrCode size={14} /> Offline Family Pass
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Expedited intake at shelter gates without cellular internet.</p>
                  </div>
                </div>

                {/* Download CTA Prompt */}
                <button
                  onClick={handleDownload}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Download size={15} />
                  <span>Install Evac_Route on Your Phone Now</span>
                </button>

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
                    
                    {/* RESIDENT SCREEN 1: SAFE EVACUATION ROUTE */}
                    {activeResidentScreen === 'route' && (
                      <div className="space-y-2.5 animate-enter">
                        {/* Hazard Warning Pill */}
                        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl">
                          <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                            <Flame size={14} className="animate-pulse" />
                            <span>LEVEL 2 FLASH FLOOD WARNING</span>
                          </div>
                          <p className="text-[10px] text-red-200/80 mt-1">Lower Tetuan &amp; Guiwan riverbank active surge. Roads submerged.</p>
                        </div>

                        {/* Optimal Safe Shelter Path */}
                        <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-blue-400 tracking-wider">Computed Safe Haven</span>
                              <p className="text-xs font-black text-white mt-0.5">Tetuan Elevated Ridge</p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                              OPEN · 68%
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1 border-t border-slate-700/60">
                            <span>Route: 1.4 km</span>
                            <span>ETA: 18 min walk</span>
                            <span className="text-emerald-400 font-bold">+22m High Ground</span>
                          </div>
                        </div>

                        {/* Navigation Step Card */}
                        <div className="p-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl flex items-center gap-3">
                          <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400 border border-blue-500/40">
                            <Compass size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] font-bold text-white">Avoid Lower Highway 5</p>
                            <p className="text-[9px] text-emerald-400">Head North toward high ground bypass</p>
                          </div>
                        </div>

                        {/* Quick Trigger Button */}
                        <button
                          onClick={handleDownload}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 uppercase tracking-wider transition cursor-pointer"
                        >
                          <Navigation size={14} />
                          <span>Start GPS Navigation</span>
                        </button>
                      </div>
                    )}

                    {/* RESIDENT SCREEN 2: EMERGENCY SOS BUTTON */}
                    {activeResidentScreen === 'sos' && (
                      <div className="space-y-3 animate-enter text-center">
                        <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-xl">
                          <p className="text-xs font-black text-red-400 uppercase tracking-wide">Emergency Rescue Distress</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">Trapped or cut off by rising water? Tap below to send your GPS coordinates to rescue squads.</p>
                        </div>

                        {/* Giant SOS Button */}
                        <div className="py-2 flex justify-center">
                          <button
                            onClick={handleDownload}
                            className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-4 border-red-400/40 shadow-xl shadow-red-600/50 flex flex-col items-center justify-center active:scale-95 transition-transform cursor-pointer"
                          >
                            <Radio size={28} className="text-white animate-pulse" />
                            <span className="text-base font-black text-white tracking-widest mt-1">SOS</span>
                          </button>
                        </div>

                        {/* Household Headcount details */}
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

                        <p className="text-[9px] text-slate-400">
                          Encrypted beacon alerts responders within 30 seconds.
                        </p>
                      </div>
                    )}

                    {/* RESIDENT SCREEN 3: OFFLINE FAMILY QR PASS */}
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

                        <button
                          onClick={handleDownload}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 uppercase tracking-wider transition cursor-pointer"
                        >
                          <Download size={14} />
                          <span>Save Pass to Phone</span>
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
