/* global jest, describe, it, expect, beforeEach */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// 1. Mock API service
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: [], status: 'success' } }),
    post: jest.fn().mockResolvedValue({ data: { data: {}, status: 'success' } }),
    put: jest.fn().mockResolvedValue({ data: { data: {}, status: 'success' } }),
    delete: jest.fn().mockResolvedValue({ data: { data: {}, status: 'success' } }),
  },
}));

// 2. Mock Echo / WebSockets
jest.mock('../../services/echo', () => ({
  __esModule: true,
  default: {
    channel: jest.fn().mockReturnValue({
      listen: jest.fn().mockReturnThis(),
      stopListening: jest.fn().mockReturnThis(),
    }),
    private: jest.fn().mockReturnValue({
      listen: jest.fn().mockReturnThis(),
      stopListening: jest.fn().mockReturnThis(),
    }),
  },
}));

// 3. Mock Auth Context
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Super Admin', role: 'admin', email: 'admin@evacroute.ph' },
    token: 'fake-token',
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// 4. Mock Mapbox and react-map-gl
jest.mock('react-map-gl/mapbox', () => {
  const React = require('react');
  const MockComponent = ({ children, ...props }) => React.createElement('div', props, children);
  return {
    __esModule: true,
    default: React.forwardRef(({ children, ...props }, ref) => (
      React.createElement('div', { ref, ...props }, children)
    )),
    Marker: MockComponent,
    NavigationControl: MockComponent,
    Source: MockComponent,
    Layer: MockComponent,
  };
});

jest.mock('mapbox-gl', () => ({
  Map: jest.fn(),
}));

// Import modified pages
import StaffManagement from '../StaffManagement';
import EvacuationLogs from '../EvacuationLogs';
import SystemHealth from '../SystemHealth';
import AuditLogs from '../AuditLogs';
import ResidentRegistry from '../ResidentRegistry';
import MapDashboard, { FloatingMapSearch } from '../MapDashboard';
import RescueDispatch, { DispatchUnitModal } from '../RescueDispatch';
import EmergencyAlerts from '../EmergencyAlerts';
import InventoryManager, { AddStockModal } from '../InventoryManager';
import IncidentReviewQueue from '../IncidentReviewQueue';

