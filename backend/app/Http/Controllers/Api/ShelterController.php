<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Shelter;
use Illuminate\Http\Request;

class ShelterController extends Controller
{
    /**
     * Fetch all OPEN shelters that have not reached maximum capacity.
     * Route: GET /api/shelters/active
     */
    public function getActiveShelters()
    {
        // THE ALGORITHM: Only return shelters where current_occupancy is strictly less than max_capacity
        $availableShelters = Shelter::where('status', 'open')
            ->whereColumn('current_occupancy', '<', 'max_capacity')
            ->get();

        return response()->json([
            'status' => 'success',
            'count' => $availableShelters->count(),
            'data' => $availableShelters,
        ], 200);
    }

    /**
     * LGU Admin: Get ALL shelters (open, full, closed) for management view.
     * Route: GET /api/shelters
     */
    public function getAll()
    {
        $shelters = Shelter::orderBy('status')->orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'count' => $shelters->count(),
            'data' => $shelters,
        ], 200);
    }

    /**
     * LGU Admin: Pin a new shelter to the map dynamically.
     * Route: POST /api/shelters
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:shelters,name',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'max_capacity' => 'required|integer|min:1',
        ]);

        $shelter = Shelter::create([
            'name' => $validated['name'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'max_capacity' => $validated['max_capacity'],
            'current_occupancy' => 0,
            'status' => 'open',
            'pinned_by' => auth()->id(), // Assuming the LGU official is logged in
        ]);

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'shelter_create',
            'ip_address' => $request->ip(),
            'old_values' => null,
            'new_values' => $shelter->toArray(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'New shelter pinned successfully.',
            'data' => $shelter,
        ], 201);
    }

    /**
     * LGU Admin: Edit shelter details (name, capacity, status).
     * Route: PUT /api/shelters/{id}
     */
    public function update(Request $request, $id)
    {
        $shelter = Shelter::findOrFail($id);
        $oldValues = $shelter->toArray();

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:shelters,name,'.$shelter->id,
            'max_capacity' => 'required|integer|min:1',
            'status' => 'required|in:open,full,closed',
        ]);

        $shelter->update($validated);

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'shelter_update',
            'ip_address' => $request->ip(),
            'old_values' => $oldValues,
            'new_values' => $shelter->toArray(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Shelter updated successfully.',
            'data' => $shelter,
        ], 200);
    }

    /**
     * LGU Admin: Delete/Remove shelter.
     * Route: DELETE /api/shelters/{id}
     */
    public function destroy($id)
    {
        $shelter = Shelter::findOrFail($id);
        $oldValues = $shelter->toArray();

        // cascade deletion of logs will be handled by DB constrained cascade
        $shelter->delete();

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'shelter_delete',
            'ip_address' => request()->ip(),
            'old_values' => $oldValues,
            'new_values' => null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Shelter deleted successfully.',
        ], 200);
    }

    /**
     * Fetch detailed shelter state including currently checked-in residents.
     * Route: GET /api/shelters/{id}/details
     */
    public function getDetails($id)
    {
        $shelter = Shelter::findOrFail($id);

        $activeLogs = $shelter->evacuationLogs()
            ->whereNull('checked_out_at')
            ->with(['familyProfile.user'])
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'family_name' => $log->familyProfile?->name ?? 'N/A',
                    'contact_number' => $log->familyProfile?->contact_number ?? 'N/A',
                    'headcount' => $log->recorded_headcount,
                    'ration_claimed' => $log->ration_claimed,
                    'ration_claimed_at' => $log->ration_claimed_at?->toIso8601String(),
                    'checked_in_at' => $log->checked_in_at?->toIso8601String(),
                    'claimed_ration_items' => $log->claimed_ration_items,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => [
                'shelter' => $shelter,
                'active_logs' => $activeLogs,
            ]
        ], 200);
    }
}
