<?php

namespace App\Http\Controllers\Api;

use App\Events\HazardCreated;
use App\Events\HazardResolved;
use App\Http\Controllers\Controller;
use App\Models\Hazard;
use Illuminate\Http\Request;

class HazardController extends Controller
{
    public function reportHazard(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string',
            'latitude'       => 'required|numeric|between:-90,90',
            'longitude'      => 'required|numeric|between:-180,180',
            'radius_meters'  => 'numeric|min:1|max:5000',
            'hazard_type'    => 'required|in:flood,earthquake,maintenance,debris',
            'severity_level' => 'required|in:low,medium,high',
            'description'    => 'nullable|string|max:500',
            'photo_path'     => 'nullable|string',
        ]);

        $hazard = Hazard::create([
            'name'           => $validated['name'],
            'latitude'       => $validated['latitude'],
            'longitude'      => $validated['longitude'],
            'radius_meters'  => $request->radius_meters ?? 50,
            'hazard_type'    => $validated['hazard_type'],
            'severity_level' => $validated['severity_level'],
            'reported_by'    => auth()->id(),
        ]);

        // Broadcast real-time map update
        broadcast(new HazardCreated($hazard));

        return response()->json(['status' => 'success', 'data' => $hazard], 201);
    }

    public function getActiveHazards()
    {
        $hazards = Hazard::where('is_active', true)->get();

        return response()->json([
            'status' => 'success',
            'count'  => $hazards->count(),
            'data'   => $hazards,
        ]);
    }

    public function resolveHazard($id)
    {
        $hazard = Hazard::findOrFail($id);
        $hazard->update(['is_active' => false]);

        // Broadcast real-time removal
        broadcast(new HazardResolved((int) $id));

        return response()->json([
            'status'  => 'success',
            'message' => 'Hazard zone resolved successfully.',
            'data'    => $hazard,
        ]);
    }
}
