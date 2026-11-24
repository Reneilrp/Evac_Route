/* global jest, describe, it, expect, beforeEach */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// 1. Mock API service
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        data: {
          data: [],
          meta: {
            master_emergency_active: true,
            council: 'City Disaster Risk Reduction & Management Council (CDRRMC)',
            report_title: 'SITUATION REPORT (SitRep)'
          },
          population_summary: {
            evacuated_individuals_inside_ec: 42,
            evacuated_families_inside_ec: 10
          },
          cccm_summary: {
            utilization_rate_pct: 65,
            active_evacuation_centers: 3,
            current_occupancy: 42,
            total_capacity: 100,
            barangay_breakdown: [
              { barangay: 'Tetuan', total_shelters: 2, idps_inside: 25, capacity: 50 },
              { barangay: 'Tumaga', total_shelters: 1, idps_inside: 17, capacity: 50 }
            ]
          },
          srr_summary: { rescued_individuals: 15, completed_missions: 3 },
          relief_summary: { relief_rations_claimed: 35, completed_dispatches: 2 }
        },
        shelters: [
          { id: 1, name: 'Tetuan Central School', current_occupancy: 25, max_capacity: 50, status: 'open' }
        ],
        hazards: [],
        recent_logs: [],
        inventory: [],
        tactical: {
          pending_incidents: 0,
          approved_incidents: 1,
          total_incidents: 1,
          rescue_standby: 2,
          rescue_dispatched: 1,
          rescue_total: 3
        },
        status: 'success'
      }
    }),
    post: jest.fn().mockResolvedValue({
      data: {
        status: 'success',
        data: {
          family_name: 'Dela Cruz Family',
          recorded_headcount: 5,
          has_claimed: true,
          duplicate_warning: '⚠️ This IDP household has already claimed relief rations today.'
        }
      }
    }),
    put: jest.fn().mockResolvedValue({ data: { data: {}, status: 'success' } }),
    delete: jest.fn().mockResolvedValue({ data: { data: {}, status: 'success' } }),
  },
}));

// 2. Mock html5-qrcode
jest.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    clear: jest.fn().mockResolvedValue(),
  })),
}));

let mockUser = { id: 1, name: 'EOC Officer', role: 'admin', email: 'cswdo@evacroute.ph' };

// 3. Mock Auth Context
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    token: 'fake-token',
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

import QRScannerModal from '../../components/common/QRScannerModal';
import SituationReport from '../admin/SituationReport';
import DashboardOverview from '../admin/DashboardOverview';

describe('EOC Decision Dashboard & CSWDO Intake Tests', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (Component) => {
    return renderToString(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {Component}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders QRScannerModal with IDP terminology and non-discriminatory intake options', () => {
    const html = renderWithProviders(
      <QRScannerModal isOpen={true} onClose={() => {}} selectedShelterId={1} />
    );

    expect(html).toContain('CSWDO Intake &amp; Relief Desk (IDPs)');
    expect(html).toContain('Scan IDP QR');
    expect(html).toContain('Search Name / Brgy');
    expect(html).toContain('1st-Time Walk-In');
    expect(html).toContain('Equitable Access: Non-discriminatory intake for all Internally Displaced Persons (IDPs)');
  });

  it('renders SituationReport with IDP terminology in executive cards and breakdown table', () => {
    const html = renderWithProviders(<SituationReport />);

    expect(html).toContain('IDPs Inside EC');
    expect(html).toContain('IDPs Inside');
    expect(html).toContain('Camp Coordination &amp; Camp Management (CCCM)');
  });

  it('renders DashboardOverview with IDP terminology in census summary', () => {
    const html = renderWithProviders(<DashboardOverview />);

    expect(html).toContain('Active IDPs');
  });
});
