import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  User,
  Navigation,
  Compass,
  Layers,
  Camera,
  CheckCircle2,
  Download,
  QrCode,
  Check,
  X,
} from "lucide-react";

export default function LandingHeroPhone({
  overviewSlide,
  setOverviewSlide,
  darkMode,
  activeResidentScreen,
  setActiveResidentScreen,
  isNavigating,
  setIsNavigating,
  reportSubmitted,
  setReportSubmitted,
  passSaved,
  setPassSaved,
}) {
  return (
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
  );
}
