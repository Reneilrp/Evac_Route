<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSWDO_Dispatch_Manifest_ZAM-LOGISTICS-{{ str_pad($order->id, 5, '0', STR_PAD_LEFT) }}_{{ $generatedAt->format('Y-m-d') }}</title>
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
    .manifest-meta-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .meta-val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    .meta-val-code {
      font-family: monospace;
      font-size: 15px;
      font-weight: 900;
      color: #1e40af;
    }
    .shelter-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 18px;
      background: #ffffff;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .shelter-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      gap: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .status-in_transit { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .status-delivered { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .status-cancelled { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .advisory-box {
      border: 1px solid #fde68a;
      background: #fffbeb;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 24px;
      font-size: 11px;
    }
    .advisory-title {
      font-weight: 800;
      color: #92400e;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 24px;
      text-align: center;
    }
    .sign-box {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
    }
    .sign-name {
      font-weight: 800;
      font-size: 11px;
      color: #0f172a;
    }
    .sign-role {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
    }
    .sign-space {
      height: 38px;
    }
    .sign-note {
      font-size: 9px;
      font-family: monospace;
      color: #94a3b8;
    }
    .report-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>

  <!-- Top Action Navigation Bar (Hidden on print) -->
  <div class="top-bar no-print">
    <div>
      <div class="top-bar-title">Disaster Relief Requisition &amp; Transport Manifest</div>
      <div class="top-bar-sub">Official CSWDO &amp; COA Compliant Relief Voucher • Order #{{ $order->id }}</div>
    </div>
    <div style="display: flex; align-items: center;">
      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Print / Save PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        ✕ Close
      </button>
    </div>
  </div>

  <div class="print-container">
    <!-- Official Letterhead -->
    <div class="letterhead">
      <div class="letterhead-top">Republic of the Philippines • City Government of Zamboanga</div>
      <h1>City Social Welfare &amp; Development Office (CSWDO)</h1>
      <h2>In Coordination with City Disaster Risk Reduction &amp; Management Office (CDRRMO)</h2>
      <div class="badge-report-type">Emergency Operations Center (EOC) — Relief Logistics Voucher</div>
    </div>

    <!-- Manifest Control & Status Grid -->
    <div class="manifest-meta-box">
      <div>
        <div class="meta-label">Manifest Control No.</div>
        <div class="meta-val meta-val-code">ZAM-LOGISTICS-{{ str_pad($order->id, 5, '0', STR_PAD_LEFT) }}</div>
        <div class="meta-label" style="margin-top: 8px;">Issuance Date &amp; Time</div>
        <div class="meta-val">{{ $order->created_at->format('F d, Y \a\t h:i A') }}</div>
      </div>
      <div style="text-align: right;">
        <div class="meta-label">Dispatch Order Status</div>
        <div style="margin-top: 4px;">
          @if($order->status === 'pending')
            <span class="status-badge status-pending">PENDING DISPATCH / PREPARATION</span>
          @elseif($order->status === 'in_transit')
            <span class="status-badge status-in_transit">IN TRANSIT (DISPATCHED)</span>
          @elseif($order->status === 'delivered')
            <span class="status-badge status-delivered">DELIVERED &amp; RECEIVED</span>
          @elseif($order->status === 'cancelled')
            <span class="status-badge status-cancelled">CANCELLED</span>
          @else
            <span class="status-badge">{{ strtoupper($order->status) }}</span>
          @endif
        </div>
        <div class="meta-label" style="margin-top: 8px;">Requisition Authority</div>
        <div class="meta-val">CSWDO Relief Operations Desk</div>
      </div>
    </div>

    <!-- Destination & Evacuation Shelter Info -->
    <div class="shelter-box">
      <div class="section-title">
        <span>1. Evacuation Shelter &amp; Beneficiary Profile</span>
      </div>
      <div class="shelter-grid">
        <div>
          <span class="meta-label">Target Shelter Center</span>
          <div class="meta-val">{{ $order->shelter->name ?? 'Designated Evacuation Shelter' }}</div>
        </div>
        <div>
          <span class="meta-label">Barangay Location</span>
          <div class="meta-val">Brgy. {{ $order->shelter->barangay ?? 'Zamboanga City' }}</div>
        </div>
        <div>
          <span class="meta-label">Current Evacuee Census</span>
          <div class="meta-val" style="color: #1e40af;">
            {{ number_format($order->shelter->current_occupancy ?? 0) }} Evacuees
            @if(!empty($order->shelter->max_capacity))
              <span style="font-size: 10px; color: #64748b; font-weight: normal;">(Cap: {{ number_format($order->shelter->max_capacity) }})</span>
            @endif
          </div>
        </div>
      </div>
    </div>

    <!-- Itemized Manifest Table -->
    <div class="shelter-box" style="padding-bottom: 4px;">
      <div class="section-title">
        <span>2. Approved Relief Goods &amp; Food Pack Allocation</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 36px;">#</th>
            <th>Stock Description &amp; Item Specification</th>
            <th>Category</th>
            <th class="text-center">Packaging Unit</th>
            <th class="text-right">Requisitioned Qty</th>
            <th class="text-center" style="width: 110px;">Loaded / Verified</th>
          </tr>
        </thead>
        <tbody>
          @php $totalDispatchedUnits = 0; @endphp
          @forelse($order->items as $idx => $it)
            @php
              $inv = $it->inventoryItem;
              $totalDispatchedUnits += $it->quantity;
            @endphp
            <tr>
              <td class="text-center" style="font-family: monospace; color: #64748b;">{{ $idx + 1 }}</td>
              <td style="font-weight: 700; color: #0f172a;">{{ $inv->item_name ?? 'Relief Item' }}</td>
              <td style="color: #475569; text-transform: capitalize;">{{ str_replace('_', ' ', $inv->category ?? 'General') }}</td>
              <td class="text-center" style="color: #475569;">{{ $inv->unit_type ?? 'units' }}</td>
              <td class="text-right" style="font-weight: 900; font-family: monospace; font-size: 13px; color: #0f172a;">
                {{ number_format($it->quantity) }}
              </td>
              <td class="text-center" style="color: #94a3b8; font-family: monospace; font-size: 10px;">
                [ &nbsp; ] Checked
              </td>
            </tr>
          @empty
            <tr>
              <td colspan="6" class="text-center" style="padding: 20px; color: #64748b; font-style: italic;">
                No itemized relief goods recorded for this order.
              </td>
            </tr>
          @endforelse
        </tbody>
        @if($order->items && $order->items->count() > 0)
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 800;">
              <td colspan="4" class="text-right" style="text-transform: uppercase; font-size: 10px; color: #475569;">
                Total Requisitioned Commodities ({{ $order->items->count() }} Line Items):
              </td>
              <td class="text-right" style="font-family: monospace; font-size: 13px; color: #1e40af; font-weight: 900;">
                {{ number_format($totalDispatchedUnits) }}
              </td>
              <td class="text-center" style="font-size: 10px; color: #64748b;">Total Units</td>
            </tr>
          </tfoot>
        @endif
      </table>
    </div>

    <!-- Road Clearance & Transport Advisory -->
    <div class="advisory-box">
      <div class="advisory-title">3. Transport Advisory &amp; Safe Logistics Route Directives</div>
      <div style="color: #78350f; line-height: 1.5;">
        @if(!empty($order->notes))
          <strong>Special Directives:</strong> {{ $order->notes }}
        @else
          <strong>Standard Route Protocol:</strong> Dispatch vehicle via verified arterial roads. Avoid low-elevation flood pathways and consult CDRRMO EOC Live Status Map before crossing river bridges. Ensure tarpaulin protection of food packs during transit.
        @endif
      </div>
      @if($order->assignee)
        <div style="margin-top: 6px; font-weight: 700; color: #92400e;">
          Designated Logistics Transporter / Driver: {{ $order->assignee->name }} ({{ $order->assignee->email }})
        </div>
      @endif
    </div>

    <!-- Official Custody Signatures Block (4 Boxes) -->
    <div class="avoid-break" style="margin-top: 20px;">
      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; text-align: center; letter-spacing: 0.5px; margin-bottom: 12px;">
        Official Custody Turnover &amp; COA Accountability Sign-off
      </div>
      <div class="signatures-grid">
        <div class="sign-box">
          <div class="sign-name">CDRRMO / CSWDO Officer</div>
          <div class="sign-role">Requisition Initiator</div>
          <div class="sign-space"></div>
          <div class="sign-note">Sign &amp; Date</div>
        </div>
        <div class="sign-box">
          <div class="sign-name">CSWDO Logistics Chief</div>
          <div class="sign-role">Approved &amp; Released</div>
          <div class="sign-space"></div>
          <div class="sign-note">Sign &amp; Date</div>
        </div>
        <div class="sign-box">
          <div class="sign-name">Logistics Driver</div>
          <div class="sign-role">Transport &amp; Custody</div>
          <div class="sign-space"></div>
          <div class="sign-note">Plate No. / Signature</div>
        </div>
        <div class="sign-box">
          <div class="sign-name">Shelter Camp Manager</div>
          <div class="sign-role">Received &amp; Verified Count</div>
          <div class="sign-space"></div>
          <div class="sign-note">Sign &amp; Date</div>
        </div>
      </div>
    </div>

    <!-- Report Footer -->
    <div class="report-footer">
      <span>EvacRoute Disaster Logistics Management System • Zamboanga City EOC • Republic Act 10121 Compliance</span>
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
