<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSWDO_Shelter_Capacities_Report_{{ $generatedAt->format('Y-m-d') }}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.4;
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      display: flex;
    }
    @media print {
      body {
        background: #ffffff !important;
      }
      .no-print {
        display: none !important;
      }
      .print-container {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        box-shadow: none !important;
        border: none !important;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      thead {
        display: table-header-group !important;
      }
      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .top-bar-title {
      font-weight: 700;
      font-size: 14px;
    }
    .top-bar-sub {
      font-size: 11px;
      color: #94a3b8;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: background 0.15s;
      text-decoration: none;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #334155;
      color: #f1f5f9;
      margin-left: 8px;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    .btn-toggle {
      background: #1e293b;
      color: #94a3b8;
      padding: 6px 12px;
      font-size: 11px;
      margin-right: 4px;
    }
    .btn-toggle.active {
      background: #2563eb;
      color: #ffffff;
    }
    .print-container {
      max-width: 900px;
      margin: 20px auto;
      background: #ffffff;
      padding: 32px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .letterhead {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .letterhead-top {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .letterhead h1 {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.2px;
    }
    .letterhead h2 {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      margin: 4px 0 0 0;
      letter-spacing: 0.5px;
    }
    .badge-report-type {
      display: inline-block;
      margin-top: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e3a8a;
      font-size: 11px;
      font-family: monospace;
      font-weight: 700;
      padding: 3px 12px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 12px;
      border-radius: 6px;
    }
    .metric-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      display: block;
      margin-bottom: 2px;
    }
    .metric-value {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
    }
    .metric-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 11px;
    }
    thead th {
      background: #f1f5f9;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      padding: 8px 10px;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 9px;
      color: #334155;
      text-align: left;
    }
    tbody td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .status-open {
      background: #d1fae5;
      color: #065f46;
    }
    .status-critical {
      background: #fee2e2;
      color: #991b1b;
    }
    .status-standby {
      background: #f1f5f9;
      color: #475569;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      border-top: 2px solid #0f172a;
      padding-top: 20px;
      margin-top: 24px;
      text-align: center;
    }
    .sign-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 36px;
    }
    .sign-line {
      border-bottom: 1px solid #94a3b8;
      padding-bottom: 4px;
      margin-bottom: 4px;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 10px;
      color: #0f172a;
    }
    .sign-dept {
      font-size: 9px;
      color: #64748b;
    }
    .report-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 24px;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- Non-printable Sticky Action Bar -->
  <div class="top-bar no-print">
    <div>
      <div class="top-bar-title">Shelters &amp; Capacities Logistical Audit Report</div>
      <div class="top-bar-sub">Official CSWDO Citywide Evacuation Facility Overview • Zamboanga City</div>
    </div>
    <div style="display: flex; align-items: center;">
      <!-- Planning Basis Switcher -->
      <a href="?mode=surge&token={{ request('token') }}" class="btn btn-toggle {{ $planningMode === 'surge' ? 'active' : '' }}">
        Surge Contingency (+20%)
      </a>
      <a href="?mode=capacity&token={{ request('token') }}" class="btn btn-toggle {{ $planningMode === 'capacity' ? 'active' : '' }}">
        Pre-Landfall Staging (100% Cap)
      </a>

      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        ✕ Close
      </button>
    </div>
  </div>

  <div class="print-container">
    <!-- Official Letterhead -->
    <div class="letterhead">
      <div class="letterhead-top">
        Republic of the Philippines • City Government of Zamboanga
      </div>
      <h1>City Social Welfare and Development Office (CSWDO)</h1>
      <h2>Emergency Operations Center (EOC) • Camp Coordination and Camp Management (CCCM)</h2>
      <div class="badge-report-type">
        CITYWIDE EVACUATION SHELTER CAPACITIES &amp; RELIEF ALLOCATION AUDIT
      </div>
    </div>

    <!-- Executive Metrics Grid -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Designated Shelters</span>
        <div class="metric-value">{{ $totalShelters }}</div>
        <div class="metric-sub">Active Facilities</div>
      </div>
      <div class="metric-card">
        <span class="metric-label">Total Accommodatable Capacity</span>
        <div class="metric-value">{{ number_format($totalCapacity) }}</div>
        <div class="metric-sub">Maximum Pax Slots</div>
      </div>
      <div class="metric-card">
        <span class="metric-label">Current Evacuees</span>
        <div class="metric-value" style="color: #2563eb;">{{ number_format($totalOccupancy) }}</div>
        <div class="metric-sub">Checked-in Persons</div>
      </div>
      <div class="metric-card">
        <span class="metric-label">Citywide Utilization</span>
        <div class="metric-value" style="color: #059669;">{{ $overallUtilization }}%</div>
        <div class="metric-sub">Planning: <strong style="text-transform: uppercase;">{{ $planningMode }}</strong></div>
      </div>
    </div>

    <!-- Active Formula Note -->
    <div style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 16px; display: flex; justify-content: space-between;">
      <div>
        <strong>Active Disaster Formula:</strong> &ldquo;{{ $activeTemplate->name ?? 'Standard Disaster Relief Pack' }}&rdquo;
      </div>
      <div style="color: #475569;">
        Planning Mode: <strong>{{ $planningMode === 'surge' ? 'Active Evacuees + 20% Surge Reserve' : '100% Pre-Landfall Prepositioning' }}</strong>
      </div>
    </div>

    <!-- Shelters Table -->
    <table>
      <thead>
        <tr>
          <th>Shelter Facility</th>
          <th>Barangay</th>
          <th class="text-right">Occupants / Capacity</th>
          <th class="text-center">Status / Load</th>
          <th class="text-right">Target Demand</th>
          <th>Calculated Relief Supply Requirements</th>
        </tr>
      </thead>
      <tbody>
        @forelse($shelters as $shelter)
          @php
            $occ = (int) $shelter->current_occupancy;
            $cap = (int) $shelter->max_capacity;
            $util = $cap > 0 ? round(($occ / $cap) * 100) : 0;
            $surgeBuffer = (int) ceil($occ * 0.20);
            $targetPax = $planningMode === 'surge' ? ($occ > 0 ? $occ + $surgeBuffer : 0) : $cap;
          @endphp
          <tr>
            <td style="font-weight: 700; color: #0f172a;">{{ $shelter->name }}</td>
            <td style="color: #475569;">{{ $shelter->barangay ?? 'Zamboanga City' }}</td>
            <td class="text-right" style="font-family: monospace; font-weight: 700;">
              <span style="{{ $occ > 0 ? 'color: #2563eb;' : 'color: #64748b;' }}">{{ $occ }}</span>
              <span style="color: #94a3b8;">/</span>
              <span>{{ $cap }}</span>
            </td>
            <td class="text-center">
              @if($util >= 90)
                <span class="status-badge status-critical">Critical ({{ $util }}%)</span>
              @elseif($occ > 0)
                <span class="status-badge status-open">Open ({{ $util }}%)</span>
              @else
                <span class="status-badge status-standby">Standby (0%)</span>
              @endif
            </td>
            <td class="text-right" style="font-weight: 900; font-size: 12px; color: #0f172a;">
              {{ $targetPax > 0 ? $targetPax . ' Pax' : 'Standby (0)' }}
            </td>
            <td>
              @if($targetPax > 0 && $activeTemplate && $activeTemplate->items->count() > 0)
                <div style="font-size: 10px; color: #334155; line-height: 1.5;">
                  @foreach($activeTemplate->items as $tItem)
                    @php
                      $isFam = ($tItem->allocation_type === 'per_family');
                      $count = $isFam ? max(1, (int) ceil($targetPax / 5)) : $targetPax;
                      $qty = $count * ($tItem->quantity_per_head ?? 1);
                      $itemName = $tItem->inventoryItem->item_name ?? 'Item';
                      $unit = $tItem->inventoryItem->unit_type ?? 'units';
                    @endphp
                    <div>
                      <span>{{ $itemName }}:</span>
                      <strong style="color: #0f172a;">{{ number_format($qty) }} {{ $unit }}</strong>
                    </div>
                  @endforeach
                </div>
              @else
                <span style="font-size: 10px; color: #94a3b8; font-style: italic;">No allocation required (Standby)</span>
              @endif
            </td>
          </tr>
        @empty
          <tr>
            <td colspan="6" class="text-center" style="padding: 24px; color: #64748b;">No evacuation shelters found.</td>
          </tr>
        @endforelse
      </tbody>
    </table>

    <!-- Official Signatures Block (CSWDO Only) -->
    <div class="signatures-grid avoid-break">
      <div>
        <div class="sign-title">Prepared &amp; Audited By:</div>
        <div class="sign-line">CSWDO Camp Coordination Officer</div>
        <div class="sign-dept">CCCM &amp; Intake Registry Desk</div>
      </div>
      <div>
        <div class="sign-title">Verified By:</div>
        <div class="sign-line">Warehouse Logistics Custodian</div>
        <div class="sign-dept">CSWDO Central Disaster Supply Depot</div>
      </div>
      <div>
        <div class="sign-title">Approved By:</div>
        <div class="sign-line">CSWDO Department Head</div>
        <div class="sign-dept">City Government of Zamboanga</div>
      </div>
    </div>

    <!-- Official Footer -->
    <div class="report-footer">
      <span>EvacRoute CSWDO Logistics Engine • Republic of the Philippines</span>
      <span>Generated: {{ $generatedAt->format('F d, Y • h:i A') }}</span>
    </div>
  </div>

  <!-- Auto print dialog on page load -->
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>
