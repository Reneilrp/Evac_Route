<?php

namespace App\Http\Controllers\Api;

use App\Events\RoadMaintenanceCreated;
use App\Events\RoadMaintenanceResolved;
use App\Http\Controllers\Controller;
use App\Models\RoadMaintenance;
use Illuminate\Http\Request;

class RoadMaintenanceController extends Controller
{
    /**
     * Display a listing of active road maintenance blocks.
     */
    public function index()
    {
        $maintenances = RoadMaintenance::where('is_active', true)->get();

        return response()->json([
            'status' => 'success',
            'data' => $maintenances,
        ]);
    }

    /**
     * Store a newly created road maintenance block in storage.
     */
    public function store(Request $request)
    {
        if ($request->has('coordinates')) {
            $validated = $request->validate([
                'description' => 'required|string|max:255',
                'coordinates' => 'required|array|min:2',
                'coordinates.*' => 'required|array|min:2',
                'coordinates.*.0' => 'required|numeric|between:-180,180', // longitude
                'coordinates.*.1' => 'required|numeric|between:-90,90',   // latitude
                'estimated_duration_hours' => 'nullable|integer|min:1',
            ]);

            $reportedBy = auth()->id();
            $description = $validated['description'];
            $duration = $validated['estimated_duration_hours'] ?? null;
            $coordinates = $validated['coordinates'];

            $firstRoadMaintenance = null;

            \DB::transaction(function () use ($coordinates, $description, $duration, $reportedBy, &$firstRoadMaintenance) {
                for ($i = 0; $i < count($coordinates) - 1; $i++) {
                    $rm = RoadMaintenance::create([
                        'description' => $description,
                        'start_longitude' => $coordinates[$i][0],
                        'start_latitude' => $coordinates[$i][1],
                        'end_longitude' => $coordinates[$i + 1][0],
                        'end_latitude' => $coordinates[$i + 1][1],
                        'estimated_duration_hours' => $duration,
                        'reported_by' => $reportedBy,
                        'is_active' => true,
                    ]);
                    if ($i === 0) {
                        $firstRoadMaintenance = $rm;
                    }
                }
            });

            if ($firstRoadMaintenance) {
                broadcast(new RoadMaintenanceCreated($firstRoadMaintenance));
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Road maintenance block reported successfully.',
                'data' => $firstRoadMaintenance,
            ], 201);
        }

        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'start_latitude' => 'required|numeric|between:-90,90',
            'start_longitude' => 'required|numeric|between:-180,180',
            'end_latitude' => 'required|numeric|between:-90,90',
            'end_longitude' => 'required|numeric|between:-180,180',
            'estimated_duration_hours' => 'nullable|integer|min:1',
        ]);

        $validated['reported_by'] = auth()->id();
        $validated['is_active'] = true;

        $roadMaintenance = RoadMaintenance::create($validated);

        broadcast(new RoadMaintenanceCreated($roadMaintenance));

        return response()->json([
            'status' => 'success',
            'message' => 'Road maintenance block reported successfully.',
            'data' => $roadMaintenance,
        ], 201);
    }

    /**
     * Mark a road maintenance block as resolved.
     */
    public function resolve($id)
    {
        $roadMaintenance = RoadMaintenance::findOrFail($id);
        $roadMaintenance->update(['is_active' => false]);

        broadcast(new RoadMaintenanceResolved($roadMaintenance->id));

        return response()->json([
            'status' => 'success',
            'message' => 'Road maintenance block resolved.',
            'data' => $roadMaintenance,
        ]);
    }
}
