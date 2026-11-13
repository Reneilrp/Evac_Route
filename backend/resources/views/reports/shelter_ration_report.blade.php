<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSWDO_Ration_Overview_{{ preg_replace('/[^a-zA-Z0-9]/', '_', $shelter->name) }}_{{ $generatedAt->format('Y-m-d') }}</title>
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
      max-width: 860px;
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
    .shelter-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 14px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .meta-box-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .meta-stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      border-radius: 6px;
    }
    .stat-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      display: block;
    }
    .stat-val {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
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
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .badge-rule {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
    }
    .badge-rule-fam {
      background: #f3e8ff;
      color: #6b21a8;
    }
    .badge-rule-head {
      background: #d1fae5;
      color: #065f46;
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
      <div class="top-bar-title">{{ $shelter->name }} — Relief Allocation Overview</div>
      <div class="top-bar-sub">Official CSWDO Headcount &amp; Ration Requirements Summary</div>
    </div>
    <div style="display: flex; align-items: center;">
      <!-- Sizing Basis Switcher -->
      <a href="?mode=occupancy&token={{ request('token') }}" class="btn btn-toggle {{ $sizingMode === 'occupancy' ? 'active' : '' }}">
        Live Occupancy ({{ $actualOccupancy }} Pax)
      </a>
      <a href="?mode=capacity&token={{ request('token') }}" class="btn btn-toggle {{ $sizingMode === 'capacity' ? 'active' : '' }}">
        Shelter Capacity ({{ $maxCapacity }} Pax)
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
      <h2>Emergency Operations Center (EOC) • Disaster Relief Logistics Division</h2>
      <div class="badge-report-type">
        SHELTER RATION ALLOCATION &amp; DISPATCH MANIFEST OVERVIEW
      </div>
    </div>

    <!-- Facility & Sizing Meta -->
    <div class="shelter-meta-grid">
      <div>
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b;">Target Evacuation Facility</div>
        <div style="font-size: 16px; font-weight: 900; color: #0f172a;">{{ $shelter->name }}</div>
        <div style="color: #475569; font-weight: 600; margin-top: 4px;">Barangay: <strong>{{ $shelter->barangay ?? 'Zamboanga City' }}</strong></div>
        <div style="color: #64748b; font-size: 10px; margin-top: 6px;">
          Generated: {{ $generatedAt->format('F d, Y • h:i A') }}
        </div>
      </div>

      <div class="meta-box-grid">
        <div class="meta-stat-card">
          <span class="stat-label">Actual Occupancy</span>
          <div class="stat-val" style="color: #2563eb;">{{ $actualOccupancy }}</div>
          <span style="font-size: 9px; color: #64748b;">Checked-in Evacuees</span>
        </div>
        <div class="meta-stat-card">
          <span class="stat-label">Building Capacity</span>
          <div class="stat-val">{{ $maxCapacity }}</div>
          <span style="font-size: 9px; color: #64748b;">Max Accommodatable</span>
        </div>
        <div class="meta-stat-card">
          <span class="stat-label">Target Sizing Basis</span>
          <div style="font-weight: 800; font-size: 11px; color: #059669; line-height: 1.2;">
            {{ $isOccupancyBase ? "Live Occupancy ($effectivePax Pax)" : "Full Capacity ($effectivePax Pax)" }}
          </div>
          <span style="font-size: 9px; color: #64748b;">+{{ $bufferPercent }}% Buffer (+{{ $calculatedBufferPax }} Pax)</span>
        </div>
        <div class="meta-stat-card">
          <span class="stat-label">Total Recommended</span>
          <div class="stat-val" style="color: #4338ca;">{{ $effectivePax + $calculatedBufferPax }}</div>
          <span style="font-size: 9px; color: #64748b;">Target Portions</span>
        </div>
      </div>
    </div>

    <!-- Active Template Rule -->
    <div style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>Active Formula:</strong> &ldquo;{{ $activeTemplate->name ?? 'Standard Disaster Relief Pack' }}&rdquo;
      </div>
      <div style="font-size: 10px; color: #475569; font-weight: 600;">
        Conversion: 5 Persons = 1 Family Household
      </div>
    </div>

    <!-- Itemized Allocation Table -->
    <table>
      <thead>
        <tr>
          <th>Item Description</th>
          <th>Category</th>
          <th>Allocation Rule</th>
          <th class="text-right">Base Need</th>
          <th class="text-right">Buffer (+{{ $bufferPercent }}%)</th>
          <th class="text-right">Total To Dispatch</th>
          <th class="text-right">Warehouse ATP</th>
        </tr>
      </thead>
      <tbody>
        @forelse($activeTemplate->items ?? [] as $tItem)
          @php
            $invItem = $tItem->inventoryItem ?? ($inventoryItems[$tItem->inventory_item_id] ?? null);
            $isFam = ($tItem->allocation_type === 'per_family');
            $quota = $tItem->quantity_per_head ?? 1;
            $unit = $invItem->unit_type ?? 'units';

            $baseMultiplier = $isFam ? max(1, (int) ceil($effectivePax / 5)) : $effectivePax;
            $totalPax = $effectivePax + $calculatedBufferPax;
            $totalMultiplier = $isFam ? max($baseMultiplier, (int) ceil($totalPax / 5)) : $totalPax;
            $bufferMultiplier = max(0, $totalMultiplier - $baseMultiplier);

            $baseQty = $baseMultiplier * $quota;
            $bufferQty = $bufferMultiplier * $quota;
            $totalQty = $baseQty + $bufferQty;

            $avail = $invItem ? $invItem->available_stock : 0;
            $isShortage = $totalQty > $avail;
          @endphp
          <tr>
            <td style="font-weight: 700; color: #0f172a;">{{ $invItem->item_name ?? 'Relief Item' }}</td>
            <td style="color: #475569; text-transform: capitalize;">{{ str_replace('_', ' ', $invItem->category ?? 'General') }}</td>
            <td>
              @if($isFam)
                <span class="badge-rule badge-rule-fam">Per Family (5 Pax)</span>
              @else
                <span class="badge-rule badge-rule-head">Per Individual</span>
              @endif
            </td>
            <td class="text-right" style="font-weight: 600;">{{ number_format($baseQty) }} {{ $unit }}</td>
            <td class="text-right" style="font-weight: 600; color: #059669;">+{{ number_format($bufferQty) }} {{ $unit }}</td>
            <td class="text-right" style="font-weight: 900; font-size: 12px; color: #0f172a;">{{ number_format($totalQty) }} {{ $unit }}</td>
            <td class="text-right" style="font-weight: 700;">
              @if($isShortage)
                <span style="color: #dc2626;">⚠️ Shortage ({{ number_format($avail) }})</span>
              @else
                <span style="color: #059669;">✓ {{ number_format($avail) }} {{ $unit }} Ready</span>
              @endif
            </td>
          </tr>
        @empty
          <tr>
            <td colspan="7" class="text-center" style="padding: 24px; color: #64748b;">No ration items defined in active template.</td>
          </tr>
        @endforelse
      </tbody>
    </table>

    <!-- Official Signatures Block (CSWDO Only) -->
    <div class="signatures-grid avoid-break">
      <div>
        <div class="sign-title">Prepared &amp; Requisitioned By:</div>
        <div class="sign-line">CSWDO Logistics Officer</div>
        <div class="sign-dept">Disaster Response &amp; Intake Desk</div>
      </div>
      <div>
        <div class="sign-title">Dispatched &amp; Approved By:</div>
        <div class="sign-line">Central Warehouse Custodian</div>
        <div class="sign-dept">CSWDO Disaster Supply Depot</div>
      </div>
      <div>
        <div class="sign-title">Received At Shelter Desk By:</div>
        <div class="sign-line">Shelter Camp Manager</div>
        <div class="sign-dept">{{ $shelter->name }} — Brgy. {{ $shelter->barangay ?? 'Council' }}</div>
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
