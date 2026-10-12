import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ShieldAlert, Sun, Moon, ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      showSuccess("Welcome! Logged in successfully.");
      if (email.toLowerCase().includes('admin')) {
        navigate('/admin/staff');
      } else {
        navigate('/admin/dashboard');
      }
    } else {
      showError("Login failed. Please check your email and password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200 relative p-4">
      {/* Top Left Back to Home Button */}
      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur transition shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Top Right Dark/Light Theme Icon Button */}
      <div className="absolute top-5 right-5 sm:top-8 sm:right-8 z-20">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-700" />}
        </button>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl p-8 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-50 dark:bg-blue-500/20 p-3.5 rounded-2xl mb-4 border border-blue-100 dark:border-blue-500/30">
            <ShieldAlert size={40} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-wider">Evac_Route</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">LGU Command Center Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Official Email</label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/70 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-transparent transition-colors"
              placeholder="drrm@lgu.gov.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/70 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-transparent transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition duration-200 cursor-pointer text-sm tracking-wide"
          >
            Secure Login
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/80">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2.5 uppercase tracking-wider text-center">
            Quick Select Test Role
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setEmail('admin@lgu.gov.ph'); setPassword('password'); }}
              className="px-2.5 py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-gray-700/60 dark:hover:bg-gray-700 border border-purple-200 dark:border-gray-600 rounded-xl text-left transition text-xs group cursor-pointer"
            >
              <div className="font-bold text-purple-700 dark:text-purple-400 group-hover:text-purple-800 dark:group-hover:text-purple-300">⚡ Admin</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">admin@lgu.gov.ph</div>
            </button>
            <button
              type="button"
              onClick={() => { setEmail('drrm@lgu.gov.ph'); setPassword('password'); }}
              className="px-2.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-gray-700/60 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-xl text-left transition text-xs group cursor-pointer"
            >
              <div className="font-bold text-blue-700 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300">🛡️ CDRRMO</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">drrm@lgu.gov.ph</div>
            </button>
            <button
              type="button"
              onClick={() => { setEmail('logistics@lgu.gov.ph'); setPassword('password'); }}
              className="px-2.5 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-gray-700/60 dark:hover:bg-gray-700 border border-amber-200 dark:border-gray-600 rounded-xl text-left transition text-xs group cursor-pointer"
            >
              <div className="font-bold text-amber-700 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300">📦 CSWDO</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">logistics@lgu.gov.ph</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
