import { Link, useNavigate } from 'react-router-dom';
import { Compass, Home, LayoutDashboard, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function NotFound() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
      <div className="max-w-lg w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* 404 Icon & Tag */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-sm">
          <Compass size={40} className="animate-spin-slow" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 mb-3 border border-blue-200 dark:border-blue-800">
          Error 404 • Out of Route
        </span>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Page Not Found
        </h1>

        <p className="text-sm text-gray-600 dark:text-slate-400 mt-3 leading-relaxed max-w-md mx-auto">
          The tactical dispatch route, module, or URL you requested does not exist or has been relocated to another sector.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 font-bold text-xs uppercase tracking-wider transition shadow-sm"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>

          {user ? (
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-blue-600/20"
            >
              <LayoutDashboard size={16} />
              Command Center
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-blue-600/20"
            >
              <Home size={16} />
              Return Home
            </Link>
          )}
        </div>

        {/* System footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-500 font-medium">
          <ShieldAlert size={14} className="text-blue-500" />
          <span>EvacRoute • CDRRMO & CSWDO Disaster Portal</span>
        </div>
      </div>
    </div>
  );
}
