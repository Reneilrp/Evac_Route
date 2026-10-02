<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BroadcastAlert;
use App\Models\DispatchOrder;
use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Hazard;
use App\Models\InventoryItem;
use App\Models\PendingIncident;
use App\Models\RescueMission;
use App\Models\RescueUnit;
use App\Models\Setting;
use App\Models\Shelter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SitRepController extends Controller
{
    /**
     * Generate an aggregated NDRRMC / DROMIC Disaster Situation Report (SitRep).
     * Route: GET /api/reports/sitrep
     */
    public function index(Request $request)
    {
        // 1. Emergency Setting & Metadata
        $settings = Setting::all()->pluck('value', 'key');
        $isEmergencyActive = filter_var($settings->get('master_emergency_active', true), FILTER_VALIDATE_BOOLEAN);
        $emergencyTitle = $settings->get('active_emergency_title', 'ACTIVE EMERGENCY DISASTER RESPONSE MODE');
        $disasterType = $settings->get('active_disaster_type', 'all');

        // 2. Incident & Hazard Overview
        $activeHazards = Hazard::where('is_active', true)->get();
        $pendingIncidentsCount = PendingIncident::where('status', 'pending')->count();
        $verifiedIncidentsCount = PendingIncident::where('status', 'approved')->count();
        $totalIncidentsCount = PendingIncident::count();

        // 3. Affected Population & Evacuees
        $totalRegisteredFamilies = FamilyProfile::count();
        $totalIndividuals = FamilyProfile::sum('headcount') ?: 0;

        // Currently evacuated families (inside active evacuation centers)
        $activeEvacLogs = EvacuationLog::with('familyProfile', 'shelter')
            ->whereNull('checked_out_at')
            ->get();
        
        $evacuatedFamiliesCount = $activeEvacLogs->count();
        $evacuatedIndividualsCount = $activeEvacLogs->sum(function ($log) {
            return $log->familyProfile->headcount ?? 1;
        });

        // 4. Shelter Capacity & CCCM
        $shelters = Shelter::all();
        $totalShelterCapacity = $shelters->sum('max_capacity');
        $totalCurrentOccupancy = $shelters->sum('current_occupancy');
        $activeSheltersCount = $shelters->where('status', 'open')->count();
        $fullSheltersCount = $shelters->where('status', 'full')->count();
        
        $capacityUtilization = $totalShelterCapacity > 0
            ? round(($totalCurrentOccupancy / $totalShelterCapacity) * 100, 1)
            : 0;

        // Breakdown by Barangay
        $barangayBreakdown = Shelter::select(
            'barangay',
            DB::raw('COUNT(id) as total_shelters'),
            DB::raw('SUM(current_occupancy) as evacuees_inside'),
            DB::raw('SUM(max_capacity) as capacity')
        )
            ->groupBy('barangay')
            ->orderBy('evacuees_inside', 'desc')
            ->get();

        // 5. Search, Rescue, and Retrieval (SRR) Operations
        $rescueUnits = RescueUnit::with('crewMembers')->get();
        $totalUnits = $rescueUnits->count();
        $dispatchedUnits = $rescueUnits->where('status', 'dispatched')->count();
        $standbyUnits = $rescueUnits->where('status', 'standby')->count();

        $missions = RescueMission::all();
        $totalMissions = $missions->count();
        $ongoingMissions = $missions->whereIn('status', ['dispatched', 'in_progress'])->count();
        $completedMissions = $missions->where('status', 'completed')->count();
        $rescuedIndividuals = $missions->where('status', 'completed')->sum('rescued_count') ?: 0;

        // 6. Food & Non-Food Items (FNFI) Relief Logistics
        $inventoryItems = InventoryItem::all();
        $totalStockItems = $inventoryItems->count();
        $criticalStockItems = $inventoryItems->where('current_stock', '<=', 100)->count();

        $dispatchOrders = DispatchOrder::all();
        $totalDispatches = $dispatchOrders->count();
        $completedDispatches = $dispatchOrders->where('status', 'delivered')->count();
        $inTransitDispatches = $dispatchOrders->where('status', 'in_transit')->count();

        $totalReliefClaims = EvacuationLog::where('ration_claimed', true)->count();

        // 7. Recent Broadcast Warnings
        $recentAlerts = BroadcastAlert::orderBy('created_at', 'desc')->take(3)->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'meta' => [
                    'report_title' => 'SITUATION REPORT (SitRep) & DROMIC CONSOLIDATED OVERVIEW',
                    'lgu_name' => 'City Government of Zamboanga',
                    'council' => 'City Disaster Risk Reduction & Management Council (CDRRMC)',
                    'prepared_by' => auth()->user()->name ?? 'System Administrator',
                    'prepared_by_role' => auth()->user()->role ?? 'admin',
                    'generated_at' => now()->toDateTimeString(),
                    'master_emergency_active' => $isEmergencyActive,
                    'emergency_title' => $emergencyTitle,
                    'disaster_focus' => $disasterType,
                ],
                'hazards_summary' => [
                    'active_hazards_count' => $activeHazards->count(),
                    'verified_incidents' => $verifiedIncidentsCount,
                    'pending_incidents' => $pendingIncidentsCount,
                    'total_incidents' => $totalIncidentsCount,
                    'recent_alerts' => $recentAlerts,
                ],
                'population_summary' => [
                    'total_registered_families' => $totalRegisteredFamilies,
                    'total_registered_individuals' => $totalIndividuals,
                    'evacuated_families_inside_ec' => $evacuatedFamiliesCount,
                    'evacuated_individuals_inside_ec' => $evacuatedIndividualsCount,
                ],
                'cccm_summary' => [
                    'active_evacuation_centers' => $activeSheltersCount,
                    'full_evacuation_centers' => $fullSheltersCount,
                    'total_shelters' => $shelters->count(),
                    'total_capacity' => $totalShelterCapacity,
                    'current_occupancy' => $totalCurrentOccupancy,
                    'utilization_rate_pct' => $capacityUtilization,
                    'barangay_breakdown' => $barangayBreakdown,
                ],
                'srr_summary' => [
                    'total_rescue_units' => $totalUnits,
                    'dispatched_units' => $dispatchedUnits,
                    'standby_units' => $standbyUnits,
                    'total_missions' => $totalMissions,
                    'ongoing_missions' => $ongoingMissions,
                    'completed_missions' => $completedMissions,
                    'rescued_individuals' => $rescuedIndividuals,
                ],
                'relief_summary' => [
                    'total_stock_commodities' => $totalStockItems,
                    'low_stock_alerts' => $criticalStockItems,
                    'total_dispatch_orders' => $totalDispatches,
                    'completed_dispatches' => $completedDispatches,
                    'in_transit_dispatches' => $inTransitDispatches,
                    'relief_rations_claimed' => $totalReliefClaims,
                ],
            ],
        ]);
    }
}
