import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const getSystemTheme = () => {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  };

  const [darkMode, setDarkMode] = useState(() => {
    try {
      const override = localStorage.getItem('theme_override');
      if (override === 'dark') return true;
      if (override === 'light') return false;
    } catch (e) {}
    return getSystemTheme();
  });

  // Listen for browser / OS color scheme changes in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      try {
        const override = localStorage.getItem('theme_override');
        // If user has not set an explicit manual toggle override, follow system theme
        if (!override) {
          setDarkMode(e.matches);
        }
      } catch (err) {}
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const setDarkModePersisted = (valueOrFn) => {
    setDarkMode(prev => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
      try {
        localStorage.setItem('theme_override', next ? 'dark' : 'light');
        localStorage.setItem('theme', next ? 'dark' : 'light');
      } catch (e) {}
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const toggleDarkMode = () => {
    setDarkModePersisted(prev => !prev);
  };

  const resetToSystemTheme = () => {
    try {
      localStorage.removeItem('theme_override');
      localStorage.removeItem('theme');
    } catch (e) {}
    const sys = getSystemTheme();
    setDarkMode(sys);
    if (sys) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode: setDarkModePersisted, toggleDarkMode, resetToSystemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      darkMode: false,
      setDarkMode: () => {},
      toggleDarkMode: () => {},
      resetToSystemTheme: () => {}
    };
  }
  return context;
}
