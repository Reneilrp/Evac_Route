<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:shelters,name,'.$shelter->id,
            'max_capacity' => 'required|integer|min:1',
            'status' => 'required|in:open,full,closed',
        ]);

        $shelter->update($validated);

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

        // cascade deletion of logs will be handled by DB constrained cascade
        $shelter->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Shelter deleted successfully.',
        ], 200);
    }
}
