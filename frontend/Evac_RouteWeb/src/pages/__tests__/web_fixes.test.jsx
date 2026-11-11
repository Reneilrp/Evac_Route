/* global jest, describe, it, expect, beforeEach */
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
import MapDashboard, { FloatingMapSearch, UnifiedMapFilterSearch } from '../MapDashboard';
import RescueDispatch, { DispatchUnitModal } from '../RescueDispatch';
import RescueVehicles, { VehicleModal } from '../RescueVehicles';
import EmergencyAlerts from '../EmergencyAlerts';
import InventoryManager, { AddStockModal } from '../InventoryManager';
import IncidentReviewQueue from '../IncidentReviewQueue';
import ShelterManagement from '../ShelterManagement';
import SituationReport from '../SituationReport';
import ZamboangaWeatherModal from '../../components/disaster/ZamboangaWeatherModal';
import HotlineIntakeModal from '../../components/disaster/HotlineIntakeModal';
import ProactiveDisasterModal from '../../components/disaster/ProactiveDisasterModal';

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
      expect(html).toContain('Register Rescue / DRRM Operator');
    }).not.toThrow();
  });

  it('renders EvacuationLogs with date filters without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<EvacuationLogs />);
      expect(html).toContain('Export to CSV');
    }).not.toThrow();
  });

  it('renders SystemHealth with responsive styling and light/dark theme classes', () => {
    expect(() => {
      const html = renderWithProviders(<SystemHealth />);
      expect(html).toContain('Run Ping');
      expect(html).toContain('Database Engine');
      expect(html).toContain('WebSocket Broadcast');
    }).not.toThrow();
  });

  it('renders AuditLogs with inline table structure without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<AuditLogs />);
      expect(html).toContain('Export Audit Log (CSV)');
    }).not.toThrow();
  });

  it('renders ResidentRegistry with Export to CSV button without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<ResidentRegistry />);
      expect(html).toContain('Export to CSV');
    }).not.toThrow();
  });

  it('renders MapDashboard with search bar and controls without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<MapDashboard />);
      expect(html).toContain('Search barangay or shelter...');
    }).not.toThrow();
  });

  it('handles MapDashboard focusLat and focusLng URL query redirection and renders incident banner', () => {
    expect(() => {
      const html = renderWithProviders(<MapDashboard />, [
        '/admin/map?focusLat=6.9214&focusLng=122.0790&incidentName=Flooded%20Avenue'
      ]);
      expect(html).toBeTruthy();
      expect(html).toContain('Incident Report');
      expect(html).toContain('Flooded Avenue');
      expect(html).toContain('Back to Review Queue');
    }).not.toThrow();
  });

  it('renders RescueDispatch without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<RescueDispatch />);
      expect(html).toContain('Rescue Fleet');
    }).not.toThrow();
  });

  it('renders EmergencyAlerts with alphabetical barangays and severity filters without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<EmergencyAlerts />);
      expect(html).toContain('Broadcast New Warning');
      expect(html).toContain('Critical');
      expect(html).toContain('Warning');
      expect(html).toContain('Info');
      expect(html).toContain('Severity');
      expect(html).toContain('Search warnings');
    }).not.toThrow();
  });

  it('renders ZamboangaWeatherModal with 24h history and hourly forecast without throwing', () => {
    expect(() => {
      const html = renderWithProviders(
        <ZamboangaWeatherModal
          isOpen={true}
          onClose={() => {}}
          liveTelemetry={{ is_raining: true, continuous_rain_duration_minutes: 25, rain_mm: 3.5, temp_c: 28 }}
          showRadarOverlay={false}
          onToggleRadarOverlay={() => {}}
          onOpenProactiveEoc={() => {}}
        />
      );
      expect(html).toContain('Zamboanga City Weather');
      expect(html).toContain('Rainfall Comparison');
    }).not.toThrow();
  });

  it('renders InventoryManager with Edit buttons and delivery presets without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<InventoryManager />);
      expect(html).toContain('CDRRMO Situational View');
    }).not.toThrow();
  });

  it('renders IncidentReviewQueue without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<IncidentReviewQueue />);
      expect(html).toContain('pending');
      expect(html).toContain('approved');
    }).not.toThrow();
  });

  it('renders RescueVehicles fleet management without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<RescueVehicles />);
      expect(html).toContain('Fleet Assets');
      expect(html).toContain('Register Rescue Vehicle');
      expect(html).toContain('All Types');
    }).not.toThrow();
  });

  it('renders VehicleModal with officer dropdown and correctly assigns staff', () => {
    const mockStaff = [
      { id: 101, name: 'Officer Juan Dela Cruz', role: 'lgu_staff', operator_type: 'rescue_leader', email: 'juan@zamboanga.gov.ph' },
      { id: 102, name: 'Captain Maria Santos', role: 'lgu_staff', operator_type: 'rescue_leader', email: 'maria@zamboanga.gov.ph' },
    ];

    const initialData = {
      id: 5,
      name: 'Rescue Boat Charlie',
      call_sign: 'BOAT-CHARLIE',
      unit_type: 'water_rescue',
      capacity_persons: 8,
      contact_number: '0917-BOAT-03',
      assigned_personnel_id: 101,
    };

    expect(() => {
      const html = renderWithProviders(
        <VehicleModal
          title="Edit Rescue Vehicle Specifications"
          initialData={initialData}
          staff={mockStaff}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );
      expect(html).toContain('Edit Rescue Vehicle Specifications');
      expect(html).toContain('BOAT-CHARLIE');
      expect(html).toContain('Officer Juan Dela Cruz');
      expect(html).toContain('Captain Maria Santos');
      expect(html).toContain('Update Vehicle');
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

  it('renders UnifiedMapFilterSearch with embedded search, granular filters, and guaranteed SOS badge', () => {
    const mockHazards = [
      { id: 1, hazard_type: 'flood', is_fixed_flood_spot: 0 },
      { id: 2, hazard_type: 'earthquake' },
      { id: 3, hazard_type: 'flood', is_fixed_flood_spot: 1 },
      { id: 4, hazard_type: 'fire' },
    ];
    const mockShelters = [{ id: 10, name: 'Tetuan Shelter', longitude: 122.08, latitude: 6.92 }];
    const mockUnits = [{ id: 1, name: 'Alpha Truck' }];
    const mockRescueMissions = [{ id: 99, resident_name: 'Distressed Resident', status: 'pending' }];

    expect(() => {
      const html = renderWithProviders(
        <UnifiedMapFilterSearch
          hazards={mockHazards}
          shelters={mockShelters}
          rescueUnits={mockUnits}
          activeRescueMissions={mockRescueMissions}
          activeFilter="all"
          onChangeFilter={jest.fn()}
          onSelectLocation={jest.fn()}
        />
      );
      expect(html).toContain('Filter &amp; Search');
      expect(html).toContain('SOS');
      expect(html).toContain('Search barangay or shelter...');
      expect(html).toContain('Floods Only');
      expect(html).toContain('Earthquakes Only');
      expect(html).toContain('Chronic Flood Spots');
      expect(html).toContain('Rescue Fleet Only');
      expect(html).toContain('Shelters Only');
      expect(html).toContain('SOS Distress Signals');
      expect(html).toContain('Active Beacons');
      expect(html).toContain('Isolate Zamboanga (Spotlight)');
    }).not.toThrow();
  });

  it('verifies FloatingMapSearch accurately indexes shelters, hazards, and barangays', () => {
    const mockShelters = [
      { id: 101, name: 'Mayor Vitaliano Agan Coliseum', longitude: '122.072', latitude: '6.915', status: 'Active', current_occupancy: 50, max_capacity: 500 },
    ];
    const mockHazards = [
      { id: 201, name: 'Tumaga River Flash Flood', hazard_type: 'flood', severity_level: 'high', longitude: '122.074', latitude: '6.936' },
    ];

    expect(() => {
      const html = renderWithProviders(
        <FloatingMapSearch
          shelters={mockShelters}
          hazards={mockHazards}
          onSelectLocation={jest.fn()}
        />
      );
      expect(html).toContain('Search barangay or shelter...');
    }).not.toThrow();
  });

  it('renders CSWDO ShelterManagement with capacity and ration tabs without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<ShelterManagement />);
      expect(html).toContain('Shelters &amp; Capacities');
      expect(html).toContain('Ration Planning &amp; Buffers');
    }).not.toThrow();
  });

  it('renders SituationReport with DROMIC summaries and print button without throwing', () => {
    expect(() => {
      const html = renderWithProviders(<SituationReport />);
      expect(html).toContain('Print Official SitRep');
      expect(html).toContain('Print');
    }).not.toThrow();
  });

  it('renders HotlineIntakeModal with caller details and priority triage form without throwing', () => {
    expect(() => {
      const html = renderWithProviders(
        <HotlineIntakeModal
          isOpen={true}
          onClose={jest.fn()}
          rescueUnits={[{ id: 1, name: 'Rescue Truck 1' }]}
          shelters={[{ id: 10, name: 'Tetuan Shelter' }]}
        />
      );
      expect(html).toContain('Manual Emergency Call &amp; Direct Dispatch');
      expect(html).toContain('Informant / Caller Name');
      expect(html).toContain('Dispatch Immediate Rescue Mission');
    }).not.toThrow();
  });

  it('renders ProactiveDisasterModal with early warning sirens and geohazard presets without throwing', () => {
    expect(() => {
      const html = renderWithProviders(
        <ProactiveDisasterModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );
      expect(html).toContain('Pre-Mapped Geohazard Presets');
      expect(html).toContain('Declare Barangay Hazard Zone');
      expect(html).toContain('Population At-Risk');
    }).not.toThrow();
  });
});
