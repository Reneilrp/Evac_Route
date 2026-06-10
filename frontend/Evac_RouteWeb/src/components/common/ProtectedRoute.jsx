
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white font-bold tracking-widest uppercase">Initializing Command Center...</div>;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Logged in, but doesn't have the right role (e.g. Resident trying to access Web)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    
    if (user.role === 'resident') {
      // Force logout the resident so they aren't stuck with an invalid web token
      logout();
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-center p-6">
          <div className="bg-red-500/20 p-6 rounded-full mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-widest">Access Denied</h2>
          <p className="text-xl text-gray-400 font-medium border border-gray-700 bg-gray-800 p-6 rounded-xl shadow-lg max-w-lg">
            Resident accounts must use the <span className="text-blue-400 font-bold">EVAC-ROUTE Mobile Application</span>.
          </p>
          <a href="/" className="mt-8 text-blue-500 hover:text-blue-400 underline font-medium">Return to Login</a>
        </div>
      );
    }
    
    // Otherwise generic unauthorized fallback
    return <div className="p-10 text-center text-red-500 font-bold">403 Unauthorized: Insufficient Role Permissions</div>;
  }

  return <Outlet />;
}
