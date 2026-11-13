<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSWDO_Relief_Stock_Report_{{ $generatedAt->format('Y-m-d') }}</title>
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
    .status-healthy {
      background: #d1fae5;
      color: #065f46;
    }
    .status-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .status-critical {
      background: #fee2e2;
      color: #991b1b;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
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
      font-size: 11px;
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
      <div class="top-bar-title">Relief Stock Monitoring Report</div>
      <div class="top-bar-sub">Official CSWDO Central Warehouse Stock Audit • Zamboanga City</div>
    </div>
    <div>
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
        CENTRAL WAREHOUSE RELIEF STOCK AUDIT &amp; AVAILABILITY MANIFEST
      </div>
    </div>

    <!-- Executive Metrics Grid -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Total SKUs</span>
        <div class="metric-value">{{ $totalSKUs }}</div>
        <div class="metric-sub">Cataloged Relief Items</div>
      </div>
      <div class="metric-card">
        <span class="metric-label">Physical Warehouse Stock</span>
        <div class="metric-value">{{ number_format($totalPhysicalStock) }}</div>
        <div class="metric-sub">Gross Units on Hand</div>
      </div>
      <div class="metric-card">
        <span class="metric-label">Active Reservations</span>
        <div class="metric-value" style="color: #2563eb;">{{ number_format($totalReservedStock) }}</div>
        <div class="metric-sub">Committed in Transit</div>
      </div>
      <div class="metric-card">
        <span class="metric-label">Available to Promise (ATP)</span>
        <div class="metric-value" style="color: #059669;">{{ number_format($totalAvailableStock) }}</div>
        <div class="metric-sub">Unreserved Emergency Stock</div>
      </div>
    </div>

    <!-- Table of Inventory Items -->
    <table>
      <thead>
        <tr>
          <th>Item Description</th>
          <th>Category</th>
          <th>Unit</th>
          <th class="text-right">Total Stock</th>
          <th class="text-right">Reserved</th>
          <th class="text-right">Available (ATP)</th>
          <th class="text-center">Audit Status</th>
        </tr>
      </thead>
      <tbody>
        @forelse($items as $item)
          @php
            $avail = $item->available_stock;
            $isCritical = $avail < 200;
            $isWarning = $avail >= 200 && $avail < 600;
          @endphp
          <tr>
            <td style="font-weight: 700; color: #0f172a;">{{ $item->item_name }}</td>
            <td style="color: #475569; text-transform: capitalize;">{{ str_replace('_', ' ', $item->category ?? 'General') }}</td>
            <td style="font-family: monospace; font-size: 10px; color: #64748b;">{{ $item->unit_type }}</td>
            <td class="text-right" style="font-weight: 600;">{{ number_format($item->total_stock) }}</td>
            <td class="text-right" style="font-weight: 600; color: #2563eb;">{{ number_format($item->reserved_quantity ?? 0) }}</td>
            <td class="text-right" style="font-weight: 900; font-size: 12px; color: #0f172a;">{{ number_format($avail) }}</td>
            <td class="text-center">
              @if($isCritical)
                <span class="status-badge status-critical">Critical Deficit</span>
              @elseif($isWarning)
                <span class="status-badge status-warning">Reorder Soon</span>
              @else
                <span class="status-badge status-healthy">Healthy</span>
              @endif
            </td>
          </tr>
        @empty
          <tr>
            <td colspan="7" class="text-center" style="padding: 24px; color: #64748b;">No inventory items recorded in central warehouse.</td>
          </tr>
        @endforelse
      </tbody>
    </table>

    <!-- Official Signatures Block (CSWDO Only) -->
    <div class="signatures-grid avoid-break">
      <div>
        <div class="sign-title">Audited &amp; Certified By:</div>
        <div class="sign-line">Warehouse Logistics Custodian</div>
        <div class="sign-dept">CSWDO Central Disaster Supply Depot</div>
      </div>
      <div>
        <div class="sign-title">Verified &amp; Approved By:</div>
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
