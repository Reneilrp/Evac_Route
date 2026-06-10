<?php

namespace App\Http\Controllers\Api;

use App\Events\ShelterStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\InventoryItem;
use App\Models\RationTemplate;
use App\Models\Shelter;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CheckInController extends Controller
{
    /**
     * Handle resident arrival, capacity updates, and inventory deduction.
     * Route: POST /api/shelters/{shelter_id}/check-in
     */
    public function processCheckIn(Request $request, $shelter_id)
    {
        $request->validate([
            'qr_code_hash' => 'required|string|exists:family_profiles,qr_code_hash',
        ]);

        try {
            // Start the Database Transaction with 5 retry attempts for high concurrency
            $result = DB::transaction(function () use ($request, $shelter_id) {

                $family = FamilyProfile::where('qr_code_hash', $request->qr_code_hash)->firstOrFail();

                // Check if they are already checked into a shelter
                $activeLog = EvacuationLog::where('family_profile_id', $family->id)
                    ->whereNull('checked_out_at')
                    ->first();

                // Gather shelter IDs involved and lock them in sorted order to prevent deadlocks
                $shelterIds = collect([$shelter_id]);
                if ($activeLog) {
                    $shelterIds->push($activeLog->shelter_id);
                }
                $sortedShelterIds = $shelterIds->unique()->sort()->toArray();

                $lockedShelters = Shelter::lockForUpdate()
                    ->whereIn('id', $sortedShelterIds)
                    ->get()
                    ->keyBy('id');

                $shelter = $lockedShelters->get($shelter_id);
                if (! $shelter) {
                    throw new ModelNotFoundException('Shelter not found.');
                }

                if ($activeLog) {
                    // Check if they are checked into the CURRENT shelter
                    if ($activeLog->shelter_id == $shelter_id) {
                        // Perform checkout instead!
                        $shelter->current_occupancy -= $activeLog->recorded_headcount;
                        if ($shelter->current_occupancy < 0) {
                            $shelter->current_occupancy = 0;
                        }
                        if ($shelter->status === 'full' && $shelter->current_occupancy < $shelter->max_capacity) {
                            $shelter->status = 'open';
                        }
                        $shelter->save();
                        broadcast(new ShelterStatusUpdated($shelter));

                        $activeLog->save();

                        return [
                            'action' => 'checkout',
                            'shelter' => $shelter,
                            'log' => $activeLog,
                            'message' => 'Resident checked out successfully.',
                        ];
                    } else {
                        // Transfer shelter! Check out from old shelter first.
                        $oldShelter = $lockedShelters->get($activeLog->shelter_id);
                        if ($oldShelter) {
                            $oldShelter->current_occupancy -= $activeLog->recorded_headcount;
                            if ($oldShelter->current_occupancy < 0) {
                                $oldShelter->current_occupancy = 0;
                            }
                            if ($oldShelter->status === 'full' && $oldShelter->current_occupancy < $oldShelter->max_capacity) {
                                $oldShelter->status = 'open';
                            }
                            $oldShelter->save();
                            broadcast(new ShelterStatusUpdated($oldShelter));
                        }

                        $activeLog->checked_out_at = now();
                        $activeLog->save();

                        // Now check in to the new shelter
                        if ($shelter->status !== 'open') {
                            throw new \Exception('Target shelter is at maximum capacity.');
                        }

                        if ($shelter->current_occupancy + $family->headcount > $shelter->max_capacity) {
                            throw new \Exception('Target shelter has insufficient capacity.');
                        }

                        $shelter->current_occupancy += $family->headcount;
                        if ($shelter->current_occupancy >= $shelter->max_capacity) {
                            $shelter->status = 'full';
                        }
                        $shelter->save();
                        broadcast(new ShelterStatusUpdated($shelter));

                        // Allocate rations (Eager loaded & locked in sorted order to prevent deadlocks)
                        $activeRation = RationTemplate::with('items')->where('is_active', true)->first();
                        if ($activeRation && $activeRation->items->isNotEmpty()) {
                            $inventoryItemIds = $activeRation->items->pluck('inventory_item_id')->unique()->sort()->toArray();
                            $inventoryItems = InventoryItem::lockForUpdate()->whereIn('id', $inventoryItemIds)->get()->keyBy('id');

                            foreach ($activeRation->items as $rationItem) {
                                $totalDeduction = $rationItem->quantity_per_head * $family->headcount;
                                $inventory = $inventoryItems->get($rationItem->inventory_item_id);

                                if ($inventory && $inventory->total_stock >= $totalDeduction) {
                                    $inventory->decrement('total_stock', $totalDeduction);
                                } else {
                                    $itemName = $inventory ? $inventory->item_name : 'Unknown Item';
                                    throw new \Exception("Insufficient inventory stock for {$itemName}.");
                                }
                            }
                        }

                        $newLog = EvacuationLog::create([
                            'family_profile_id' => $family->id,
                            'shelter_id' => $shelter->id,
                            'recorded_headcount' => $family->headcount,
                            'ration_claimed' => $activeRation !== null,
                            'checked_in_at' => now(),
                        ]);

                        return [
                            'action' => 'transfer',
                            'shelter' => $shelter,
                            'log' => $newLog,
                            'ration_applied' => $activeRation ? $activeRation->name : 'No active ration template.',
                            'message' => 'Resident transferred and checked in.',
                        ];
                    }
                }

                // Prevent checking into a full shelter
                if ($shelter->status !== 'open') {
                    throw new \Exception('Shelter is already at maximum capacity.');
                }

                if ($shelter->current_occupancy + $family->headcount > $shelter->max_capacity) {
                    throw new \Exception('Shelter has insufficient capacity.');
                }

                // Update Shelter Occupancy
                $shelter->current_occupancy += $family->headcount;

                // Capacity Matching Logic: Flip status if full
                if ($shelter->current_occupancy >= $shelter->max_capacity) {
                    $shelter->status = 'full';
                }
                $shelter->save();
                broadcast(new ShelterStatusUpdated($shelter));

                // Find the currently active LGU ration template
                $activeRation = RationTemplate::with('items')->where('is_active', true)->first();

                if ($activeRation && $activeRation->items->isNotEmpty()) {
                    $inventoryItemIds = $activeRation->items->pluck('inventory_item_id')->unique()->sort()->toArray();
                    $inventoryItems = InventoryItem::lockForUpdate()->whereIn('id', $inventoryItemIds)->get()->keyBy('id');

                    foreach ($activeRation->items as $rationItem) {
                        // Math: Quantity per person * Family Headcount
                        $totalDeduction = $rationItem->quantity_per_head * $family->headcount;

                        // Deduct from main CSWDO inventory
                        $inventory = $inventoryItems->get($rationItem->inventory_item_id);
                        if ($inventory && $inventory->total_stock >= $totalDeduction) {
                            $inventory->decrement('total_stock', $totalDeduction);
                        } else {
                            $itemName = $inventory ? $inventory->item_name : 'Unknown Item';
                            throw new \Exception("Insufficient inventory stock for {$itemName}.");
                        }
                    }
                }

                // Create the Evacuation Log (Audit Trail)
                $log = EvacuationLog::create([
                    'family_profile_id' => $family->id,
                    'shelter_id' => $shelter->id,
                    'recorded_headcount' => $family->headcount,
                    'ration_claimed' => $activeRation !== null, // Only true when a template was applied
                    'checked_in_at' => now(),
                ]);

                return [
                    'action' => 'checkin',
                    'shelter' => $shelter,
                    'log' => $log,
                    'ration_applied' => $activeRation ? $activeRation->name : 'No active ration template.',
                    'message' => 'Check-in successful.',
                ];
            }, 5);

            // Return Success Payload to Frontend
            return response()->json([
                'status' => 'success',
                'message' => $result['message'],
                'data' => $result,
            ], 200);

        } catch (\Exception $e) {
            if ($e->getMessage() === 'Shelter has insufficient capacity.' || $e->getMessage() === 'Target shelter has insufficient capacity.') {
                Shelter::where('id', $shelter_id)->update(['status' => 'full']);
            }

            // If ANYTHING fails, the DB rolls back and returns this error
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function processCheckOut(Request $request, $shelter_id)
    {
        $request->validate([
            'qr_code_hash' => 'required|string|exists:family_profiles,qr_code_hash',
        ]);

        try {
            $result = DB::transaction(function () use ($request) {
                $family = FamilyProfile::where('qr_code_hash', $request->qr_code_hash)->firstOrFail();
                $activeLog = EvacuationLog::where('family_profile_id', $family->id)
                    ->whereNull('checked_out_at')
                    ->firstOrFail();

                $shelter = Shelter::lockForUpdate()->findOrFail($activeLog->shelter_id);
                $shelter->current_occupancy -= $activeLog->recorded_headcount;
                if ($shelter->current_occupancy < 0) {
                    $shelter->current_occupancy = 0;
                }
                if ($shelter->status === 'full' && $shelter->current_occupancy < $shelter->max_capacity) {
                    $shelter->status = 'open';
                }
                $shelter->save();

                $activeLog->checked_out_at = now();
                $activeLog->save();

                return [
                    'shelter' => $shelter,
                    'log' => $activeLog,
                ];
            }, 5);

            return response()->json([
                'status' => 'success',
                'message' => 'Check-out successful.',
                'data' => $result,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function manualCheckOut(Request $request, $id)
    {
        try {
            $result = DB::transaction(function () use ($id) {
                $log = EvacuationLog::whereNull('checked_out_at')->findOrFail($id);
                $shelter = Shelter::lockForUpdate()->findOrFail($log->shelter_id);

                $shelter->current_occupancy -= $log->recorded_headcount;
                if ($shelter->current_occupancy < 0) {
                    $shelter->current_occupancy = 0;
                }
                if ($shelter->status === 'full' && $shelter->current_occupancy < $shelter->max_capacity) {
                    $shelter->status = 'open';
                }
                $shelter->save();

                $log->checked_out_at = now();
                $log->save();

                return [
                    'shelter' => $shelter,
                    'log' => $log,
                ];
            }, 5);

            return response()->json([
                'status' => 'success',
                'message' => 'Manual check-out successful.',
                'data' => $result,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Retrieve paginated evacuation logs for the admin audit trail.
     * Route: GET /api/evacuation-logs
     */
    public function getLogs(Request $request)
    {
        $search = $request->query('search');

        $query = EvacuationLog::with(['familyProfile.user', 'shelter']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('familyProfile.user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%");
                })
                    ->orWhereHas('shelter', function ($sq) use ($search) {
                        $sq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('familyProfile', function ($fq) use ($search) {
                        $fq->where('qr_code_hash', 'like', "%{$search}%");
                    });
            });
        }

        $logs = $query->orderBy('checked_in_at', 'desc')->paginate(50);

        return response()->json([
            'status' => 'success',
            'data' => $logs,
        ], 200);
    }
}
