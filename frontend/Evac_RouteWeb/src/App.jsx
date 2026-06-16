import { lazy, Suspense, useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Bell, ShieldAlert, CheckCircle, TrendingUp, AlertCircle, AlertTriangle, RefreshCw, LayoutDashboard, Map, Building2, Package, ClipboardCheck, FileText, Flag, Users, LogOut, Sun, Moon, Contact, Settings, X, User, MapPin, Volume2, Database, Megaphone } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleGuard from './components/common/RoleGuard';
import api from './services/api';
import echo from './services/echo';
import { playNotificationSound } from './services/sound';
import LogoutConfirmModal from './components/common/LogoutConfirmModal';

// Lazy loaded Pages
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const MapDashboard = lazy(() => import('./pages/MapDashboard'));
const InventoryManager = lazy(() => import('./pages/InventoryManager'));
const ShelterManagement = lazy(() => import('./pages/ShelterManagement'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const EvacuationLogs = lazy(() => import('./pages/EvacuationLogs'));
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'));
const IncidentReviewQueue = lazy(() => import('./pages/IncidentReviewQueue'));
const ReliefDistribution = lazy(() => import('./pages/ReliefDistribution'));
const ResidentRegistry = lazy(() => import('./pages/ResidentRegistry'));
const EmergencyAlerts = lazy(() => import('./pages/EmergencyAlerts'));


function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`block py-2 px-3 rounded text-sm whitespace-nowrap transition duration-200 ${isActive ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-gray-800 text-gray-300 hover:text-white'}`}
    >
      {children}
    </Link>
  );
}

function IconNavLink({ to, icon, label, badge = 0 }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      title={label}
      className={`flex justify-center items-center relative p-2 rounded-lg transition duration-200 ${
        isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-400 hover:text-white'
      }`}
    >
      {icon}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
          {badge}
        </span>
      )}
    </Link>
  );
}

