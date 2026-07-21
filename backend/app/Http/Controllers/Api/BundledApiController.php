<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvacuationLog;
use App\Models\Hazard;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\RoadMaintenance;
use App\Models\Shelter;
use Illuminate\Http\Request;

class BundledApiController extends Controller
{
    /**
     * Consolidate metrics and lists for the dashboard command center.
     */
    public function getDashboardOverview(Request $request)
    {
        // 1. All shelters with eager loaded active evacuation logs (N+1 fix)
        $shelters = Shelter::with(['evacuationLogs' => function ($query) {
            $query->whereNull('checked_out_at')->orderBy('checked_in_at', 'desc');
        }])->orderBy('status')->orderBy('name')->get();

        // 2. Active hazards
        $hazards = Hazard::where('is_active', true)->get();

        // 3. Top 5 recent evacuation logs for live feed
        $recentLogs = EvacuationLog::with(['familyProfile.user', 'shelter'])
            ->orderBy('checked_in_at', 'desc')
            ->take(5)
            ->get();

        // 4. Warehouse stock levels with related ration definitions
        $inventory = InventoryItem::with(['rationTemplateItems.template'])
            ->orderBy('item_name')
            ->get();

        return response()->json([
            'status' => 'success',
            'shelters' => $shelters,
            'hazards' => $hazards,
            'recent_logs' => $recentLogs,
            'inventory' => $inventory,
        ], 200);
    }

    /**
     * Consolidate coordinates and state for the live map control room.
     */
    public function getMapDashboard(Request $request)
    {
        // 1. Active shelters with eager loaded occupant logs (N+1 fix)
        $activeShelters = Shelter::with(['evacuationLogs' => function ($query) {
            $query->whereNull('checked_out_at');
        }])
            ->where('status', 'open')
            ->whereColumn('current_occupancy', '<', 'max_capacity')
            ->get();

        // 2. Active hazards
        $hazards = Hazard::where('is_active', true)->get();

        // 3. Active evacuee demographics by barangay (for GIS Heatmap)
        $demographics = \App\Models\EvacuationLog::whereNull('checked_out_at')
            ->join('family_profiles', 'evacuation_logs.family_profile_id', '=', 'family_profiles.id')
            ->select('family_profiles.barangay', \DB::raw('SUM(evacuation_logs.recorded_headcount) as total_evacuees'))
            ->groupBy('family_profiles.barangay')
            ->get();

        // 4. Active road maintenance blocks
        $roadMaintenances = \App\Models\RoadMaintenance::where('is_active', true)->get();

        return response()->json([
            'status' => 'success',
            'shelters' => $activeShelters,
            'hazards' => $hazards,
            'demographics' => $demographics,
            'road_maintenances' => $roadMaintenances,
        ], 200);
    }

    /**
     * Consolidate coordinates and state for the resident mobile app.
     */
    public function getResidentMapData(Request $request)
    {
        // 1. Fetch active shelters (open and occupancy < capacity)
        $shelters = Shelter::where('status', 'open')
            ->whereColumn('current_occupancy', '<', 'max_capacity')
            ->get();

        // 2. Fetch active hazards
        $hazards = Hazard::where('is_active', true)->get();

        // 3. P3: Fetch active road maintenance blocks so mobile can render them
        //    Returns only the fields needed for map rendering (no reporter PII)
        $roadMaintenances = RoadMaintenance::where('is_active', true)
            ->select(
                'id', 'description',
                'start_latitude', 'start_longitude',
                'end_latitude', 'end_longitude',
                'estimated_duration_hours', 'created_at'
            )
            ->get();

        return response()->json([
            'status'            => 'success',
            'shelters'          => $shelters,
            'hazards'           => $hazards,
            'road_maintenances' => $roadMaintenances,
        ], 200);
    }

    /**
     * Consolidate warehouse inventory and ration templates.
     */
    public function getInventoryDashboard(Request $request)
    {
        // 1. Current stock items
        $inventory = InventoryItem::orderBy('item_name')->get();

        // 2. All ration templates with their item definitions
        $templates = RationTemplate::with('items.inventoryItem')
            ->orderBy('is_active', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'inventory' => $inventory,
            'templates' => $templates,
        ], 200);
    }

    /**
     * Consolidate shelters and active/all ration templates for shelter management.
     */
    public function getSheltersDashboard(Request $request)
    {
        // 1. All shelters
        $shelters = Shelter::orderBy('status')->orderBy('name')->get();

        // 2. All ration templates with their item definitions
        $templates = RationTemplate::with('items.inventoryItem')
            ->orderBy('is_active', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'shelters' => $shelters,
            'templates' => $templates,
        ], 200);
    }

    /**
     * Proactive Barangay Relief Summary & Pre-Staging Supply Aggregator (Privacy-Preserving / Zero Background GPS).
     * Now includes +20% Safety Buffer Margin & Emergency Overflow Reserve calculation.
     * Route: GET /api/lgu/barangay-relief-summary/{barangay}
     */
    public function getBarangayReliefSummary(Request $request, $barangay)
    {
        $families = \App\Models\FamilyProfile::where('barangay', 'like', "%{$barangay}%")->get();
        $totalFamilies = $families->count();
        $totalHeadcount = $families->sum('headcount');

        // Configurable Contingency Reserve Buffer (Default 20% extra to handle unannounced overflow / walk-ins)
        $bufferPercentage = (int) $request->query('buffer_percentage', 20);
        $bufferHeadcount = (int) ceil($totalHeadcount * ($bufferPercentage / 100));
        $recommendedTotalHeadcount = $totalHeadcount + $bufferHeadcount;

        $activeTemplate = RationTemplate::with('items.inventoryItem')->where('is_active', true)->first();

        $requiredSupplies = [];
        if ($activeTemplate) {
            foreach ($activeTemplate->items as $item) {
                $baseQty = $item->quantity_per_head * $totalHeadcount;
                $bufferQty = $item->quantity_per_head * $bufferHeadcount;
                $recommendedTotalQty = $item->quantity_per_head * $recommendedTotalHeadcount;

                $requiredSupplies[] = [
                    'item_name' => $item->inventoryItem?->item_name ?? 'Unknown Item',
                    'quantity_per_head' => $item->quantity_per_head,
                    'base_required' => $baseQty,
                    'safety_buffer_amount' => $bufferQty,
                    'recommended_total_amount' => $recommendedTotalQty,
                    'unit_type' => $item->inventoryItem?->unit_type ?? '',
                ];
            }
        }

        return response()->json([
            'status' => 'success',
            'barangay' => $barangay,
            'total_registered_families' => $totalFamilies,
            'total_affected_headcount' => $totalHeadcount,
            'contingency_buffer_percentage' => $bufferPercentage,
            'safety_buffer_headcount' => $bufferHeadcount,
            'recommended_total_headcount' => $recommendedTotalHeadcount,
            'active_ration_template' => $activeTemplate?->name ?? 'No active template',
            'estimated_supplies_needed' => $requiredSupplies,
        ], 200);
    }
}
