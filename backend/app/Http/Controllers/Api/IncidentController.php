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
     * Resident submits a field incident report with up to 3 photos.
     * Route: POST /api/incidents  (auth:sanctum)
     */
    public function submit(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'hazard_type' => 'required|string|max:50',
            'severity_level' => 'required|in:low,medium,high',
            'description' => 'nullable|string|max:1000',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120', // 5MB max (legacy)
            'photos' => 'nullable|array|max:3',                         // Up to 3 photos
            'photos.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $photoPaths = [];

        // Handle array of photos (up to 3)
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $file) {
                if (count($photoPaths) < 3) {
                    $photoPaths[] = $file->store('incidents', 'public');
                }
            }
        } elseif ($request->hasFile('photo')) {
            $photoPaths[] = $request->file('photo')->store('incidents', 'public');
        }

        $incident = PendingIncident::create([
            'reported_by' => auth()->id(),
            'name' => $validated['name'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'hazard_type' => $validated['hazard_type'],
            'severity_level' => $validated['severity_level'],
            'description' => $validated['description'] ?? null,
            'photo_path' => $photoPaths[0] ?? null,
            'photos' => $photoPaths,
            'status' => 'pending',
        ]);

        // Evaluate if this area has frequent reports
        $evaluation = $this->evaluateFrequency(
            (float) $validated['latitude'],
            (float) $validated['longitude'],
            $validated['hazard_type'],
            $incident->id
        );

        // Broadcast real-time incident submit to LGU dashboard
        broadcast(new IncidentSubmitted($incident));

        return response()->json([
            'status' => 'success',
            'message' => 'Incident report submitted. Pending LGU review.',
            'data' => array_merge($incident->toArray(), [
                'photo_url' => $incident->photo_url,
                'photo_urls' => $incident->photo_urls,
                'frequency_evaluation' => $evaluation,
            ]),
        ], 201);
    }

    /**
     * Resident fetches their own submitted incident history.
     * Route: GET /api/user/incidents  (auth:sanctum)
     */
    public function myIncidents(Request $request)
    {
        $incidents = PendingIncident::where('reported_by', auth()->id())
            ->latest()
            ->get();

        $incidents->transform(function ($incident) {
            $incident->photo_urls = $incident->photo_urls;
            $incident->photo_url = $incident->photo_url;
            $incident->is_read = $incident->is_read;
            $incident->frequency_evaluation = $this->evaluateFrequency(
                (float) $incident->latitude,
                (float) $incident->longitude,
                $incident->hazard_type,
                $incident->id
            );

            return $incident;
        });

        return response()->json([
            'status' => 'success',
            'data' => $incidents,
        ]);
    }

    /**
     * LGU fetches all pending incidents for review with frequency evaluation.
     * Route: GET /api/incidents  (role:admin,lgu_staff)
     */
    public function index(Request $request)
    {
        $status = $request->query('status', 'pending');

        // Automatically mark pending incidents as read by LGU when staff loads queue
        if ($status === 'pending') {
            PendingIncident::where('status', 'pending')
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        $incidents = PendingIncident::with(['reporter:id,name,email', 'reporter.familyProfile:id,user_id,barangay,contact_number'])
            ->where('status', $status)
            ->latest()
            ->paginate(20);

        // Append photo_urls and frequency evaluation to each item
        $incidents->getCollection()->transform(function ($incident) {
            $incident->photo_urls = $incident->photo_urls;
            $incident->photo_url = $incident->photo_url;
            $incident->is_read = true;
            $incident->frequency_evaluation = $this->evaluateFrequency(
                (float) $incident->latitude,
                (float) $incident->longitude,
                $incident->hazard_type,
                $incident->id
            );

            return $incident;
        });

        return response()->json([
            'status' => 'success',
            'data' => $incidents,
        ]);
    }

    /**
     * Evaluates whether an area has frequent incident reports (Hotspot Analysis).
     */
    public function evaluateFrequency(float $lat, float $lon, string $hazardType, ?int $excludeId = null): array
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

        foreach ($allIncidents as $item) {
            $dist = $this->haversine($lat, $lon, (float) $item->latitude, (float) $item->longitude);
            if ($dist <= $radiusMeters) {
                $nearbyCount++;
                if (strtolower($item->hazard_type) === strtolower($hazardType)) {
                    $sameTypeCount++;
                }
            }
        }

        // Also check official active or fixed hazards nearby
        $allHazards = Hazard::all();
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

        $summary = $isFrequentHotspot
            ? "⚠️ FREQUENT HOTSPOT: {$nearbyCount} report(s) in this 250m area ({$sameTypeCount} for {$hazardType}). High recurrence area."
            : "NORMAL AREA: {$nearbyCount} report(s) found in 250m radius.";

        return [
            'is_frequent_hotspot' => $isFrequentHotspot,
            'nearby_count' => $nearbyCount,
            'same_type_count' => $sameTypeCount,
            'evaluation_summary' => $summary,
            'recommended_fixed_spot' => $isFrequentHotspot && strtolower($hazardType) === 'flood',
        ];
    }

    /**
     * LGU approves an incident — converts it to a real Hazard.
     * Route: POST /api/incidents/{id}/approve  (role:admin,lgu_staff)
     */
    public function approve(Request $request, $id)
    {
        $incident = PendingIncident::findOrFail($id);

        if ($incident->status !== 'pending') {
            return response()->json(['message' => 'Incident already reviewed.'], 422);
        }

        $validated = $request->validate([
            'note' => 'nullable|string',
            'is_fixed_flood_spot' => 'nullable|boolean',
            'radius_meters' => 'nullable|numeric|min:1|max:5000',
        ]);

        $isFixed = (bool) ($validated['is_fixed_flood_spot'] ?? false);

        // Promote to official hazard
        $hazard = Hazard::create([
            'name' => $incident->name,
            'latitude' => $incident->latitude,
            'longitude' => $incident->longitude,
            'radius_meters' => $validated['radius_meters'] ?? 75,
            'hazard_type' => $incident->hazard_type,
            'severity_level' => $incident->severity_level,
            'reported_by' => $incident->reported_by,
            'is_fixed_flood_spot' => $isFixed,
            'is_active' => ! $isFixed,
        ]);

        // Mark incident as approved
        $incident->update([
            'status' => 'approved',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'review_note' => $validated['note'] ?? null,
        ]);

        // Broadcast real-time to all map listeners
        broadcast(new HazardCreated($hazard));

        return response()->json([
            'status' => 'success',
            'message' => 'Incident approved and promoted to hazard.',
            'hazard' => $hazard,
        ]);
    }

    /**
     * LGU rejects an incident report.
     * Route: POST /api/incidents/{id}/reject  (role:admin,lgu_staff)
     */
    public function reject(Request $request, $id)
    {
        $incident = PendingIncident::findOrFail($id);

        if ($incident->status !== 'pending') {
            return response()->json(['message' => 'Incident already reviewed.'], 422);
        }

        $incident->update([
            'status' => 'rejected',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'review_note' => $request->input('note', 'Insufficient evidence.'),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Incident report rejected.',
        ]);
    }

    /**
     * Serve the incident photo (from local storage).
     * Route: GET /api/incidents/{id}/photo/{index?}
     */
    public function photo($id, $index = 0)
    {
        $incident = PendingIncident::findOrFail($id);
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
