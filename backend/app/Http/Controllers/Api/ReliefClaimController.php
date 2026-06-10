<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
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
            'qr_code_hash' => 'required|string|exists:family_profiles,qr_code_hash',
        ]);

        return DB::transaction(function () use ($request) {
            $family = FamilyProfile::where('qr_code_hash', $request->qr_code_hash)
                ->lockForUpdate()
                ->firstOrFail();

            // Must be checked in to a shelter
            $activeLog = EvacuationLog::where('family_profile_id', $family->id)
                ->whereNull('checked_out_at')
                ->lockForUpdate()
                ->first();

            if (!$activeLog) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Family is not currently checked into any shelter.',
                ], 422);
            }

            // Prevent double-claiming on the same evacuation log
            if ($activeLog->ration_claimed) {
                return response()->json([
                    'status'       => 'error',
                    'message'      => 'Ration already claimed for this evacuation period.',
                    'claimed_at'   => $activeLog->ration_claimed_at?->toIso8601String(),
                    'family_name'  => $family->family_name,
                    'headcount'    => $activeLog->recorded_headcount,
                ], 409);
            }

            $activeLog->update([
                'ration_claimed'    => true,
                'ration_claimed_at' => now(),
            ]);

            return response()->json([
                'status'      => 'success',
                'message'     => 'Ration claim recorded successfully.',
                'family_name' => $family->family_name,
                'headcount'   => $activeLog->recorded_headcount,
                'shelter_id'  => $activeLog->shelter_id,
                'claimed_at'  => $activeLog->ration_claimed_at->toIso8601String(),
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
            'qr_code_hash' => 'required|string|exists:family_profiles,qr_code_hash',
        ]);

        $family = FamilyProfile::where('qr_code_hash', $request->qr_code_hash)->firstOrFail();

        $activeLog = EvacuationLog::where('family_profile_id', $family->id)
            ->whereNull('checked_out_at')
            ->with('shelter:id,name')
            ->first();

        return response()->json([
            'status'         => 'success',
            'family_name'    => $family->family_name,
            'checked_in'     => (bool) $activeLog,
            'shelter'        => $activeLog?->shelter?->name,
            'ration_claimed' => $activeLog?->ration_claimed ?? false,
            'claimed_at'     => $activeLog?->ration_claimed_at?->toIso8601String(),
        ]);
    }
}
