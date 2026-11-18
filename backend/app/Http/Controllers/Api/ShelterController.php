<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Shelter;
use Illuminate\Http\Request;

class ShelterController extends Controller
{
    /**
     * Apply common query filters (district, type, status, barangay, search)
     */
    protected function applyShelterFilters($query, Request $request)
    {
        // 1. District filter (e.g. ?district=I, ?district=II, ?district=1, ?district=District I)
        if ($request->filled('district')) {
            $district = trim($request->query('district'));
            $normalized = strtoupper($district);

            if ($normalized === 'I' || $normalized === '1' || $normalized === 'DISTRICT I' || $normalized === 'DISTRICT 1') {
                $query->where(function ($q) {
                    $q->whereIn('district', ['District I', 'Central District I', 'District 1', 'I', '1'])
                      ->orWhere(function ($sub) {
                          $sub->where('district', 'like', '%District I%')
                              ->where('district', 'not like', '%District II%');
                      });
                });
            } elseif ($normalized === 'II' || $normalized === '2' || $normalized === 'DISTRICT II' || $normalized === 'DISTRICT 2') {
                $query->where(function ($q) {
                    $q->whereIn('district', ['District II', 'Central District II', 'District 2', 'II', '2'])
                      ->orWhere('district', 'like', '%District II%');
                });
            } else {
                $query->where('district', $district);
            }
        }

        // 2. Type filter (e.g. ?type=court, ?type=covered_court, ?type=ec, ?type=evacuation_center, ?type=primary, ?type=secondary)
        if ($request->filled('type')) {
            $type = strtolower(trim($request->query('type')));
            if (in_array($type, ['court', 'covered_court', 'covered court', 'secondary', 'gym', 'gymnasium'])) {
                $query->where(function ($q) {
                    $q->where('type', 'secondary')
                      ->orWhere('facility_type', 'like', '%court%')
                      ->orWhere('facility_type', 'like', '%gym%')
                      ->orWhere('name', 'like', '%court%')
                      ->orWhere('name', 'like', '%complex%');
                });
            } elseif (in_array($type, ['ec', 'evacuation_center', 'evacuation center', 'primary'])) {
                $query->where(function ($q) {
                    $q->where('type', 'primary')
                      ->orWhere('facility_type', 'like', '%evacuation%')
                      ->orWhere('name', 'like', '%evacuation%');
                });
            } else {
                $query->where(function ($q) use ($type) {
                    $q->where('type', $type)
                      ->orWhere('facility_type', 'like', "%{$type}%");
                });
            }
        }

        // 3. Status filter (e.g. ?status=open, ?status=full, ?status=closed)
        if ($request->filled('status')) {
            $status = strtolower(trim($request->query('status')));
            $query->where('status', $status);
        }

        // 4. Barangay / Location filter (e.g. ?barangay=Pasonanca or ?location=Pasonanca)
        if ($request->filled('barangay')) {
            $barangay = trim($request->query('barangay'));
            $query->where('barangay', 'like', "%{$barangay}%");
        } elseif ($request->filled('location')) {
            $location = trim($request->query('location'));
            $query->where('barangay', 'like', "%{$location}%");
        }

        // 5. Keyword search (e.g. ?search=court or ?q=vitali)
        $search = $request->query('search', $request->query('q'));
        if ($search) {
            $term = trim($search);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('barangay', 'like', "%{$term}%")
                  ->orWhere('district', 'like', "%{$term}%");
            });
        }

        return $query;
    }

    /**
     * List all shelters with optional filtering (district, type, status, barangay, search).
     * Route: GET /api/shelters
     */
    public function index(Request $request)
    {
        $query = Shelter::query();
        $this->applyShelterFilters($query, $request);

        $shelters = $query->orderBy('status')->orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'count' => $shelters->count(),
            'data' => $shelters,
        ], 200);
    }

    /**
     * Backward-compatible alias for index().
     * Route: GET /api/shelters
     */
    public function getAll(Request $request)
    {
        return $this->index($request);
    }

    /**
     * Get one shelter by ID.
     * Route: GET /api/shelters/{id}
     */
    public function show($id)
    {
        $shelter = Shelter::find($id);

        if (! $shelter) {
            return response()->json([
                'status' => 'error',
                'message' => 'Shelter not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $shelter,
        ], 200);
    }

    /**
     * Return GeoJSON FeatureCollection for map rendering (e.g. Mapbox, Leaflet).
     * Route: GET /api/shelters/map
     */
    public function getGeoJsonMap(Request $request)
    {
        $query = Shelter::query();
        $this->applyShelterFilters($query, $request);

        $shelters = $query->orderBy('name')->get();

        $features = $shelters->map(fn (Shelter $s) => $s->toGeoJsonFeature())->values();

        return response()->json([
            'type' => 'FeatureCollection',
            'count' => $features->count(),
            'features' => $features,
        ], 200, [
            'Content-Type' => 'application/geo+json',
        ]);
    }

    /**
     * Fetch all operational (open or full) shelters.
     * Route: GET /api/shelters/active
     */
    public function getActiveShelters(Request $request)
    {
        $query = Shelter::whereIn('status', ['open', 'full']);
        $this->applyShelterFilters($query, $request);

        $availableShelters = $query->orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'count' => $availableShelters->count(),
            'data' => $availableShelters,
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
            'barangay' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:50',
            'floor_area' => 'nullable|numeric|min:0',
            'type' => 'nullable|in:primary,secondary',
            'facility_type' => 'nullable|string|max:255',
            'status' => 'nullable|in:open,full,closed',
            'is_secured_facility' => 'nullable|boolean',
            'emergency_contact' => 'nullable|string|max:255',
            'elevation_meters' => 'nullable|integer',
            'amenities' => 'nullable|string',
            'transport_schedule' => 'nullable|string|max:255',
        ]);

        $shelter = Shelter::create([
            'name' => $validated['name'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'max_capacity' => $validated['max_capacity'],
            'current_occupancy' => 0,
            'status' => $validated['status'] ?? 'open',
            'barangay' => $validated['barangay'] ?? null,
            'district' => $validated['district'] ?? null,
            'floor_area' => $validated['floor_area'] ?? null,
            'type' => $validated['type'] ?? 'secondary',
            'facility_type' => $validated['facility_type'] ?? 'Covered Court',
            'is_secured_facility' => $validated['is_secured_facility'] ?? false,
            'emergency_contact' => $validated['emergency_contact'] ?? null,
            'elevation_meters' => $validated['elevation_meters'] ?? 10,
            'amenities' => $validated['amenities'] ?? null,
            'transport_schedule' => $validated['transport_schedule'] ?? null,
            'pinned_by' => auth()->id(),
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
     * LGU Admin: Edit shelter details (name, capacity, status, etc.).
     * Route: PUT /api/shelters/{id}
     */
    public function update(Request $request, $id)
    {
        $shelter = Shelter::findOrFail($id);
        $oldValues = $shelter->toArray();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:shelters,name,'.$shelter->id,
            'max_capacity' => 'sometimes|required|integer|min:1',
            'status' => 'sometimes|required|in:open,full,closed',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'barangay' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:50',
            'floor_area' => 'nullable|numeric|min:0',
            'type' => 'nullable|in:primary,secondary',
            'facility_type' => 'nullable|string|max:255',
            'is_secured_facility' => 'nullable|boolean',
            'emergency_contact' => 'nullable|string|max:255',
            'elevation_meters' => 'nullable|integer',
            'amenities' => 'nullable|string',
            'transport_schedule' => 'nullable|string|max:255',
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
            ],
        ], 200);
    }
}
