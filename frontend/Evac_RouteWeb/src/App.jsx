import { lazy, Suspense } from "react";

import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Lazy loaded Pages
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const MapDashboard = lazy(() => import('./pages/MapDashboard'));
const InventoryManager = lazy(() => import('./pages/InventoryManager'));
const ShelterManagement = lazy(() => import('./pages/ShelterManagement'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const EvacuationLogs = lazy(() => import('./pages/EvacuationLogs'));
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'));

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
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-wider text-blue-400">Evac_Route</h1>
          <p className="text-xs text-gray-400 mt-1">LGU Command Center</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-2 px-4">Command</p>
          <NavLink to="/admin/dashboard">Dashboard Overview</NavLink>
          <NavLink to="/admin/map">Live Map View</NavLink>
          
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-4">Management</p>
          <NavLink to="/admin/shelters">Shelters & Capacities</NavLink>
          <NavLink to="/admin/inventory">Inventory & Relief</NavLink>
          
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-4">Administration</p>
          <NavLink to="/admin/reports">Evacuation Logs</NavLink>
          <NavLink to="/admin/staff">Staff Operators</NavLink>
        </nav>
        <div className="p-4 border-t border-gray-800">
           <button
             onClick={logout}
             className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded transition font-medium"
           >
             Logout
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Alert Placeholder */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 shadow-sm z-10">
           <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-gray-600">System Online - All Endpoints Secure</span>
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
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Base URL now points directly to Admin Login */}
            <Route path="/" element={<AdminLogin />} />
            <Route path="/admin/login" element={<Navigate to="/" replace />} />

            {/* Protected LGU Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'lgu_staff']} />}>
              <Route path="/admin/dashboard" element={<DashboardLayout><DashboardOverview /></DashboardLayout>} />
              <Route path="/admin/map" element={<DashboardLayout><MapDashboard /></DashboardLayout>} />
              <Route path="/admin/shelters" element={<DashboardLayout><ShelterManagement /></DashboardLayout>} />
              <Route path="/admin/inventory" element={<DashboardLayout><InventoryManager /></DashboardLayout>} />
              <Route path="/admin/reports" element={<DashboardLayout><EvacuationLogs /></DashboardLayout>} />
              <Route path="/admin/staff" element={<DashboardLayout><StaffManagement /></DashboardLayout>} />
            </Route>

          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
