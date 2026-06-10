<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Shelter;
use App\Models\Hazard;
use App\Models\EvacuationLog;
use App\Models\InventoryItem;
use App\Models\RationTemplate;

class BundledApiController extends Controller
{
    /**
     * Consolidate metrics and lists for the dashboard command center.
     */
    public function getDashboardOverview(Request $request)
    {
        // 1. All shelters with eager loaded active evacuation logs (N+1 fix)
        $shelters = Shelter::with(['evacuationLogs' => function($query) {
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
        $activeShelters = Shelter::with(['evacuationLogs' => function($query) {
            $query->whereNull('checked_out_at');
        }])
        ->where('status', 'open')
        ->whereColumn('current_occupancy', '<', 'max_capacity')
        ->get();

        // 2. Active hazards
        $hazards = Hazard::where('is_active', true)->get();

        return response()->json([
            'status' => 'success',
            'shelters' => $activeShelters,
            'hazards' => $hazards,
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
}
