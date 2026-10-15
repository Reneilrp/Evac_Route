<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BroadcastAlert;
use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Hazard;
use App\Models\InventoryItem;
use App\Models\PendingIncident;
use App\Models\RationTemplate;
use App\Models\RescueUnit;
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

        // 5. CDRRMO Tactical Command Metrics
        $pendingIncidentsCount = PendingIncident::where('status', 'pending')->count();
        $approvedIncidentsCount = PendingIncident::where('status', 'approved')->count();
        $rejectedIncidentsCount = PendingIncident::where('status', 'rejected')->count();
        $totalIncidentsCount = PendingIncident::count();

        $rescueUnits = RescueUnit::with('crewMembers')->get();
        $rescueStandbyCount = $rescueUnits->where('status', 'standby')->count();
        $rescueDispatchedCount = $rescueUnits->where('status', 'dispatched')->count();
        $rescueMaintenanceCount = $rescueUnits->where('status', 'maintenance')->count();

        $recentIncidents = PendingIncident::with('reporter:id,name')
            ->orderBy('created_at', 'desc')
            ->take(6)
            ->get();

        $alertsCount = BroadcastAlert::count();

        return response()->json([
            'status' => 'success',
            'shelters' => $shelters,
            'hazards' => $hazards,
            'recent_logs' => $recentLogs,
            'inventory' => $inventory,
            'tactical' => [
                'pending_incidents' => $pendingIncidentsCount,
                'approved_incidents' => $approvedIncidentsCount,
                'rejected_incidents' => $rejectedIncidentsCount,
                'total_incidents' => $totalIncidentsCount,
                'rescue_standby' => $rescueStandbyCount,
                'rescue_dispatched' => $rescueDispatchedCount,
                'rescue_maintenance' => $rescueMaintenanceCount,
                'rescue_total' => $rescueUnits->count(),
                'recent_incidents' => $recentIncidents,
                'alerts_count' => $alertsCount,
            ],
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
            ->whereIn('status', ['open', 'full'])
            ->get();

        // 2. Active hazards
        $hazards = Hazard::where('is_active', true)->get();

        // 3. Active evacuee demographics by barangay (for GIS Heatmap)
        $demographics = EvacuationLog::whereNull('checked_out_at')
            ->join('family_profiles', 'evacuation_logs.family_profile_id', '=', 'family_profiles.id')
            ->select('family_profiles.barangay', \DB::raw('SUM(evacuation_logs.recorded_headcount) as total_evacuees'))
            ->groupBy('family_profiles.barangay')
            ->get();

        // 4. Active road maintenance blocks
        $roadMaintenances = RoadMaintenance::where('is_active', true)->get();

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
        // 1. Fetch operational shelters (open or full/overflow state)
        $shelters = Shelter::whereIn('status', ['open', 'full'])->get();

        // 2. Fetch active hazards (excluding reporter PII)
        $hazards = Hazard::where('is_active', true)
            ->select('id', 'name', 'latitude', 'longitude', 'radius_meters', 'hazard_type', 'severity_level', 'is_fixed_flood_spot', 'is_active', 'created_at')
            ->get();

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
            'status' => 'success',
            'shelters' => $shelters,
            'hazards' => $hazards,
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

        // 3. Central inventory stock levels with reserved_quantity and available_stock
        $inventory = InventoryItem::orderBy('item_name')->get();

        return response()->json([
            'status' => 'success',
            'shelters' => $shelters,
            'templates' => $templates,
            'inventory' => $inventory,
        ], 200);
    }

    /**
     * Proactive Barangay Relief Summary & Pre-Staging Supply Aggregator (Privacy-Preserving / Zero Background GPS).
     * Now includes +20% Safety Buffer Margin & Emergency Overflow Reserve calculation.
     * Route: GET /api/lgu/barangay-relief-summary/{barangay}
     */
    public function getBarangayReliefSummary(Request $request, $barangay)
    {
        $families = FamilyProfile::where('barangay', 'like', "%{$barangay}%")->get();
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
                    'inventory_item_id' => $item->inventory_item_id,
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

    /**
     * Proactive Population-at-Risk & Shelter Capacity Deficit Engine.
     * Route: GET /api/lgu/population-at-risk/{barangay}
     */
    public function getPopulationAtRisk(Request $request, $barangay)
    {
        $families = FamilyProfile::where('barangay', 'like', "%{$barangay}%")->get();
        $totalHouseholds = $families->count();
        $totalHeadcount = (int) $families->sum('headcount');

        // Transportation distribution for logistics & staging planning
        $transportBreakdown = [
            'pedestrian' => $families->where('transportation_mode', 'pedestrian')->count(),
            '2_wheel' => $families->where('transportation_mode', '2_wheel')->count(),
            '4_wheel' => $families->where('transportation_mode', '4_wheel')->count(),
            'unspecified' => $families->whereNull('transportation_mode')->count(),
        ];

        // Match against shelters serving this barangay or in the immediate area
        $shelters = Shelter::where(function ($query) use ($barangay) {
            $query->where('barangay', 'like', "%{$barangay}%")
                ->orWhere('name', 'like', "%{$barangay}%");
        })->get();

        // If no shelters explicitly tagged with this barangay, provide all open/operational shelters
        if ($shelters->isEmpty()) {
            $shelters = Shelter::whereIn('status', ['open', 'full'])->get();
        }

        $totalCapacity = (int) $shelters->sum('max_capacity');
        $currentOccupancy = (int) $shelters->sum('current_occupancy');
        $availableCapacity = max(0, $totalCapacity - $currentOccupancy);

        $netBalance = $availableCapacity - $totalHeadcount;
        $hasDeficit = $netBalance < 0;
        $deficitAmount = $hasDeficit ? abs($netBalance) : 0;

        return response()->json([
            'status' => 'success',
            'barangay' => $barangay,
            'risk_summary' => [
                'total_registered_households' => $totalHouseholds,
                'total_registered_headcount' => $totalHeadcount,
                'transportation_modes' => $transportBreakdown,
            ],
            'shelter_feasibility' => [
                'matched_shelters_count' => $shelters->count(),
                'total_shelter_capacity' => $totalCapacity,
                'current_shelter_occupancy' => $currentOccupancy,
                'available_shelter_capacity' => $availableCapacity,
                'capacity_surplus_or_deficit' => $netBalance,
                'has_deficit' => $hasDeficit,
                'deficit_amount' => $deficitAmount,
                'recommendation' => $hasDeficit
                    ? "SHELTER DEFICIT ALERT: Requires opening secondary overflow shelter for {$deficitAmount} evacuees."
                    : "SHELTER CAPACITY ADEQUATE: Surplus of {$netBalance} beds available in designated shelters.",
                'shelters' => $shelters->map(function ($s) {
                    return [
                        'id' => $s->id,
                        'name' => $s->name,
                        'barangay' => $s->barangay,
                        'status' => $s->status,
                        'max_capacity' => $s->max_capacity,
                        'current_occupancy' => $s->current_occupancy,
                        'available_spaces' => max(0, $s->max_capacity - $s->current_occupancy),
                    ];
                }),
            ],
        ], 200);
    }
}
