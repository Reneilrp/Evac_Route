<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Hazard;

class HazardController extends Controller
{
    public function reportHazard(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'radius_meters' => 'numeric',
            'hazard_type' => 'required|in:flood,earthquake,maintenance',
            'severity_level' => 'required|in:low,medium,high',
        ]);

        $hazard = Hazard::create([
            'name' => $validated['name'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'radius_meters' => $request->radius_meters ?? 50,
            'hazard_type' => $validated['hazard_type'],
            'severity_level' => $validated['severity_level'],
            'reported_by' => auth()->id() // Assumes protected route
        ]);

        return response()->json(['status' => 'success', 'data' => $hazard]);
    }

    public function getActiveHazards()
    {
        // The frontend map will call this to know where NOT to route people
        $hazards = Hazard::where('is_active', true)->get();

        return response()->json([
            'status' => 'success',
            'count' => $hazards->count(),
            'data' => $hazards
        ], 200);
    }

    /**
     * Mark a hazard as resolved.
     * Route: PUT /api/hazards/{id}/resolve
     */
    public function resolveHazard($id)
    {
        $hazard = Hazard::findOrFail($id);
        $hazard->update(['is_active' => false]);

        return response()->json([
            'status' => 'success',
            'message' => 'Hazard zone resolved successfully.',
            'data' => $hazard
        ], 200);
    }
}
