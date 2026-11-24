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

        try {
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
                        if ($rationItem->allocation_type === 'per_family') {
                            $multiplier = 1;
                        } elseif ($rationItem->allocation_type === 'per_female') {
                            $femaleCount = (int) ($family->female_count ?? ceil((int) $family->headcount / 2));
                            $multiplier = max(1, $femaleCount);
                        } else {
                            $multiplier = max(1, (int) $family->headcount);
                        }
                        $requestedQty = $rationItem->quantity_per_head * $multiplier;
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
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Resident QR code not found in registry.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
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

        try {
            // Non-locking verification for simple status check
            $family = FamilyProfile::verifyTotpPayload($request->qr_code_hash, false);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Resident QR code not found in registry.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }

        $activeLog = EvacuationLog::where('family_profile_id', $family->id)
            ->whereNull('checked_out_at')
            ->with('shelter:id,name')
            ->first();

        // Anti-duplication check: Check if household claimed rations today
        $todayClaim = EvacuationLog::where('family_profile_id', $family->id)
            ->whereDate('created_at', today())
            ->where('ration_claimed', true)
            ->with('shelter:id,name')
            ->first();

        $hasClaimed = ($todayClaim !== null);
        $duplicateWarning = null;
        if ($hasClaimed) {
            $claimShelterName = $todayClaim->shelter?->name ?? 'Another Evacuation Facility';
            $claimTime = $todayClaim->created_at ? $todayClaim->created_at->format('h:i A') : 'earlier today';
            $duplicateWarning = "⚠️ DUPLICATE CLAIM WARNING: This IDP household has already claimed relief rations today at {$claimShelterName} ({$claimTime}).";
        }

        return response()->json([
            'status' => 'success',
            'qr_code_hash' => $family->qr_code_hash,
            'family_id' => $family->id,
            'family_name' => $family->family_name,
            'headcount' => $family->scanned_headcount ?? $family->headcount,
            'checked_in' => (bool) $activeLog,
            'log_id' => $activeLog?->id,
            'shelter_id' => $activeLog?->shelter_id,
            'actual_headcount' => $activeLog?->actual_headcount ?? $family->scanned_headcount ?? $family->headcount,
            'is_temporary_offsite' => (bool) ($activeLog?->is_temporary_offsite ?? false),
            'temporary_offsite_at' => $activeLog?->temporary_offsite_at?->toIso8601String(),
            'walk_in_voucher' => $activeLog?->walk_in_voucher,
            'vulnerabilities' => $activeLog?->vulnerabilities ?? [],
            'shelter' => $activeLog?->shelter?->name,
            'ration_claimed' => $activeLog?->ration_claimed ?? false,
            'has_claimed' => $hasClaimed,
            'is_duplicate_claim' => $hasClaimed,
            'duplicate_warning' => $duplicateWarning,
            'claimed_at' => $todayClaim ? $todayClaim->created_at?->toIso8601String() : $activeLog?->ration_claimed_at?->toIso8601String(),
        ]);
    }
}
