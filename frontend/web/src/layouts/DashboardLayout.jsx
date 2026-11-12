import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell, ShieldAlert, CheckCircle, TrendingUp, AlertCircle, AlertTriangle,
  RefreshCw, LayoutDashboard, Map, Building2, Package, FileText, Flag,
  Users, LogOut, Sun, Moon, Contact, Settings, X, Megaphone, LifeBuoy,
  Activity, Truck, FileSpreadsheet, Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import echo from '../services/echo';
import { playNotificationSound } from '../services/sound';
import LogoutConfirmModal from '../components/common/LogoutConfirmModal';
import AdminSettingsModal from '../components/admin/AdminSettingsModal';

function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`block py-2 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition duration-200 ${
        isActive 
          ? 'bg-blue-600 text-white font-semibold shadow-xs' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
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
        isActive 
          ? 'bg-blue-600 text-white shadow-xs' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black rounded-full h-4 w-4 flex items-center justify-center animate-pulse shadow-xs">
          {badge}
        </span>
      )}
    </Link>
  );
}

function DashboardLayout({ children }) {
  const { logout, user, setUser } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMapRoute = location.pathname === '/admin/map';
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingIncidentCount, setPendingIncidentCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [timeDriftWarning, setTimeDriftWarning] = useState(false);

  // Master Emergency Mode Switch State
  const [isEmergencyActive, setIsEmergencyActive] = useState(true);

  // Agency operational segregation: System Admin, CDRRMO (DRRM Tactical Command), or CSWDO (Camp & Relief Hub)
  const isSystemAdmin = (user?.email?.toLowerCase() === 'admin@lgu.gov.ph') || (user?.role === 'admin' && user?.operator_type === 'admin' && !user?.email?.toLowerCase().includes('drrm'));
  const isCswdoUser = !isSystemAdmin && (user?.operator_type === 'logistics' || user?.operator_type === 'scanner' || (user?.email?.toLowerCase().includes('logistics') || user?.email?.toLowerCase().includes('cswdo')));
  const activeAgency = isSystemAdmin ? 'admin' : (isCswdoUser ? 'cswdo' : 'cdrmo');

  useEffect(() => {
    api.get('/settings').then(res => {
      const active = res.data.data?.master_emergency_active;
      setIsEmergencyActive(active === true || active === 'true' || active === 1 || active === '1');
    }).catch(err => console.warn("Failed to load emergency setting:", err));
  }, []);

  const toggleMasterEmergency = async () => {
    const nextState = !isEmergencyActive;
    setIsEmergencyActive(nextState);
    try {
      await api.post('/settings', { master_emergency_active: nextState });
      if (nextState) {
        toast.error('🚨 MASTER EMERGENCY MODE ACTIVATED! Real-time threat routing & disaster layers revealed.', { duration: 6000 });
      } else {
        toast.success('🟢 Standby Peacetime Mode Restored. Routine monitoring active.', { duration: 5000 });
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const { darkMode, toggleDarkMode } = useTheme();

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
  }, [location.pathname, queryClient]);

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
          <div className="flex border-l border-slate-700/50 items-center divide-x divide-slate-700/50">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/alerts';
              }}
              className="px-3.5 py-3 text-xs font-black text-red-500 hover:text-red-400 focus:outline-none cursor-pointer"
            >
              VIEW
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-3 text-xs font-black text-slate-400 hover:text-white focus:outline-none cursor-pointer"
              title="Close Notification"
            >
              ✕
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
          <div className="flex border-l border-slate-700/50 items-center divide-x divide-slate-700/50">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/incidents';
              }}
              className="px-3.5 py-3 text-xs font-black text-blue-500 hover:text-blue-400 focus:outline-none cursor-pointer"
            >
              REVIEW
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-3 text-xs font-black text-slate-400 hover:text-white focus:outline-none cursor-pointer"
              title="Close Notification"
            >
              ✕
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
          <div className="flex border-l border-red-800/50 items-center divide-x divide-red-800/50">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/map';
              }}
              className="px-3.5 py-3 text-xs font-black text-red-400 hover:text-red-300 focus:outline-none cursor-pointer"
            >
              VIEW MAP
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-3 text-xs font-black text-red-400/70 hover:text-white focus:outline-none cursor-pointer"
              title="Close Notification"
            >
              ✕
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
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-green-950 text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-green-800/50 backdrop-blur-md items-center justify-between`}>
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
          <div className="border-l border-green-800/50 flex items-center px-3 py-4">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-xs font-black text-green-400/70 hover:text-white focus:outline-none cursor-pointer"
              title="Close Notification"
            >
              ✕
            </button>
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



    channel.listen('.dispatch.order.delivered', (data) => {
      playNotificationSound();
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      const newNotif = {
        id: `dispatch-delivered-${data.id}-${Date.now()}`,
        title: 'Relief Order Delivered',
        message: `Dispatch #${data.id} delivered to ${data.shelter_name}. Physical stock deducted.`,
        time: new Date(),
        type: 'dispatch_delivered',
        link: '/admin/inventory'
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      echo.leaveChannel('map-updates');
    };
  }, [location.pathname, queryClient]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100/80 dark:bg-slate-950">
      {/* Sidebar - Adaptive light/dark palette */}
      <aside className={`${isMapRoute ? 'w-16' : 'w-64'} bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col z-20 shadow-md border-r border-slate-200 dark:border-slate-800 transition-all duration-300`}>
        <div className={`border-b border-slate-200 dark:border-slate-800 flex items-center justify-center ${isMapRoute ? 'p-3' : 'p-4'}`}>
          {isMapRoute ? (
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-blue-600 dark:text-blue-400 font-black text-lg" title="Evac_Route">E</span>
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-wider text-blue-600 dark:text-blue-400">Evac_Route</h1>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide border ${
                    activeAgency === 'admin'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                      : activeAgency === 'cswdo'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  }`}>
                    {activeAgency === 'admin' ? 'ADMIN' : (activeAgency === 'cswdo' ? 'CSWDO' : 'CDRRMO')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-widest">
                {activeAgency === 'admin' ? 'System & City Control' : (activeAgency === 'cswdo' ? 'Relief & Camp Desk' : 'Disaster Operations')}
              </p>
            </div>
          )}
        </div>
        <nav className={`flex-1 ${isMapRoute ? 'p-2' : 'p-3'} space-y-1 overflow-y-auto`}>
          {activeAgency === 'admin' ? (
            /* === SYSTEM ADMIN CONSOLE (USER MANAGEMENT, RESIDENTS, AUDIT LOGS, SYSTEM HEALTH) === */
            <>
              {!isMapRoute && <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 mt-2 px-3">User &amp; Access Control</p>}
              {isMapRoute ? (
                <IconNavLink to="/admin/staff" icon={<Users size={20} />} label="User Management" />
              ) : (
                <NavLink to="/admin/staff">User Management</NavLink>
              )}
              {isMapRoute ? (
                <IconNavLink to="/admin/residents" icon={<Contact size={20} />} label="Resident Registry" />
              ) : (
                <NavLink to="/admin/residents">Resident Registry</NavLink>
              )}

              {!isMapRoute && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-5 px-3">System &amp; Security</p>}
              {isMapRoute ? (
                <IconNavLink to="/admin/audit-logs" icon={<ShieldAlert size={20} />} label="Security &amp; Audit Logs" />
              ) : (
                <NavLink to="/admin/audit-logs">Security &amp; Audit Logs</NavLink>
              )}
              {isMapRoute ? (
                <IconNavLink to="/admin/system-health" icon={<Activity size={20} />} label="System &amp; API Health" />
              ) : (
                <NavLink to="/admin/system-health">System &amp; API Health</NavLink>
              )}
            </>
          ) : activeAgency === 'cswdo' ? (
            /* === CSWDO CAMP & RELIEF HUB === */
            <>
              {!isMapRoute && <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 mt-2 px-3">Relief &amp; Camp Operations</p>}
              {isMapRoute ? (
                <IconNavLink to="/admin/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard Overview" />
              ) : (
                <NavLink to="/admin/dashboard">Dashboard Overview</NavLink>
              )}
              {isMapRoute ? (
                <IconNavLink to="/admin/inventory" icon={<Package size={20} />} label="Relief Stock Monitoring" />
              ) : (
                <NavLink to="/admin/inventory">Relief Stock Monitoring</NavLink>
              )}
              {isMapRoute ? (
                <IconNavLink to="/admin/shelters" icon={<Building2 size={20} />} label="Shelter Capacity" />
              ) : (
                <NavLink to="/admin/shelters">Shelter Capacity</NavLink>
              )}

              {!isMapRoute && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-5 px-3">Camp Monitoring &amp; Records</p>}
              {isMapRoute ? (
                <IconNavLink to="/admin/reports" icon={<FileText size={20} />} label="Evacuation & Relief Logs" />
              ) : (
                <NavLink to="/admin/reports">Evacuation &amp; Relief Logs</NavLink>
              )}
              {isMapRoute ? (
                <IconNavLink to="/admin/map" icon={<Map size={20} />} label="Safe Route Map" />
              ) : (
                <NavLink to="/admin/map">Safe Route Map</NavLink>
              )}
              {isMapRoute ? (
                <IconNavLink to="/admin/residents" icon={<Contact size={20} />} label="Resident Registry" />
              ) : (
                <NavLink to="/admin/residents">Resident Registry</NavLink>
              )}
              {isMapRoute ? (
                <IconNavLink to="/admin/staff" icon={<Users size={20} />} label="Staff Operators" />
              ) : (
                <NavLink to="/admin/staff">Staff Operators</NavLink>
              )}
              <RoleGuard allowedRoles={['admin']}>
                {isMapRoute ? (
                  <IconNavLink to="/admin/audit-logs" icon={<ShieldAlert size={20} />} label="Security & Audit Logs" />
                ) : (
                  <NavLink to="/admin/audit-logs">Security &amp; Audit Logs</NavLink>
                )}
              </RoleGuard>
            </>
          ) : (
            /* === CDRRMO TACTICAL OPERATIONS (SHELTER CAPACITY & INVENTORY REMOVED) === */
            <>
              {!isMapRoute && <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 mt-2 px-3">CDRRMO Tactical Operations</p>}
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
              {isMapRoute ? (
                <IconNavLink to="/admin/rescue-dispatch" icon={<LifeBuoy size={20} />} label="Rescue Dispatch" />
              ) : (
                <NavLink to="/admin/rescue-dispatch">
                   <div className="flex justify-between items-center w-full">
                      <span>Rescue Dispatch</span>
                      <span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                        SOS
                      </span>
                   </div>
                </NavLink>
              )}
              {isMapRoute ? (
                <IconNavLink to="/admin/rescue-vehicles" icon={<Truck size={20} />} label="Rescue Fleet" />
              ) : (
                <NavLink to="/admin/rescue-vehicles">
                   <div className="flex justify-between items-center w-full">
                      <span>Rescue Fleet</span>
                      <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                        Fleet
                      </span>
                   </div>
                </NavLink>
              )}
              {isMapRoute ? (
                <IconNavLink to="/admin/alerts" icon={<Megaphone size={20} />} label="Emergency Warnings" />
              ) : (
                <NavLink to="/admin/alerts">Emergency Warnings</NavLink>
              )}

              {!isMapRoute && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-5 px-3">Administration &amp; Records</p>}
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
                <IconNavLink to="/admin/staff" icon={<Users size={20} />} label="Staff Operators" />
              ) : (
                <NavLink to="/admin/staff">Staff Operators</NavLink>
              )}
              <RoleGuard allowedRoles={['admin']}>
                {isMapRoute ? (
                  <IconNavLink to="/admin/audit-logs" icon={<ShieldAlert size={20} />} label="Security & Audit Logs" />
                ) : (
                  <NavLink to="/admin/audit-logs">Security &amp; Audit Logs</NavLink>
                )}
              </RoleGuard>
            </>
          )}

        </nav>
        <div className={`border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 ${isMapRoute ? 'p-2' : 'p-3'}`}>
          {isMapRoute ? (
            <div className="flex flex-col gap-2 w-full items-center">
              <button
                onClick={toggleDarkMode}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="w-full flex justify-center items-center p-2 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="Admin Settings"
                  className="w-full flex justify-center items-center p-2 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                >
                  <Settings size={18} />
                </button>
              )}
              <button
                onClick={() => setIsLogoutOpen(true)}
                title="Logout"
                className="w-full flex justify-center items-center p-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/40 transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setIsLogoutOpen(true)}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 py-2 rounded-lg border border-red-200 dark:border-red-900/40 transition font-bold text-xs tracking-wide cursor-pointer"
              >
                Logout
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="Admin Settings"
                  className="px-3 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center justify-center cursor-pointer"
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
           <div className="flex items-center gap-3">
              {isEmergencyActive ? (
                <div className="flex items-center gap-2 bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm animate-pulse">
                  <ShieldAlert size={14} />
                  <span>🔴 EMERGENCY CRISIS MODE ACTIVATED</span>
                  {user?.role === 'admin' && (
                    <button 
                      onClick={toggleMasterEmergency}
                      className="ml-2 bg-white text-red-700 hover:bg-red-50 text-[10px] px-2 py-0.5 rounded font-black transition uppercase cursor-pointer"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>🟢 STANDBY PEACETIME MODE</span>
                  {user?.role === 'admin' && (
                    <button 
                      onClick={toggleMasterEmergency}
                      className="ml-2 bg-red-600 hover:bg-red-700 text-white text-[10px] px-2.5 py-0.5 rounded font-black transition uppercase shadow-sm cursor-pointer"
                    >
                      🚨 ACTIVATE DISASTER MODE
                    </button>
                  )}
                </div>
              )}
           </div>

           <div className="flex items-center gap-3">
             {/* Contextual Export Button for Dashboard Overview */}
             {location.pathname === '/admin/dashboard' && (
               <button
                 onClick={() => window.dispatchEvent(new CustomEvent('export-sitrep'))}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                 title="Export Situation Report (CSV)"
               >
                 <FileSpreadsheet size={14} />
                 <span>Export SitRep (CSV)</span>
               </button>
             )}

             {/* Contextual Export Button for Evacuation Logs */}
             {location.pathname === '/admin/reports' && (
               <button
                 onClick={() => window.dispatchEvent(new CustomEvent('export-evac-logs'))}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                 title="Export Evacuation Logs (CSV)"
               >
                 <Download size={14} />
                 <span>Export to CSV</span>
               </button>
             )}

             {/* Dark Mode Toggle */}
             <button
               onClick={toggleDarkMode}
               className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-200 focus:outline-none cursor-pointer"
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
                 className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none cursor-pointer"
               >
                 <Bell size={20} />
                 {unreadCount > 0 && (
                   <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center animate-pulse shadow-xs">
                     {unreadCount}
                   </span>
                 )}
               </button>

             {/* Dropdown menu */}
             {isDropdownOpen && (
               <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-enter max-h-96 overflow-y-auto">
                 <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/60">
                   <span className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest">Operation Feed</span>
                   <button
                     onClick={() => setNotifications([])}
                     className="text-[10px] text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 font-bold transition cursor-pointer"
                   >
                     Clear Feed
                   </button>
                 </div>
                 
                 <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                   {notifications.length === 0 ? (
                     <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                       No operational alerts received.
                     </div>
                   ) : (
                     notifications.map((n) => (
                       <Link
                         key={n.id}
                         to={n.link}
                         onClick={() => setIsDropdownOpen(false)}
                         className="block p-3 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition flex items-start gap-3"
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
                           <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{n.title}</p>
                           <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{n.message}</p>
                           <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{new Date(n.time).toLocaleTimeString()}</p>
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

export default DashboardLayout;
