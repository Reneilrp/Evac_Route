<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyProfile;
use Illuminate\Http\Request;

class ResidentRegistryController extends Controller
{
    /**
     * Get a paginated list of all registered residents / family profiles,
     * including check-in history, total check-ins, and total ration claims.
     * Route: GET /api/residents
     */
    public function index(Request $request)
    {
        $search = $request->query('search');

        $query = FamilyProfile::with(['user', 'evacuationLogs.shelter']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%");
                })
                ->orWhere('barangay', 'like', "%{$search}%")
                ->orWhere('contact_number', 'like', "%{$search}%")
                ->orWhere('qr_code_hash', 'like', "%{$search}%");
            });
        }

        // Paginate by 25 records
        $residents = $query->paginate(25);

        // Transform collection to aggregate stats and details
        $residents->getCollection()->transform(function ($profile) {
            $history = $profile->evacuationLogs->sortByDesc('checked_in_at')->values();
            
            $activeLog = $history->first(function ($log) {
                return is_null($log->checked_out_at);
            });

            $totalRations = $history->where('ration_claimed', true)->count();

            return [
                'id' => $profile->id,
                'name' => $profile->user?->name ?? 'N/A',
                'headcount' => $profile->headcount,
                'contact_number' => $profile->contact_number,
                'barangay' => $profile->barangay,
                'qr_code_hash' => $profile->qr_code_hash,
                'transportation_mode' => $profile->transportation_mode,
                'total_checkins' => $history->count(),
                'total_rations_claimed' => $totalRations,
                'current_status' => $activeLog ? 'checked_in' : 'checked_out',
                'current_shelter' => $activeLog?->shelter?->name,
                'history' => $history->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'shelter_name' => $log->shelter?->name ?? 'Deleted Shelter',
                        'checked_in_at' => $log->checked_in_at?->toIso8601String(),
                        'checked_out_at' => $log->checked_out_at?->toIso8601String(),
                        'recorded_headcount' => $log->recorded_headcount,
                        'ration_claimed' => $log->ration_claimed,
                        'ration_claimed_at' => $log->ration_claimed_at?->toIso8601String(),
                        'claimed_ration_items' => $log->claimed_ration_items,
                    ];
                }),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $residents,
        ], 200);
    }
}
