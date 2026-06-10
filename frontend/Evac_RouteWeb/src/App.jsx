import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Bell, ShieldAlert, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleGuard from './components/common/RoleGuard';
import api from './services/api';
import echo from './services/echo';
import { playNotificationSound } from './services/sound';

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

function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`block py-2.5 px-4 rounded transition duration-200 ${isActive ? 'bg-blue-600 text-white font-medium' : 'hover:bg-gray-800 text-gray-300 hover:text-white'}`}
    >
      {children}
    </Link>
  );
}

function DashboardLayout({ children }) {
  const { logout } = useAuth();
  const location = useLocation();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingIncidentCount, setPendingIncidentCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
      setPendingIncidentCount(0);
    }
  }, [location.pathname]);

  // Hook in WebSockets
  useEffect(() => {
    const channel = echo.channel('map-updates');

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

    return () => {
      echo.leaveChannel('map-updates');
    };
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col z-20 shadow-xl">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-black tracking-wider text-blue-400">Evac_Route</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">LGU Command Center</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-2 px-4">Command</p>
          <NavLink to="/admin/dashboard">Dashboard Overview</NavLink>
          <NavLink to="/admin/map">Live Map View</NavLink>
          
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-4">Management</p>
          <NavLink to="/admin/shelters">Shelters & Capacities</NavLink>
          <NavLink to="/admin/inventory">Inventory & Relief</NavLink>
          <NavLink to="/admin/relief-desk">Relief Claims Desk</NavLink>
          
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-4">Administration</p>
          <NavLink to="/admin/reports">Evacuation Logs</NavLink>
          <NavLink to="/admin/incidents">
             <div className="flex justify-between items-center w-full">
                <span>Incident Reports</span>
                {pendingIncidentCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                    {pendingIncidentCount}
                  </span>
                )}
             </div>
          </NavLink>
          <RoleGuard allowedRoles={['admin']}>
            <NavLink to="/admin/staff">Staff Operators</NavLink>
          </RoleGuard>
        </nav>
        <div className="p-4 border-t border-gray-800 bg-gray-950/20">
           <button
             onClick={logout}
             className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-lg transition font-bold text-sm tracking-wide"
           >
             Logout
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 shadow-sm z-30 relative">
           <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">System Online - Reverb Core Active</span>
           </div>

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
        </header>

        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>
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
      <Toaster position="top-right" reverseOrder={false} />
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
              <Route path="/admin/incidents" element={<DashboardLayout><IncidentReviewQueue /></DashboardLayout>} />
              <Route path="/admin/relief-desk" element={<DashboardLayout><ReliefDistribution /></DashboardLayout>} />
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

export default App;
