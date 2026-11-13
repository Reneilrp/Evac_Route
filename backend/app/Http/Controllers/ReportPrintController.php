<?php

namespace App\Http\Controllers;

use App\Models\DispatchOrder;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\Shelter;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class ReportPrintController extends Controller
{
    /**
     * Authenticate report request via Sanctum bearer token, query string token, or session.
     */
    protected function authenticateReportUser(Request $request)
    {
        // 1. Check if user already authenticated via session/cookie
        $user = $request->user();

        // 2. If not, try query string token (used when opening in a new tab)
        if (!$user && $request->has('token')) {
            $tokenString = $request->query('token');
            $accessToken = PersonalAccessToken::findToken($tokenString);
            if ($accessToken) {
                $user = $accessToken->tokenable;
            }
        }

        // 3. Fallback to Bearer header
        if (!$user && $request->bearerToken()) {
            $accessToken = PersonalAccessToken::findToken($request->bearerToken());
            if ($accessToken) {
                $user = $accessToken->tokenable;
            }
        }

        if (!$user || !in_array($user->role, ['admin', 'lgu_staff'])) {
            abort(403, 'Unauthorized access to official CSWDO Disaster Relief report. Please log in with authorized credentials.');
        }

        return $user;
    }

    /**
     * Official CSWDO Relief Stock Monitoring & Inventory Audit Report (Blade).
     */
    public function printStockReport(Request $request)
    {
        $this->authenticateReportUser($request);

        $items = InventoryItem::orderBy('item_name')->get();
        $totalSKUs = $items->count();
        $totalPhysicalStock = $items->sum('total_stock');
        $totalReservedStock = $items->sum('reserved_quantity');
        $totalAvailableStock = $items->sum(fn ($i) => $i->available_stock);
        $criticalItems = $items->filter(fn ($i) => $i->available_stock < 200)->count();

        $generatedAt = now();

        return view('reports.stock_report', compact(
            'items',
            'totalSKUs',
            'totalPhysicalStock',
            'totalReservedStock',
            'totalAvailableStock',
            'criticalItems',
            'generatedAt'
        ));
    }

    /**
     * Official CSWDO Citywide Evacuation Shelters & Capacity Logistical Audit Report (Blade).
     */
    public function printShelterCapacityReport(Request $request)
    {
        $this->authenticateReportUser($request);

        $shelters = Shelter::orderBy('name')->get();
        $activeTemplate = RationTemplate::with('items.inventoryItem')
            ->where('is_active', true)
            ->first() ?? RationTemplate::with('items.inventoryItem')->first();

        $planningMode = $request->query('mode', 'surge'); // 'surge' or 'capacity'
        $totalShelters = $shelters->count();
        $totalCapacity = $shelters->sum('max_capacity');
        $totalOccupancy = $shelters->sum('current_occupancy');
        $overallUtilization = $totalCapacity > 0 ? round(($totalOccupancy / $totalCapacity) * 100, 1) : 0;

        $generatedAt = now();

        return view('reports.shelter_capacity_report', compact(
            'shelters',
            'activeTemplate',
            'planningMode',
            'totalShelters',
            'totalCapacity',
            'totalOccupancy',
            'overallUtilization',
            'generatedAt'
        ));
    }

    /**
     * Official CSWDO Single Shelter Relief Allocation & Dispatch Manifest Overview (Blade).
     */
    public function printShelterRationReport(Request $request, $id)
    {
        $this->authenticateReportUser($request);

        $shelter = Shelter::findOrFail($id);
        $activeTemplate = RationTemplate::with('items.inventoryItem')
            ->where('is_active', true)
            ->first() ?? RationTemplate::with('items.inventoryItem')->first();

        $inventoryItems = InventoryItem::all()->keyBy('id');
        $sizingMode = $request->query('mode', $shelter->current_occupancy > 0 ? 'occupancy' : 'capacity');
        $bufferPercent = (int) $request->query('buffer', 20);

        $actualOccupancy = (int) $shelter->current_occupancy;
        $maxCapacity = (int) $shelter->max_capacity;
        $isOccupancyBase = ($sizingMode === 'occupancy');
        $effectivePax = $isOccupancyBase ? ($actualOccupancy > 0 ? $actualOccupancy : 1) : $maxCapacity;
        $calculatedBufferPax = (int) ceil($effectivePax * ($bufferPercent / 100));

        $generatedAt = now();

        return view('reports.shelter_ration_report', compact(
            'shelter',
            'activeTemplate',
            'inventoryItems',
            'sizingMode',
            'bufferPercent',
            'actualOccupancy',
            'maxCapacity',
            'isOccupancyBase',
            'effectivePax',
            'calculatedBufferPax',
            'generatedAt'
        ));
    }

    /**
     * Official CSWDO Disaster Relief Requisition & Dispatch Manifest Report (Blade).
     */
    public function printDispatchManifestReport(Request $request, $id)
    {
        $this->authenticateReportUser($request);

        $order = DispatchOrder::with([
            'items.inventoryItem',
            'shelter',
            'creator',
            'assignee',
        ])->findOrFail($id);

        $generatedAt = now();

        return view('reports.dispatch_manifest_report', compact(
            'order',
            'generatedAt'
        ));
    }
}