function DashboardLayout({ children }) {
  const { logout, user, setUser } = useAuth();
  const location = useLocation();
  const isMapRoute = location.pathname === '/admin/map';
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingIncidentCount, setPendingIncidentCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [timeDriftWarning, setTimeDriftWarning] = useState(false);

  const checkTimeDrift = useCallback(async () => {
    try {
      const startTime = Date.now();
      const res = await api.get('/ping');
      const endTime = Date.now();
      const latency = (endTime - startTime) / 2;
      const serverTime = res.data.server_time;
      const adjustedServerTime = serverTime + latency;
      const localTime = Date.now();
      const driftSeconds = Math.abs(localTime - adjustedServerTime) / 1000;
      
      if (driftSeconds > 30) {
        setTimeDriftWarning(true);
      } else {
        setTimeDriftWarning(false);
      }
    } catch (err) {
      console.warn("Failed to check time drift:", err);
    }
  }, []);

  useEffect(() => {
    checkTimeDrift();
    const interval = setInterval(checkTimeDrift, 60000);
    return () => clearInterval(interval);
  }, [checkTimeDrift]);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const handleConfirmLogout = async () => {
    setIsLogoutOpen(false);
    await logout();
    toast.success("Logged out successfully");
  };

  // Fetch initial pending count on mount
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await api.get('/incidents?status=pending');
        setPendingIncidentCount(res.data.data.total || 0);
      } catch (err) {
        console.warn("Failed to fetch initial pending count:", err);
      }
    };
    fetchPendingCount();
  }, []);

  // Reset badge count when staff visits the incidents queue
  useEffect(() => {
    if (location.pathname === '/admin/incidents') {
      const timer = setTimeout(() => {
        setPendingIncidentCount(0);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Hook in WebSockets
  useEffect(() => {
    const channel = echo.channel('map-updates');

    channel.listen('.emergency.alert', (data) => {
      playNotificationSound();
      const newNotif = {
        id: `emergency-alert-${data.id}-${Date.now()}`,
        title: `EMERGENCY ALERT: ${data.title}`,
        message: data.message,
        time: new Date(),
        type: 'emergency_alert',
        link: '/admin/alerts'
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-slate-900 border-2 border-red-500 text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 backdrop-blur-md`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <span className="text-xl">📢</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-red-500 uppercase tracking-wide">EMERGENCY BROADCAST DISPATCHED</p>
                <p className="mt-1 text-xs font-bold text-slate-100">{data.title}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Scope: {data.scope === 'all' ? 'All Residents' : `Barangay ${data.barangay}`}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-700/50">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/alerts';
              }}
              className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-xs font-black text-red-500 hover:text-red-400 focus:outline-none"
            >
              VIEW
            </button>
          </div>
        </div>
      ), { duration: 10000 });
    });

    channel.listen('.incident.submitted', (data) => {
      playNotificationSound();
      const newNotif = {
        id: `incident-submit-${data.id}-${Date.now()}`,
        title: 'New Incident Submitted',
        message: `${data.name} (${data.hazard_type}) - Severity: ${data.severity_level}`,
        time: new Date(),
        type: 'incident_submitted',
        link: '/admin/incidents'
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      if (location.pathname !== '/admin/incidents') {
        setPendingIncidentCount(prev => prev + 1);
      }

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-slate-900 text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-slate-700/50 backdrop-blur-md`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <span className="text-xl">📢</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-extrabold text-blue-400">NEW FIELD INCIDENT REPORT</p>
                <p className="mt-1 text-xs text-slate-200">{data.name}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">{data.hazard_type} | Severity: {data.severity_level}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-700/50">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/incidents';
              }}
              className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-xs font-black text-blue-500 hover:text-blue-400 focus:outline-none"
            >
              REVIEW
            </button>
          </div>
        </div>
      ), { duration: 7000 });
    });

    channel.listen('.hazard.created', (data) => {
      playNotificationSound();
      const newNotif = {
        id: `hazard-create-${data.id}-${Date.now()}`,
        title: 'New Hazard Zone Flagged',
        message: `${data.name} is active (${data.hazard_type})`,
        time: new Date(),
        type: 'hazard_created',
        link: '/admin/map'
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-red-950 text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-red-800/50 backdrop-blur-md`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <span className="text-xl">⚠️</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-extrabold text-red-400">HAZARD ZONE ENFORCED</p>
                <p className="mt-1 text-xs text-red-100">{data.name}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-red-800/50">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/map';
              }}
              className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-xs font-black text-red-400 hover:text-red-300 focus:outline-none"
            >
              VIEW MAP
            </button>
          </div>
        </div>
      ), { duration: 7000 });
    });

    channel.listen('.hazard.resolved', (data) => {
      playNotificationSound();
      const newNotif = {
        id: `hazard-resolve-${data.hazard_id}-${Date.now()}`,
        title: 'Hazard Zone Resolved',
        message: `Hazard ID #${data.hazard_id} has been resolved and cleared.`,
        time: new Date(),
        type: 'hazard_resolved',
        link: '/admin/map'
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-green-950 text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-green-800/50 backdrop-blur-md`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <span className="text-xl">✅</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-extrabold text-green-400">HAZARD AREA CLEARED</p>
                <p className="mt-1 text-xs text-green-100">Hazard ID #${data.hazard_id} is resolved.</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 5000 });
    });

    channel.listen('.shelter.updated', (data) => {
      const occupancyRate = Math.round((data.current_occupancy / data.max_capacity) * 100);
      let isCrit = false;
      let title = 'Shelter Occupancy Update';

      if (data.status === 'full' || occupancyRate >= 100) {
        title = 'Shelter Capacity Reached';
        isCrit = true;
      } else if (occupancyRate >= 80) {
        title = 'Shelter Nearing Capacity';
        isCrit = true;
      }

      if (isCrit) {
        playNotificationSound();
      }

      const newNotif = {
        id: `shelter-update-${data.id}-${Date.now()}`,
        title,
        message: `${data.name} is at ${occupancyRate}% (${data.current_occupancy}/${data.max_capacity})`,
        time: new Date(),
        type: 'shelter_updated',
        link: '/admin/shelters'
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      if (isCrit) {
        toast.error(`${data.name} capacity warning: ${occupancyRate}% full!`, { duration: 6000 });
      }
    });

    channel.listen('.road-maintenance.created', (data) => {
      playNotificationSound();
      const newNotif = {
        id: `rm-create-${data.id}-${Date.now()}`,
        title: 'Road Blocked for Maintenance',
        message: `${data.description} is active`,
        time: new Date(),
        type: 'road_maintenance',
        link: '/admin/map'
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-amber-950 text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-amber-800/50 backdrop-blur-md`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <span className="text-xl">🚧</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-extrabold text-amber-400 font-mono">ROAD BLOCK ENFORCED</p>
                <p className="mt-1 text-xs text-amber-100">{data.description}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-amber-800/50">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/map';
              }}
              className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-xs font-black text-amber-400 hover:text-amber-300 focus:outline-none"
            >
              VIEW MAP
            </button>
          </div>
        </div>
      ), { duration: 7000 });
    });

    channel.listen('.road-maintenance.resolved', (data) => {
      playNotificationSound();
      const newNotif = {
        id: `rm-resolve-${data.id}-${Date.now()}`,
        title: 'Road Block Resolved',
        message: `Road maintenance blockage has been resolved.`,
        time: new Date(),
        type: 'road_maintenance_resolved',
        link: '/admin/map'
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      echo.leaveChannel('map-updates');
    };
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className={`${isMapRoute ? 'w-16' : 'w-64'} bg-gray-900 text-white flex flex-col z-20 shadow-xl transition-all duration-300`}>
        <div className={`border-b border-gray-800 flex items-center justify-center ${isMapRoute ? 'p-3' : 'p-4'}`}>
          {isMapRoute ? (
            <span className="text-blue-400 font-black text-lg" title="Evac_Route">E</span>
          ) : (
            <div>
              <h1 className="text-xl font-black tracking-wider text-blue-400">Evac_Route</h1>
              <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">LGU Command Center</p>
            </div>
          )}
        </div>
        <nav className={`flex-1 ${isMapRoute ? 'p-2' : 'p-4'} space-y-1 overflow-y-auto`}>
          {!isMapRoute && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 mt-2 px-3">Command Center</p>}
          {isMapRoute ? (
            <IconNavLink to="/admin/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard Overview" />
          ) : (
            <NavLink to="/admin/dashboard">Dashboard Overview</NavLink>
          )}
          {isMapRoute ? (
            <IconNavLink to="/admin/map" icon={<Map size={20} />} label="Live Map View" />
          ) : (
            <NavLink to="/admin/map">Live Map View</NavLink>
          )}
          {isMapRoute ? (
            <IconNavLink to="/admin/incidents" icon={<Flag size={20} />} label="Incident Reports" badge={pendingIncidentCount} />
          ) : (
            <NavLink to="/admin/incidents">
               <div className="flex justify-between items-center w-full">
                  <span>Incident Reports</span>
                  {pendingIncidentCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                      {pendingIncidentCount}
                    </span>
                  )}
               </div>
            </NavLink>
          )}

          {!isMapRoute && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-3">Operations &amp; Logistics</p>}
          {isMapRoute ? (
            <IconNavLink to="/admin/shelters" icon={<Building2 size={20} />} label="Shelter Capacity" />
          ) : (
            <NavLink to="/admin/shelters">Shelter Capacity</NavLink>
          )}
          {isMapRoute ? (
            <IconNavLink to="/admin/inventory" icon={<Package size={20} />} label="Warehouse Stock" />
          ) : (
            <NavLink to="/admin/inventory">Warehouse Stock</NavLink>
          )}
          {isMapRoute ? (
            <IconNavLink to="/admin/relief-desk" icon={<ClipboardCheck size={20} />} label="Relief Claims Desk" />
          ) : (
            <NavLink to="/admin/relief-desk">Relief Claims Desk</NavLink>
          )}

          {!isMapRoute && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-3">Administration</p>}
          {isMapRoute ? (
            <IconNavLink to="/admin/reports" icon={<FileText size={20} />} label="Evacuation Logs" />
          ) : (
            <NavLink to="/admin/reports">Evacuation Logs</NavLink>
          )}
          {isMapRoute ? (
            <IconNavLink to="/admin/residents" icon={<Contact size={20} />} label="Resident Registry" />
          ) : (
            <NavLink to="/admin/residents">Resident Registry</NavLink>
          )}
          {isMapRoute ? (
            <IconNavLink to="/admin/alerts" icon={<Megaphone size={20} />} label="Emergency Warnings" />
          ) : (
            <NavLink to="/admin/alerts">Emergency Warnings</NavLink>
          )}
          <RoleGuard allowedRoles={['admin']}>
            {isMapRoute ? (
              <IconNavLink to="/admin/staff" icon={<Users size={20} />} label="Staff Operators" />
            ) : (
              <NavLink to="/admin/staff">Staff Operators</NavLink>
            )}
          </RoleGuard>

        </nav>
        <div className={`border-t border-gray-800 bg-gray-950/20 ${isMapRoute ? 'p-2' : 'p-4'}`}>
          {isMapRoute ? (
            <div className="flex flex-col gap-2 w-full items-center">
              {user?.role === 'admin' && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="Admin Settings"
                  className="w-full flex justify-center items-center p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
                >
                  <Settings size={18} />
                </button>
              )}
              <button
                onClick={() => setIsLogoutOpen(true)}
                title="Logout"
                className="w-full flex justify-center items-center p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setIsLogoutOpen(true)}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-lg transition font-bold text-sm tracking-wide"
              >
                Logout
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="Admin Settings"
                  className="px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition flex items-center justify-center"
                >
                  <Settings size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {timeDriftWarning && (
          <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between shadow-md z-40 animate-pulse text-xs font-bold border-b border-amber-600">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>
                Clock Drift Warning: Your computer's clock is out of sync with the server by &gt;30s. 
                Please synchronize your system time to prevent QR verification errors.
              </span>
            </div>
            <button 
              onClick={() => checkTimeDrift()} 
              className="bg-amber-700 hover:bg-amber-800 text-white px-2 py-0.5 rounded text-[10px] transition font-extrabold flex items-center gap-1"
            >
              <RefreshCw size={10} /> Check Again
            </button>
          </div>
        )}
        {/* Top Header - hidden on map route for max screen real estate */}
        {!isMapRoute && (
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-14 flex items-center justify-between px-6 shadow-sm z-30 relative transition-colors duration-200">
           <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">System Online - Reverb Core Active</span>
           </div>

           <div className="flex items-center gap-4">
             {/* Dark Mode Toggle */}
             <button
               onClick={toggleDarkMode}
               className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-200 focus:outline-none"
               title="Toggle Dark Mode"
             >
               {darkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>

             {/* Alerts & Notifications Bell */}
             <div className="relative">
               <button
                 onClick={() => {
                   setIsDropdownOpen(!isDropdownOpen);
                   setUnreadCount(0);
                 }}
                 className="relative p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition focus:outline-none"
               >
                 <Bell size={20} />
                 {unreadCount > 0 && (
                   <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                     {unreadCount}
                   </span>
                 )}
               </button>

             {/* Dropdown menu */}
             {isDropdownOpen && (
               <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-enter max-h-96 overflow-y-auto">
                 <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <span className="font-extrabold text-xs text-gray-500 uppercase tracking-widest">Operation Feed</span>
                   <button
                     onClick={() => setNotifications([])}
                     className="text-[10px] text-gray-400 hover:text-red-500 font-bold transition"
                   >
                     Clear Feed
                   </button>
                 </div>
                 
                 <div className="divide-y divide-gray-100">
                   {notifications.length === 0 ? (
                     <div className="p-6 text-center text-gray-400 text-xs font-semibold">
                       No operational alerts received.
                     </div>
                   ) : (
                     notifications.map((n) => (
                       <Link
                         key={n.id}
                         to={n.link}
                         onClick={() => setIsDropdownOpen(false)}
                         className="block p-3 hover:bg-blue-50/30 transition flex items-start gap-3"
                       >
                         <div className={`p-1.5 rounded-lg text-white mt-0.5 flex-shrink-0 ${
                           n.type === 'incident_submitted' ? 'bg-blue-500' :
                           n.type === 'hazard_created' ? 'bg-red-500' :
                           n.type === 'hazard_resolved' ? 'bg-green-500' :
                           'bg-amber-500'
                         }`}>
                           {n.type === 'incident_submitted' ? <AlertCircle size={14} /> :
                            n.type === 'hazard_created' ? <ShieldAlert size={14} /> :
                            n.type === 'hazard_resolved' ? <CheckCircle size={14} /> :
                            <TrendingUp size={14} />}
                         </div>
                         <div className="min-w-0">
                           <p className="font-bold text-xs text-gray-800">{n.title}</p>
                           <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                           <p className="text-[9px] text-gray-400 mt-1 font-medium">{new Date(n.time).toLocaleTimeString()}</p>
                         </div>
                       </Link>
                     ))
                   )}
                 </div>
               </div>
             )}
           </div>
           </div>
         </header>
         )}

        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>
      <LogoutConfirmModal 
        isOpen={isLogoutOpen} 
        onClose={() => setIsLogoutOpen(false)} 
        onConfirm={handleConfirmLogout} 
      />
      {user?.role === 'admin' && (
        <AdminSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          user={user}
          setUser={setUser}
        />
      )}
    </div>
  );
}

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center">
      <span className="flex h-12 w-12 relative mb-4">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-12 w-12 bg-blue-600"></span>
      </span>
      <p className="text-sm font-semibold text-gray-500 tracking-wider">Loading Console...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        containerStyle={{ zIndex: 2147483647 }}
        toastOptions={{
          style: {
            background: 'var(--bg-secondary, #ffffff)',
            color: 'var(--text-primary, #111827)',
            border: '1px solid var(--border-color, #e5e7eb)',
            maxWidth: '650px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: 'var(--bg-secondary, #ffffff)',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: 'var(--bg-secondary, #ffffff)',
            },
            duration: 5000,
          },
        }}
      />
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Base URL now points directly to Admin Login */}
            <Route path="/" element={<AdminLogin />} />
            <Route path="/admin/login" element={<Navigate to="/" replace />} />

            {/* Protected LGU Admin/Staff Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'lgu_staff']} />}>
              <Route path="/admin/dashboard" element={<DashboardLayout><DashboardOverview /></DashboardLayout>} />
              <Route path="/admin/map" element={<DashboardLayout><MapDashboard /></DashboardLayout>} />
              <Route path="/admin/shelters" element={<DashboardLayout><ShelterManagement /></DashboardLayout>} />
              <Route path="/admin/inventory" element={<DashboardLayout><InventoryManager /></DashboardLayout>} />
              <Route path="/admin/reports" element={<DashboardLayout><EvacuationLogs /></DashboardLayout>} />
              <Route path="/admin/residents" element={<DashboardLayout><ResidentRegistry /></DashboardLayout>} />
              <Route path="/admin/incidents" element={<DashboardLayout><IncidentReviewQueue /></DashboardLayout>} />
              <Route path="/admin/relief-desk" element={<DashboardLayout><ReliefDistribution /></DashboardLayout>} />
              <Route path="/admin/alerts" element={<DashboardLayout><EmergencyAlerts /></DashboardLayout>} />
            </Route>

            {/* Admin-Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/staff" element={<DashboardLayout><StaffManagement /></DashboardLayout>} />
            </Route>

          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

function AdminSettingsModal({ isOpen, onClose, user, setUser }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [housekeepingLoading, setHousekeepingLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Configuration States
  const [mapCenterLat, setMapCenterLat] = useState(6.9126);
  const [mapCenterLng, setMapCenterLng] = useState(122.0729);
  const [mapZoom, setMapZoom] = useState(13);
  const [capacityWarning, setCapacityWarning] = useState(80);
  const [lowStock, setLowStock] = useState(100);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [sirenVolume, setSirenVolume] = useState(70);
  const [retentionDays, setRetentionDays] = useState(90);

  // Sync profile values when user changes or modal opens
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
    setPassword('');
    setConfirmPassword('');
  }, [user, isOpen]);

  // Fetch configs on open
  useEffect(() => {
    if (isOpen) {
      api.get('/settings')
        .then(res => {
          const cfg = res.data.data;
          setMapCenterLat(cfg.map_center_lat);
          setMapCenterLng(cfg.map_center_lng);
          setMapZoom(cfg.map_zoom);
          setCapacityWarning(cfg.capacity_warning_threshold);
          setLowStock(cfg.low_stock_threshold);
          setAudioAlerts(cfg.audio_alerts_enabled);
          setSirenVolume(cfg.siren_volume);
          setRetentionDays(cfg.audit_log_retention_days);
        })
        .catch(err => {
          console.error("Failed to load system configurations", err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler for Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and Email are required");
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        email,
        role: user.role,
        status: user.status,
      };
      if (password) {
        payload.password = password;
      }

      const res = await api.put(`/staff/${user.id}`, payload);
      setUser(res.data.data);
      toast.success("Profile updated successfully!");
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Handler for Operations & Thresholds, Map Defaults, Sound Preferences
  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        map_center_lat: parseFloat(mapCenterLat),
        map_center_lng: parseFloat(mapCenterLng),
        map_zoom: parseInt(mapZoom),
        capacity_warning_threshold: parseInt(capacityWarning),
        low_stock_threshold: parseInt(lowStock),
        audio_alerts_enabled: audioAlerts ? 1 : 0,
        siren_volume: parseInt(sirenVolume),
        audit_log_retention_days: parseInt(retentionDays),
      };
      await api.post('/settings', payload);
      toast.success("System configurations saved successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save system configurations");
    } finally {
      setLoading(false);
    }
  };

  // Handler for SQL DB Backup download
  const handleBackupDownload = async () => {
    setBackupLoading(true);
    try {
      const response = await api.post('/settings/backup', {}, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `evac_route_backup_${new Date().toISOString().slice(0, 10)}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Database backup download started.");
    } catch (err) {
      toast.error("Failed to generate database backup");
    } finally {
      setBackupLoading(false);
    }
  };

  // Handler for Housekeeping logs clearing
  const handleClearLogs = async () => {
    if (!window.confirm(`Are you sure you want to permanently clear audit log entries older than ${retentionDays} days?`)) {
      return;
    }
    setHousekeepingLoading(true);
    try {
      const res = await api.post('/settings/housekeeping');
      toast.success(res.data.message || "Housekeeping completed successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete housekeeping");
    } finally {
      setHousekeepingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl h-[520px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            ⚙️ LGU System Control Center
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition">
            <X size={22} />
          </button>
        </div>

        {/* Layout Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Menu */}
          <aside className="w-1/3 bg-gray-50/50 dark:bg-slate-950/20 border-r border-gray-100 dark:border-slate-800 p-4 space-y-1.5 overflow-y-auto shrink-0">
            <span className="block text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Settings Groups</span>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'profile'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <User size={15} /> Account Profile
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('thresholds')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'thresholds'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldAlert size={15} /> Operations &amp; Thresholds
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'map'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin size={15} /> Map &amp; Landing Center
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'audio'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <Volume2 size={15} /> Audio Alerts &amp; Sirens
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('maintenance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'maintenance'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <Database size={15} /> Database &amp; Maintenance
            </button>
          </aside>

          {/* Right Content Area */}
          <main className="flex-1 p-5 overflow-y-auto">
            
            {/* Tab 1: Account Profile */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2">Admin Profile Credentials</h4>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Administrator Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Admin Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@lgu.gov.ph"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                    New Password <span className="text-[10px] text-gray-400 font-normal">(leave blank to keep current)</span>
                  </label>
                  <input 
                    type="password" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-255 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                {password && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-255 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Update Account Info'}
                </button>
              </form>
            )}

            {/* Tab 2: Operations & Thresholds */}
            {activeTab === 'thresholds' && (
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2">Stock Alert Warnings</h4>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Low-Stock Alert Trigger Limit (Items)</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={lowStock}
                    onChange={e => setLowStock(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">Generates command board warnings when relief warehouse stock levels fall below this count.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Critical Shelter Capacity Threshold (%)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-255 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={capacityWarning}
                    onChange={e => setCapacityWarning(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">Triggers system alert toast when occupancy rate matches or exceeds this percentage.</span>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Thresholds'}
                </button>
              </form>
            )}

            {/* Tab 3: Map Defaults */}
            {activeTab === 'map' && (
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2">Live Map Landing View</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Center Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      value={mapCenterLat}
                      onChange={e => setMapCenterLat(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Center Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      value={mapCenterLng}
                      onChange={e => setMapCenterLng(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Map Zoom Level (1 - 22)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="22"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-255 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={mapZoom}
                    onChange={e => setMapZoom(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">Configures default landing coordinates and zoom level when loading the Command Map.</span>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Map Defaults'}
                </button>
              </form>
            )}

            {/* Tab 4: Sound Preferences */}
            {activeTab === 'audio' && (
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2">Audio Notifications</h4>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg">
                  <div>
                    <span className="block text-xs font-bold text-gray-750 dark:text-slate-300">Enable Alert Sounders</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">Play audio sirens and alert tones at operator desk.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 text-blue-650 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    checked={audioAlerts}
                    onChange={e => setAudioAlerts(e.target.checked)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Siren Sounder Volume ({sirenVolume}%)</label>
                  <input 
                    type="range" 
                    min="0"
                    max="100"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    value={sirenVolume}
                    onChange={e => setSirenVolume(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Audio Settings'}
                </button>
              </form>
            )}

            {/* Tab 5: Database & Maintenance */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                
                <div>
                  <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2 mb-3">Database Housekeeping</h4>
                  <div className="flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400">Audit Logs Retention Period (Days)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        min="1"
                        className="w-32 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        value={retentionDays}
                        onChange={e => setRetentionDays(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={handleClearLogs}
                        disabled={housekeepingLoading}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                      >
                        {housekeepingLoading ? 'Clearing...' : 'Prune Older Logs'}
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1.5">Removes older audit logs to conserve database storage space.</span>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-800 pt-5">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 mb-3">System Disaster Recovery</h4>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs text-blue-800 dark:text-blue-300 leading-relaxed mb-3">
                    Backup generates an instant <strong>SQL dump</strong> script containing all database schemas, table structures, and resident check-ins and log records. Save it securely.
                  </div>
                  <button
                    type="button"
                    onClick={handleBackupDownload}
                    disabled={backupLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {backupLoading ? 'Generating Dump...' : <><Database size={14} /> Download SQL Backup Dump</>}
                  </button>
                </div>

              </div>
            )}

          </main>

        </div>

      </div>
    </div>
  );
}

export default App;