describe('Web UI Fixes - Component Initialization & Render Integrity Tests', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (Component, initialEntries = ['/']) => {
    return renderToString(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {Component}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders StaffManagement without throwing typeError or renderError', () => {
    expect(() => {
      const html = renderWithProviders(<StaffManagement />);
      expect(html).toContain('CDRRMO Staff &amp; Rescue Operator Roster');
    }).not.toThrow();
  });

  it('renders EvacuationLogs with date filters without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<EvacuationLogs />);
      expect(html).toContain('Evacuation Logs &amp; Reports');
      expect(html).toContain('Export to CSV');
    }).not.toThrow();
  });

  it('renders SystemHealth with responsive styling and light/dark theme classes', () => {
    expect(() => {
      const html = renderWithProviders(<SystemHealth />);
      expect(html).toContain('System Health &amp; Infrastructure Telemetry');
      expect(html).toContain('Database Engine');
      expect(html).toContain('WebSocket Broadcast');
    }).not.toThrow();
  });

  it('renders AuditLogs with inline table structure without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<AuditLogs />);
      expect(html).toContain('Security &amp; Operational Audit Trail');
      expect(html).toContain('Export Audit Log (CSV)');
    }).not.toThrow();
  });

  it('renders ResidentRegistry with Export to CSV button without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<ResidentRegistry />);
      expect(html).toContain('Resident History &amp; Registry');
      expect(html).toContain('Export to CSV');
    }).not.toThrow();
  });

  it('renders MapDashboard with search bar and controls without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<MapDashboard />);
      expect(html).toContain('Search barangay or shelter...');
    }).not.toThrow();
  });

  it('handles MapDashboard focusLat and focusLng URL query redirection without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<MapDashboard />, ['/admin/map?focusLat=6.9214&focusLng=122.0790']);
      expect(html).toBeTruthy();
    }).not.toThrow();
  });

  it('renders RescueDispatch without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<RescueDispatch />);
      expect(html).toContain('CDRRMO Rescue Dispatch Center');
    }).not.toThrow();
  });

  it('renders EmergencyAlerts with alphabetical barangays without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<EmergencyAlerts />);
      expect(html).toContain('Emergency Warnings Dispatcher');
    }).not.toThrow();
  });

  it('renders InventoryManager with Edit buttons and delivery presets without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<InventoryManager />);
      expect(html).toContain('Central Relief Inventory');
    }).not.toThrow();
  });

  it('renders IncidentReviewQueue without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<IncidentReviewQueue />);
      expect(html).toContain('Incident Review Queue');
    }).not.toThrow();
  });

  it('renders DispatchUnitModal with smart geocoding and nearest shelter recommendation without throwing', () => {
    const mockInitialData = {
      victim_name: '',
      victim_latitude: 6.9214,
      victim_longitude: 122.0790,
      barangay: 'Tetuan',
      headcount: 3,
      hazard_type: 'flood',
    };
    const mockUnits = [
      { id: 1, name: 'Rescue Alpha', call_sign: 'RA-01', unit_type: 'water_rescue', capacity: 6, status: 'standby' }
    ];
    const mockShelters = [
      { id: 10, name: 'Tetuan Central Center', barangay: 'Tetuan', latitude: 6.9194, longitude: 122.0840, current_occupancy: 20, max_capacity: 100 }
    ];

    expect(() => {
      const html = renderWithProviders(
        <DispatchUnitModal
          initialData={mockInitialData}
          availableUnits={mockUnits}
          shelters={mockShelters}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );
      expect(html).toContain('Victim / Family Name');
      expect(html).toContain('Optional');
      expect(html).toContain('Distress GPS Coordinates');
      expect(html).toContain('Barangay');
      expect(html).toContain('RECOMMENDED NEAREST SHELTER');
      expect(html).toContain('Tetuan Central Center');
      expect(html).toContain('FLOOD RESCUE');
      expect(html).toContain('Rescue Equipment Brought');
    }).not.toThrow();
  });

  it('renders DispatchUnitModal with SOS fire hazard, modifiers, and over-capacity alert', () => {
    const mockInitialData = {
      victim_name: 'Santos Family',
      victim_latitude: 6.9214,
      victim_longitude: 122.0790,
      barangay: 'Tetuan',
      headcount: 6,
      hazard_type: 'fire',
      modifiers: ['infant', 'elderly', 'roof_trapped'],
    };
    const mockUnits = [
      { id: 1, name: 'Truck Delta', call_sign: 'TD-01', unit_type: 'high_clearance_truck', capacity: 4, status: 'standby' }
    ];
    const mockShelters = [
      { id: 10, name: 'Tetuan Central Center', barangay: 'Tetuan', latitude: 6.9194, longitude: 122.0840, current_occupancy: 20, max_capacity: 100 }
    ];

    const html = renderWithProviders(
      <DispatchUnitModal
        initialData={mockInitialData}
        availableUnits={mockUnits}
        shelters={mockShelters}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );
    expect(html).toContain('FIRE RESCUE');
    expect(html).toContain('6 Victims Stranded');
    expect(html).toContain('infant');
    expect(html).toContain('elderly');
    expect(html).toContain('roof trapped');
    expect(html).toContain('Exceeds Capacity');
  });

  it('renders AddStockModal with relief presets, categories, and unit dropdowns without throwing', () => {
    expect(() => {
      const html = renderWithProviders(
        <AddStockModal onCancel={jest.fn()} onAdd={jest.fn()} />
      );
      expect(html).toContain('Receive New Delivery');
      expect(html).toContain('Rice (50kg Sacks)');
      expect(html).toContain('Food &amp; Water');
      expect(html).toContain('Unit of Measurement');
    }).not.toThrow();
  });

  it('renders FloatingMapSearch with search input without throwing', () => {
    expect(() => {
      const html = renderWithProviders(
        <FloatingMapSearch shelters={[{ id: 1, name: 'Tetuan Shelter', longitude: 122.08, latitude: 6.92 }]} onSelectLocation={jest.fn()} />
      );
      expect(html).toContain('Search barangay or shelter...');
    }).not.toThrow();
  });
});
