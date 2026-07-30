<?php

namespace App\Http\Controllers\Api;

use App\Events\DispatchOrderCreated;
use App\Http\Controllers\Controller;
use App\Models\DispatchOrder;
use App\Models\DispatchOrderItem;
use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReliefClaimController extends Controller
{
    /**
     * Phase 2: Resident scans QR code at the relief distribution point.
     * Route: POST /api/relief/claim  (role:admin,lgu_staff)
     */
    public function claim(Request $request)
    {
        $request->validate([
            'qr_code_hash' => 'required|string',
        ]);

        return DB::transaction(function () use ($request) {
            $family = FamilyProfile::verifyTotpPayload($request->qr_code_hash, true);

            // Must be checked in to a shelter
            $activeLog = EvacuationLog::where('family_profile_id', $family->id)
                ->whereNull('checked_out_at')
                ->lockForUpdate()
                ->first();

            if (! $activeLog) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Family is not currently checked into any shelter.',
                ], 422);
            }

            // Prevent double-claiming on the same evacuation log
            if ($activeLog->ration_claimed) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ration already claimed for this evacuation period.',
                    'claimed_at' => $activeLog->ration_claimed_at?->toIso8601String(),
                    'family_name' => $family->family_name,
                    'headcount' => $activeLog->recorded_headcount,
                ], 409);
            }

            $activeRation = RationTemplate::with('items.inventoryItem')->where('is_active', true)->first();
            $claimedItems = [];
            $hasShortage = false;

            if ($activeRation && $activeRation->items->isNotEmpty()) {
                // Deadlock Elimination: Sort inventory IDs numerically before locking
                $inventoryItemIds = $activeRation->items->pluck('inventory_item_id')->unique()->sort()->toArray();
                $inventoryItems = InventoryItem::lockForUpdate()
                    ->whereIn('id', $inventoryItemIds)
                    ->get()
                    ->keyBy('id');

                $shortageItems = [];

                foreach ($activeRation->items as $rationItem) {
                    $requestedQty = $rationItem->quantity_per_head * $family->headcount;
                    $inventory = $inventoryItems->get($rationItem->inventory_item_id);

                    if ($inventory) {
                        $availableStock = $inventory->total_stock;
                        $issuedQty = min($requestedQty, $availableStock);
                        $shortageQty = max(0, $requestedQty - $issuedQty);

                        if ($issuedQty > 0) {
                            $inventory->decrement('total_stock', $issuedQty);
                        }

                        if ($shortageQty > 0) {
                            $hasShortage = true;
                            $shortageItems[] = [
                                'inventory_item_id' => $inventory->id,
                                'item_name' => $inventory->item_name,
                                'shortage_quantity' => $shortageQty,
                            ];
                        }

                        $claimedItems[] = [
                            'item_name' => $inventory->item_name,
                            'quantity' => $issuedQty,
                            'shortage' => $shortageQty,
                            'unit_type' => $inventory->unit_type ?? '',
                        ];
                    }
                }

                // Partial Stock Fulfillment: Auto-generate dispatch order for replenishment
                if ($hasShortage && ! empty($shortageItems)) {
                    $orderNumber = 'DSP-AUTO-'.strtoupper(bin2hex(random_bytes(3)));
                    $dispatchOrder = DispatchOrder::create([
                        'order_number' => $orderNumber,
                        'shelter_id' => $activeLog->shelter_id,
                        'requested_by' => auth()->id() ?? 1,
                        'status' => 'pending',
                        'priority' => 'high',
                        'notes' => 'Urgent auto-generated replenishment for partial ration fulfillment at Shelter #'.$activeLog->shelter_id,
                    ]);

                    foreach ($shortageItems as $sItem) {
                        DispatchOrderItem::create([
                            'dispatch_order_id' => $dispatchOrder->id,
                            'inventory_item_id' => $sItem['inventory_item_id'],
                            'requested_quantity' => $sItem['shortage_quantity'],
                        ]);
                    }

                    event(new DispatchOrderCreated($dispatchOrder));
                }
            }

            $activeLog->update([
                'ration_claimed' => true,
                'ration_claimed_at' => now(),
                'claimed_ration_items' => $claimedItems,
            ]);

            $message = $hasShortage
                ? 'Ration claim partially fulfilled. Auto-generated logistics replenishment dispatch order sent to central warehouse.'
                : 'Ration claim recorded successfully.';

            return response()->json([
                'status' => 'success',
                'message' => $message,
                'has_shortage' => $hasShortage,
                'family_name' => $family->family_name,
                'headcount' => $activeLog->recorded_headcount,
                'shelter_id' => $activeLog->shelter_id,
                'claimed_at' => $activeLog->ration_claimed_at->toIso8601String(),
            ]);
        });
    }

    /**
     * Check a family's current claim status.
     * Route: GET /api/relief/status?qr_code_hash=xxx
     */
    public function status(Request $request)
    {
        $request->validate([
            'qr_code_hash' => 'required|string',
        ]);

        // Non-locking verification for simple status check
        $family = FamilyProfile::verifyTotpPayload($request->qr_code_hash, false);

        $activeLog = EvacuationLog::where('family_profile_id', $family->id)
            ->whereNull('checked_out_at')
            ->with('shelter:id,name')
            ->first();

        return response()->json([
            'status' => 'success',
            'family_name' => $family->family_name,
            'headcount' => $family->headcount,
            'checked_in' => (bool) $activeLog,
            'shelter' => $activeLog?->shelter?->name,
            'ration_claimed' => $activeLog?->ration_claimed ?? false,
            'claimed_at' => $activeLog?->ration_claimed_at?->toIso8601String(),
        ]);
    }
}
