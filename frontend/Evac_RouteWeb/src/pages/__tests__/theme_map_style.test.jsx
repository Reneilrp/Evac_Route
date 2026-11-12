import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../context/ThemeContext';
import MapDashboard from '../MapDashboard';

// Mock storage
let store = {};
const mockLocalStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { store = {}; },
};
global.localStorage = mockLocalStorage;

// Mock matchMedia
global.window = global.window || {};
global.window.matchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock mapbox-gl
jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    on: jest.fn(),
    remove: jest.fn(),
    flyTo: jest.fn(),
    easeTo: jest.fn(),
    getSource: jest.fn(),
    addSource: jest.fn(),
    getLayer: jest.fn(),
    addLayer: jest.fn(),
    getCanvas: jest.fn(() => ({ style: {} })),
  })),
  NavigationControl: jest.fn(),
  Marker: jest.fn(),
}));

jest.mock('react-map-gl/mapbox', () => {
  const MockMap = ({ children, mapStyle }) => (
    <div data-testid="mock-map" data-map-style={mapStyle}>
      {children}
    </div>
  );
  return {
    __esModule: true,
    default: MockMap,
    Marker: ({ children }) => <div>{children}</div>,
    NavigationControl: () => <div />,
    Source: ({ children }) => <div>{children}</div>,
    Layer: () => <div />,
  };
});

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn((url) => {
      if (url.includes('/map/dashboard-data')) {
        return Promise.resolve({
          data: {
            shelters: [],
            hazards: [],
            demographics: [],
            live_weather: { condition: 'Clear', temperature: 29 },
            traffic_corridors: [],
          },
        });
      }
      return Promise.resolve({ data: [] });
    }),
    post: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'DRRM Officer', email: 'officer@lgu.gov.ph', role: 'admin' },
  }),
}));

describe('Theme Context & Map Style Integration', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    mockLocalStorage.clear();
  });

  it('selects terrain map style when theme is light', () => {
    // Force light mode
    mockLocalStorage.setItem('theme_override', 'light');

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/map']}>
          <ThemeProvider>
            <MapDashboard />
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should render outdoors-v12 terrain map
    expect(html).toContain('mapbox://styles/mapbox/outdoors-v12');
  });

  it('selects dark map style when theme is dark', () => {
    // Force dark mode
    mockLocalStorage.setItem('theme_override', 'dark');

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/map']}>
          <ThemeProvider>
            <MapDashboard />
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should render dark-v11 map
    expect(html).toContain('mapbox://styles/mapbox/dark-v11');
  });

  it('defaults to system preference when no override exists', () => {
    // System matches light
    global.window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false, // light
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/map']}>
          <ThemeProvider>
            <MapDashboard />
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Light system default -> Terrain map
    expect(html).toContain('mapbox://styles/mapbox/outdoors-v12');
  });
});
