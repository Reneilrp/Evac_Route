<?php

namespace App\Http\Controllers\Api;

use App\Events\HazardCreated;
use App\Events\IncidentSubmitted;
use App\Http\Controllers\Controller;
use App\Models\Hazard;
use App\Models\PendingIncident;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class IncidentController extends Controller
{
    /**
     * Resident submits a field incident report with up to 4 photos.
     * Route: POST /api/incidents  (auth:sanctum)
     */
    public function submit(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'hazard_type' => 'required|string|max:50',
            'severity_level' => 'required|in:low,medium,high',
            'description' => 'nullable|string|max:1000',
            'barangay' => 'nullable|string|max:100',
            'headcount' => 'nullable|integer|min:1|max:50',
            'modifiers' => 'nullable|array',
            'radius_meters' => 'nullable|numeric|min:1|max:5000',
            'geometry_type' => 'nullable|in:circle,road_corridor',
            'corridor_coordinates' => 'nullable|array',
            'photo' => 'nullable|file|mimes:jpg,jpeg,png,webp,heic|max:15360', // 15MB max for modern smartphone cameras
            'photos' => 'nullable|array|max:4',                         // Up to 4 photos for credibility
            'photos.*' => 'file|mimes:jpg,jpeg,png,webp,heic|max:15360',
        ]);

        $photoPaths = [];

        // Handle array of photos (up to 4)
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $file) {
                if (count($photoPaths) < 4) {
                    $photoPaths[] = $file->store('incidents', 'public');
                }
            }
        } elseif ($request->hasFile('photo')) {
            $photoPaths[] = $request->file('photo')->store('incidents', 'public');
        }

        $userId = $request->user()?->id ?? auth('sanctum')->id() ?? auth()->id();

        // Extract barangay if provided or try to detect from description
        $barangay = $validated['barangay'] ?? null;
        if (! $barangay && ! empty($validated['description']) && preg_match('/Barangay:\s*([^|\]\n]+)/i', $validated['description'], $matches)) {
            $barangay = trim($matches[1]);
        }

        // Automatic naming if name not provided or empty
        $hazardType = $validated['hazard_type'];
        $cleanHazardLabel = ucwords(str_replace('_', ' ', $hazardType));
        $incidentName = ! empty($validated['name'])
            ? trim($validated['name'])
            : ($cleanHazardLabel . ' Incident — ' . ($barangay ? 'Barangay ' . $barangay : 'Zamboanga City'));

        $geometryType = $validated['geometry_type'] ?? 'circle';
        $radiusMeters = (int) ($validated['radius_meters'] ?? 75);
        $corridorCoordinates = $validated['corridor_coordinates'] ?? null;

        $incident = PendingIncident::create([
            'reported_by' => $userId,
            'name' => $incidentName,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'hazard_type' => $hazardType,
            'severity_level' => $validated['severity_level'],
            'headcount' => $validated['headcount'] ?? 1,
            'modifiers' => $validated['modifiers'] ?? null,
            'description' => $validated['description'] ?? null,
            'photo_path' => $photoPaths[0] ?? null,
            'photos' => $photoPaths,
            'status' => 'pending',
            'validation_status' => 'community_active',
            'geometry_type' => $geometryType,
            'radius_meters' => $radiusMeters,
            'corridor_coordinates' => $corridorCoordinates,
        ]);

        // IMMEDIATELY deploy as an active Hazard so evacuation routes avoid it right away
        $hazard = Hazard::create([
            'pending_incident_id' => $incident->id,
            'name' => $incidentName,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'radius_meters' => $radiusMeters,
            'geometry_type' => $geometryType,
            'corridor_coordinates' => $corridorCoordinates,
            'hazard_type' => $hazardType,
            'severity_level' => $validated['severity_level'],
            'reported_by' => $userId,
            'is_fixed_flood_spot' => false,
            'is_active' => true,
            'origin_type' => 'resident_report',
            'barangay' => $barangay,
            'disaster_category' => in_array($hazardType, ['flood', 'landslide', 'earthquake', 'debris']) ? 'natural' : 'man_made',
            'validation_status' => 'unverified',
            'is_validated_by_cdrrmo' => false,
        ]);

        // Link hazard_id on incident
        $incident->update(['hazard_id' => $hazard->id]);

        // Evaluate if this area has frequent reports or SOS clusters
        $isSos = str_starts_with($incidentName, 'EMERGENCY SOS:') || !empty($incident->modifiers) || strtolower($hazardType) === 'sos';
        $evaluation = $this->evaluateFrequency(
            (float) $validated['latitude'],
            (float) $validated['longitude'],
            $hazardType,
            $incident->id,
            $isSos
        );

        // Broadcast real-time hazard creation and incident submission to all maps & consoles
        try {
            broadcast(new HazardCreated($hazard));
        } catch (\Throwable $e) {
            \Log::warning('HazardCreated broadcast warning: ' . $e->getMessage());
        }

        try {
            broadcast(new IncidentSubmitted($incident));
        } catch (\Throwable $e) {
            \Log::warning('IncidentSubmitted broadcast warning: ' . $e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Hazard deployed immediately to live map. Awaiting CDRRMO validation.',
            'data' => [
                'id' => $incident->id,
                'hazard_id' => $hazard->id,
                'name' => $incident->name,
                'latitude' => (float) $incident->latitude,
                'longitude' => (float) $incident->longitude,
                'hazard_type' => $incident->hazard_type,
                'severity_level' => $incident->severity_level,
                'geometry_type' => $incident->geometry_type,
                'radius_meters' => $incident->radius_meters,
                'validation_status' => $incident->validation_status,
                'is_validated_by_cdrrmo' => false,
                'description' => $incident->description,
                'photo_url' => $incident->photo_url,
                'photo_urls' => $incident->photo_urls,
                'photos' => $incident->photos,
                'status' => $incident->status,
                'is_read' => false,
                'created_at' => $incident->created_at,
            ],
            'hazard' => $hazard,
            'frequency_evaluation' => $evaluation,
        ], 201);
    }

    /**
     * Resident fetches their own submitted incident history.
     * Strictly scopes to authenticated user's reports without exposing other residents' data.
     * Supports filtering by ?archived=true/false or returns all with is_archived metadata.
     * Route: GET /api/user/incidents  (auth:sanctum)
     */
    public function myIncidents(Request $request)
    {
        $userId = $request->user()?->id ?? auth('sanctum')->id() ?? auth()->id();
        $query = PendingIncident::where('reported_by', $userId);

        if ($request->has('archived')) {
            if ($request->boolean('archived')) {
                $query->whereNotNull('archived_at');
            } else {
                $query->whereNull('archived_at');
            }
        }

        $incidents = $query->latest()->get();

        $data = $incidents->map(function ($incident) {
            return [
                'id' => $incident->id,
                'name' => $incident->name,
                'latitude' => (float) $incident->latitude,
                'longitude' => (float) $incident->longitude,
                'hazard_type' => $incident->hazard_type,
                'severity_level' => $incident->severity_level,
                'headcount' => $incident->headcount,
                'modifiers' => $incident->modifiers,
                'description' => $incident->description,
                'photo_url' => $incident->photo_url,
                'photo_urls' => $incident->photo_urls,
                'status' => $incident->status,
                'is_read' => $incident->is_read,
                'is_archived' => $incident->is_archived,
                'archived_at' => $incident->archived_at?->toISOString() ?? $incident->archived_at,
                'review_note' => $incident->review_note,
                'reviewed_at' => $incident->reviewed_at,
                'created_at' => $incident->created_at,
                'updated_at' => $incident->updated_at,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Resident archives their own submitted incident report.
     * Route: PATCH /api/user/incidents/{id}/archive  (auth:sanctum)
     */
    public function archive(Request $request, $id)
    {
        $incident = PendingIncident::findOrFail($id);
        $userId = $request->user()?->id ?? auth('sanctum')->id() ?? auth()->id();

        if ((int) $incident->reported_by !== (int) $userId) {
            return response()->json(['message' => 'Unauthorized. You can only archive your own reports.'], 403);
        }

        $incident->update(['archived_at' => now()]);

        return response()->json([
            'status' => 'success',
            'message' => 'Incident report archived successfully.',
            'data' => [
                'id' => $incident->id,
                'is_archived' => true,
                'archived_at' => $incident->archived_at,
            ],
        ]);
    }

    /**
     * Resident restores an archived incident report back to active.
     * Route: PATCH /api/user/incidents/{id}/unarchive  (auth:sanctum)
     */
    public function unarchive(Request $request, $id)
    {
        $incident = PendingIncident::findOrFail($id);
        $userId = $request->user()?->id ?? auth('sanctum')->id() ?? auth()->id();

        if ((int) $incident->reported_by !== (int) $userId) {
            return response()->json(['message' => 'Unauthorized. You can only unarchive your own reports.'], 403);
        }

        $incident->update(['archived_at' => null]);

        return response()->json([
            'status' => 'success',
            'message' => 'Incident report restored to active history.',
            'data' => [
                'id' => $incident->id,
                'is_archived' => false,
                'archived_at' => null,
            ],
        ]);
    }

    /**
     * Admin/LGU Staff archives an incident report.
     * Route: POST /api/incidents/{id}/archive (role:admin,lgu_staff)
     */
    public function adminArchive($id)
    {
        $incident = PendingIncident::findOrFail($id);
        $incident->update(['archived_at' => now()]);

        return response()->json([
            'status' => 'success',
            'message' => 'Incident report archived successfully.',
            'data' => $incident,
        ]);
    }

    /**
     * Admin/LGU Staff unarchives an incident report.
     * Route: POST /api/incidents/{id}/unarchive (role:admin,lgu_staff)
     */
    public function adminUnarchive($id)
    {
        $incident = PendingIncident::findOrFail($id);
        $incident->update(['archived_at' => null]);

        return response()->json([
            'status' => 'success',
            'message' => 'Incident report restored to active review queue.',
            'data' => $incident,
        ]);
    }

    /**
     * LGU fetches all pending incidents for review with frequency evaluation.
     * Route: GET /api/incidents  (role:admin,lgu_staff)
     */
    public function index(Request $request)
    {
        $status = $request->query('status', 'pending');
        $type = $request->query('type'); // 'sos' | 'report' | null

        // Automatically mark pending incidents as read by LGU when staff loads queue
        if ($status === 'pending') {
            PendingIncident::where('status', 'pending')
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        if ($status === 'archived' || ($request->has('archived') && $request->boolean('archived'))) {
            $query = PendingIncident::with(['reporter:id,name,email', 'reporter.familyProfile:id,user_id,barangay,contact_number'])
                ->whereNotNull('archived_at');
        } else {
            $query = PendingIncident::with(['reporter:id,name,email', 'reporter.familyProfile:id,user_id,barangay,contact_number'])
                ->where('status', $status)
                ->whereNull('archived_at');
        }

        if ($type === 'sos') {
            $query->where(function ($q) {
                $q->where('name', 'LIKE', 'EMERGENCY SOS:%')
                  ->orWhereNotNull('modifiers');
            });
        } elseif ($type === 'report') {
            $query->where('name', 'NOT LIKE', 'EMERGENCY SOS:%')
                  ->whereNull('modifiers');
        }

        $incidents = $query->latest()
            ->paginate(20);

        // Append photo_urls and frequency evaluation to each item
        $incidents->getCollection()->transform(function ($incident) {
            $incident->photo_urls = $incident->photo_urls;
            $incident->photo_url = $incident->photo_url;
            $incident->is_read = true;
            $isSos = str_starts_with($incident->name, 'EMERGENCY SOS:') || !empty($incident->modifiers) || strtolower($incident->hazard_type) === 'sos';
            $incident->frequency_evaluation = $this->evaluateFrequency(
                (float) $incident->latitude,
                (float) $incident->longitude,
                $incident->hazard_type,
                $incident->id,
                $isSos
            );

            return $incident;
        });

        return response()->json([
            'status' => 'success',
            'data' => $incidents,
        ]);
    }

    /**
     * Evaluates whether an area has frequent incident reports (Hotspot Analysis)
     * and separates Emergency SOS life-safety clusters from routine civil drainage hotspots.
     */
    public function evaluateFrequency(float $lat, float $lon, string $hazardType, ?int $excludeId = null, bool $isSos = false): array
    {
        $radiusMeters = 250; // 250m evaluation radius

        // Query historical pending & approved incidents nearby
        $query = PendingIncident::whereNotNull('latitude')->whereNotNull('longitude');
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        $allIncidents = $query->get();

        $nearbyCount = 0;
        $sameTypeCount = 0;
        $nearbySosCount = 0;

        foreach ($allIncidents as $item) {
            $dist = $this->haversine($lat, $lon, (float) $item->latitude, (float) $item->longitude);
            if ($dist <= $radiusMeters) {
                $nearbyCount++;
                if (strtolower($item->hazard_type) === strtolower($hazardType)) {
                    $sameTypeCount++;
                }
                if (strtolower($item->hazard_type) === 'sos' || str_starts_with($item->name, 'EMERGENCY SOS:') || !empty($item->modifiers)) {
                    $nearbySosCount++;
                }
            }
        }

        // Also check official active hazards nearby
        $allHazards = Hazard::where('is_active', true)->get();
        foreach ($allHazards as $h) {
            $dist = $this->haversine($lat, $lon, (float) $h->latitude, (float) $h->longitude);
            if ($dist <= $radiusMeters) {
                $nearbyCount++;
                if (strtolower($h->hazard_type) === strtolower($hazardType)) {
                    $sameTypeCount++;
                }
            }
        }

        $isFrequentHotspot = ($sameTypeCount >= 2 || $nearbyCount >= 3);
        $isSosCluster = ($nearbySosCount >= 2);

        if ($isSos || strtolower($hazardType) === 'sos') {
            if ($isSosCluster) {
                $summary = "🚨 MASS RESCUE CLUSTER: {$nearbySosCount} active SOS distress call(s) in this 250m zone. Multiple trapped households require immediate rescue dispatch.";
            } elseif ($isFrequentHotspot) {
                $summary = "ℹ️ TACTICAL TERRAIN CONTEXT: Severe recurrence area with {$nearbyCount} prior hazard reports. High-clearance vehicles or rescue boats advised.";
            } else {
                $summary = "EMERGENCY SOS: Isolated life-safety distress call in this area.";
            }
            $recommendedFixedSpot = false; // NEVER recommend civil drainage spots on active rescues!
        } else {
            $summary = $isFrequentHotspot
                ? "⚠️ FREQUENT HOTSPOT: {$nearbyCount} report(s) in this 250m area ({$sameTypeCount} for {$hazardType}). High recurrence area."
                : "NORMAL AREA: {$nearbyCount} report(s) found in 250m radius.";
            $recommendedFixedSpot = $isFrequentHotspot && strtolower($hazardType) === 'flood';
        }

        return [
            'is_frequent_hotspot' => $isFrequentHotspot,
            'is_sos_cluster' => $isSosCluster,
            'nearby_count' => $nearbyCount,
            'nearby_sos_count' => $nearbySosCount,
            'same_type_count' => $sameTypeCount,
            'evaluation_summary' => $summary,
            'recommended_fixed_spot' => $recommendedFixedSpot,
        ];
    }

    /**
     * CDRRMO validates an incident report, confirming it as an authentic verified hazard.
     * Route: POST /api/incidents/{id}/validate  (role:admin,lgu_staff)
     */
    public function validateReport(Request $request, $id)
    {
        $incident = PendingIncident::findOrFail($id);

        $validated = $request->validate([
            'note' => 'nullable|string',
            'is_fixed_flood_spot' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'radius_meters' => 'nullable|numeric|min:1|max:5000',
            'geometry_type' => 'nullable|in:circle,road_corridor',
            'corridor_coordinates' => 'nullable|array',
            'hazard_type' => 'nullable|string|max:50',
            'severity_level' => 'nullable|string|in:low,medium,high,critical',
            'name' => 'nullable|string|max:255',
        ]);

        $reviewerId = $request->user()?->id ?? auth('sanctum')->id() ?? auth()->id();
        $isFixed = (bool) ($validated['is_fixed_flood_spot'] ?? false);
        $isActive = array_key_exists('is_active', $validated)
            ? (bool) $validated['is_active']
            : ! $isFixed;

        // Mark incident as validated
        $incident->update([
            'status' => 'approved',
            'validation_status' => 'cdrrmo_validated',
            'reviewed_by' => $reviewerId,
            'reviewed_at' => now(),
            'review_note' => $validated['note'] ?? $incident->review_note,
        ]);

        // Find linked hazard or create if missing
        $hazard = Hazard::where('pending_incident_id', $incident->id)
            ->orWhere('id', $incident->hazard_id)
            ->first();

        if ($hazard) {
            $hazard->update([
                'name' => $validated['name'] ?? $hazard->name,
                'hazard_type' => $validated['hazard_type'] ?? $hazard->hazard_type,
                'severity_level' => $validated['severity_level'] ?? $hazard->severity_level,
                'radius_meters' => $validated['radius_meters'] ?? $hazard->radius_meters,
                'geometry_type' => $validated['geometry_type'] ?? $hazard->geometry_type,
                'corridor_coordinates' => $validated['corridor_coordinates'] ?? $hazard->corridor_coordinates,
                'is_fixed_flood_spot' => $isFixed,
                'is_active' => $isActive,
                'validation_status' => 'cdrrmo_validated',
                'is_validated_by_cdrrmo' => true,
                'validated_by' => $reviewerId,
                'validated_at' => now(),
            ]);
        } else {
            $hazard = Hazard::create([
                'pending_incident_id' => $incident->id,
                'name' => $validated['name'] ?? $incident->name,
                'latitude' => $incident->latitude,
                'longitude' => $incident->longitude,
                'radius_meters' => $validated['radius_meters'] ?? 75,
                'geometry_type' => $validated['geometry_type'] ?? 'circle',
                'corridor_coordinates' => $validated['corridor_coordinates'] ?? null,
                'hazard_type' => $validated['hazard_type'] ?? $incident->hazard_type,
                'severity_level' => $validated['severity_level'] ?? $incident->severity_level,
                'reported_by' => $incident->reported_by,
                'is_fixed_flood_spot' => $isFixed,
                'is_active' => $isActive,
                'origin_type' => 'resident_report',
                'validation_status' => 'cdrrmo_validated',
                'is_validated_by_cdrrmo' => true,
                'validated_by' => $reviewerId,
                'validated_at' => now(),
            ]);
            $incident->update(['hazard_id' => $hazard->id]);
        }

        // Broadcast real-time hazard update
        try {
            broadcast(new HazardCreated($hazard));
        } catch (\Throwable $e) {
            \Log::warning('HazardCreated broadcast warning: ' . $e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Incident validated and confirmed by CDRRMO.',
            'incident' => $incident,
            'hazard' => $hazard,
        ]);
    }

    /**
     * Backward-compatible alias for validateReport.
     */
    public function approve(Request $request, $id)
    {
        return $this->validateReport($request, $id);
    }

    /**
     * CDRRMO dismisses an incident report (false report or resolved) and deactivates linked hazard.
     * Route: POST /api/incidents/{id}/dismiss  (role:admin,lgu_staff)
     */
    public function dismiss(Request $request, $id)
    {
        $incident = PendingIncident::findOrFail($id);
        $reviewerId = $request->user()?->id ?? auth('sanctum')->id() ?? auth()->id();

        $incident->update([
            'status' => 'rejected',
            'validation_status' => 'dismissed',
            'reviewed_by' => $reviewerId,
            'reviewed_at' => now(),
            'review_note' => $request->input('note', 'Dismissed as false report / resolved by CDRRMO.'),
        ]);

        // Deactivate linked hazard so routing immediately ignores it
        Hazard::where('pending_incident_id', $incident->id)
            ->orWhere('id', $incident->hazard_id)
            ->update([
                'is_active' => false,
                'validation_status' => 'dismissed',
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Incident report dismissed and hazard deactivated from live map.',
            'incident' => $incident,
        ]);
    }

    /**
     * Backward-compatible alias for dismiss.
     */
    public function reject(Request $request, $id)
    {
        return $this->dismiss($request, $id);
    }

    /**
     * Serve the incident photo (from local storage).
     * Route: GET /api/incidents/{id}/photo/{index?}
     */
    public function photo(Request $request, $id, $index = 0)
    {
        $incident = PendingIncident::findOrFail($id);
        $user = $request->user() ?? auth('sanctum')->user() ?? auth()->user();

        // Residents are strictly restricted to accessing photos from their own reports
        if ($user && $user->role === 'resident' && (int) $incident->reported_by !== (int) $user->id) {
            abort(403, 'Unauthorized. You can only view photos from your own reports.');
        }

        $photos = $incident->photos;

        if (! empty($photos) && is_array($photos) && isset($photos[$index])) {
            $path = $photos[$index];
            if (Storage::disk('public')->exists($path)) {
                return response()->file(Storage::disk('public')->path($path));
            }
        }

        if ($incident->photo_path && Storage::disk('public')->exists($incident->photo_path)) {
            return response()->file(Storage::disk('public')->path($incident->photo_path));
        }

        abort(404, 'Photo not found.');
    }

    /**
     * Calculate distance between two points in meters (Haversine formula).
     */
    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
