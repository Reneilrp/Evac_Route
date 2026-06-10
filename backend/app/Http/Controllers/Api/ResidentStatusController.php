<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

        if ($log) {
            // Simulate the receipt generation based on active template
            $activeRation = RationTemplate::with('items.inventoryItem')->where('is_active', true)->first();

            $allocation = [];
            if ($activeRation) {
                foreach ($activeRation->items as $item) {
                    $inventory = $item->inventoryItem;
                    if ($inventory) {
                        $allocation[] = [
                            'name' => $inventory->item_name,
                            'quantity' => $item->quantity_per_head * $family->headcount,
                            'unit' => $inventory->unit_type,
                        ];
                    }
                }
            } else {
                // Mock fallback if no active template
                $allocation[] = [
                    'name' => 'Relief Goods',
                    'quantity' => 1 * $family->headcount,
                    'unit' => 'packs',
                ];
            }

            return response()->json([
                'status' => 'safe',
                'shelter_name' => $log->shelter?->name ?? 'Assigned Shelter', // null-safe: shelter may be deleted
                'allocation' => $allocation,
                'template_name' => $activeRation ? $activeRation->name : 'Emergency Kit',
            ]);
        }

        return response()->json([
            'status' => 'danger',
            'message' => 'Awaiting Evacuation',
        ]);
    }
}
