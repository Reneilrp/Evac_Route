<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BroadcastAlert;
use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\RationTemplate;
use Illuminate\Http\Request;

class ResidentStatusController extends Controller
{
    public function myStatus(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'resident') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $family = FamilyProfile::where('user_id', $user->id)->first();
        if (! $family) {
            return response()->json(['status' => 'danger', 'message' => 'No profile found']);
        }

        // Fetch the ACTIVE log (no check-out, most recent) — supports shelter transfers
        $log = EvacuationLog::with(['shelter'])
            ->where('family_profile_id', $family->id)
            ->whereNull('checked_out_at')
            ->latest('checked_in_at')
            ->first();

        // Fetch active alerts targeted to this resident's barangay or all residents
        $barangay = $family->barangay;
        $alertsQuery = BroadcastAlert::where('scope', 'all');
        if ($barangay) {
            $alertsQuery->orWhere(function ($q) use ($barangay) {
                $q->where('scope', 'barangay')
                    ->where('barangay', $barangay);
            });
        }
        $activeAlerts = $alertsQuery->orderBy('created_at', 'desc')->get();

        if ($log) {
            // Simulate the receipt generation based on active template
            $activeRation = RationTemplate::with('items.inventoryItem')->where('is_active', true)->first();

            $allocation = [];
            if ($activeRation) {
                foreach ($activeRation->items as $item) {
                    $inventory = $item->inventoryItem;
                    if ($inventory) {
                        if ($item->allocation_type === 'per_family') {
                            $multiplier = 1;
                        } elseif ($item->allocation_type === 'per_female') {
                            $femaleCount = (int) ($family->female_count ?? ceil((int) $family->headcount / 2));
                            $multiplier = max(1, $femaleCount);
                        } else {
                            $multiplier = max(1, (int) $family->headcount);
                        }

                        $allocation[] = [
                            'name' => $inventory->item_name,
                            'quantity' => $item->quantity_per_head * $multiplier,
                            'unit' => $inventory->unit_type,
                            'allocation_type' => $item->allocation_type,
                        ];
                    }
                }
            } else {
                // Mock fallback if no active template
                $allocation[] = [
                    'name' => 'Relief Goods',
                    'quantity' => 1 * $family->headcount,
                    'unit' => 'packs',
                    'allocation_type' => 'per_family',
                ];
            }

            return response()->json([
                'status' => 'safe',
                'relief_status' => $log->ration_claimed ? 'claimed' : 'pending',
                'ration_claimed' => (bool) $log->ration_claimed,
                'has_claimed' => (bool) $log->ration_claimed,
                'shelter_name' => $log->shelter?->name ?? 'Assigned Shelter', // null-safe: shelter may be deleted
                'allocation' => $allocation,
                'claimed_ration_items' => $log->claimed_ration_items ?? $allocation,
                'nfi_items_claimed' => $log->nfi_items_claimed ?? [],
                'checked_in_at' => $log->checked_in_at?->toIso8601String(),
                'recorded_headcount' => $log->actual_headcount ?? $log->recorded_headcount ?? $family->headcount,
                'template_name' => $activeRation ? $activeRation->name : 'Emergency Kit',
                'active_alerts' => $activeAlerts,
            ]);
        }

        return response()->json([
            'status' => 'danger',
            'message' => 'Awaiting Evacuation',
            'active_alerts' => $activeAlerts,
        ]);
    }
}
