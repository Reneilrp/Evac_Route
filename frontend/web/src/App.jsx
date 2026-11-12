import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy loaded Pages
const Landing = lazy(() => import('./pages/public/Landing'));
const AdminLogin = lazy(() => import('./pages/public/AdminLogin'));
const MapDashboard = lazy(() => import('./pages/cdrrmo/MapDashboard'));
const InventoryManager = lazy(() => import('./pages/cswdo/InventoryManager'));
const ShelterManagement = lazy(() => import('./pages/cswdo/ShelterManagement'));
const StaffManagement = lazy(() => import('./pages/admin/StaffManagement'));
const EvacuationLogs = lazy(() => import('./pages/cswdo/EvacuationLogs'));
const DashboardOverview = lazy(() => import('./pages/admin/DashboardOverview'));
const IncidentReviewQueue = lazy(() => import('./pages/cdrrmo/IncidentReviewQueue'));
const RescueDispatch = lazy(() => import('./pages/cdrrmo/RescueDispatch'));
const RescueVehicles = lazy(() => import('./pages/cdrrmo/RescueVehicles'));
const EmergencyAlerts = lazy(() => import('./pages/cdrrmo/EmergencyAlerts'));
const ResidentRegistry = lazy(() => import('./pages/admin/ResidentRegistry'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const SituationReport = lazy(() => import('./pages/admin/SituationReport'));
const SystemHealth = lazy(() => import('./pages/admin/SystemHealth'));
const NotFound = lazy(() => import('./pages/public/NotFound'));

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
    <ThemeProvider>
      <AuthProvider>
      <Toaster 
        position="top-right" 
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
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Base URL is now Public Landing Page with Mobile Showcase & Direct APK Download */}
              <Route path="/" element={<Landing />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/login" element={<Navigate to="/admin/login" replace />} />

              {/* Protected LGU Admin/Staff General & Tactical Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'lgu_staff']} />}>
                <Route path="/admin/dashboard" element={<DashboardLayout><DashboardOverview /></DashboardLayout>} />
                <Route path="/admin/map" element={<DashboardLayout><MapDashboard /></DashboardLayout>} />
                <Route path="/admin/reports" element={<DashboardLayout><EvacuationLogs /></DashboardLayout>} />
                <Route path="/admin/residents" element={<DashboardLayout><ResidentRegistry /></DashboardLayout>} />
                <Route path="/admin/incidents" element={<DashboardLayout><IncidentReviewQueue /></DashboardLayout>} />
                <Route path="/admin/alerts" element={<DashboardLayout><EmergencyAlerts /></DashboardLayout>} />
                <Route path="/admin/rescue-dispatch" element={<DashboardLayout><RescueDispatch /></DashboardLayout>} />
                <Route path="/admin/rescue-vehicles" element={<DashboardLayout><RescueVehicles /></DashboardLayout>} />
                <Route path="/admin/rescue-fleet" element={<Navigate to="/admin/rescue-vehicles" replace />} />
                <Route path="/admin/relief-desk" element={<Navigate to="/admin/inventory" replace />} />
                <Route path="/admin/relief-distribution" element={<Navigate to="/admin/inventory" replace />} />
              </Route>

              {/* CSWDO Camp & Relief Inventory Modules (Segregated from DRRM rescue/field operators) */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'lgu_staff']} allowedOperatorTypes={['logistics', 'scanner']} />}>
                <Route path="/admin/shelters" element={<DashboardLayout><ShelterManagement /></DashboardLayout>} />
                <Route path="/admin/inventory" element={<DashboardLayout><InventoryManager /></DashboardLayout>} />
              </Route>

              {/* Staff Operator Management (Accessible by both CDRRMO & CSWDO) */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'lgu_staff']} />}>
                <Route path="/admin/staff" element={<DashboardLayout><StaffManagement /></DashboardLayout>} />
              </Route>

              {/* Admin-Only Security, SitRep & Telemetry */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/audit-logs" element={<DashboardLayout><AuditLogs /></DashboardLayout>} />
                <Route path="/admin/sitrep" element={<DashboardLayout><SituationReport /></DashboardLayout>} />
                <Route path="/admin/situation-report" element={<Navigate to="/admin/sitrep" replace />} />
                <Route path="/admin/system-health" element={<DashboardLayout><SystemHealth /></DashboardLayout>} />
              </Route>

              {/* Dedicated 404 Out-of-Route Catch-All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
