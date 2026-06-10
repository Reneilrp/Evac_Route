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
     * Resident submits a field incident report with optional photo.
     * Route: POST /api/incidents  (auth:sanctum)
     */
    public function submit(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'latitude'       => 'required|numeric|between:-90,90',
            'longitude'      => 'required|numeric|between:-180,180',
            'hazard_type'    => 'required|in:flood,earthquake,maintenance,debris',
            'severity_level' => 'required|in:low,medium,high',
            'description'    => 'nullable|string|max:1000',
            'photo'          => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120', // 5MB max
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            // Store in local disk under storage/app/public/incidents/
            $photoPath = $request->file('photo')->store('incidents', 'public');
        }

        $incident = PendingIncident::create([
            'reported_by'    => auth()->id(),
            'name'           => $validated['name'],
            'latitude'       => $validated['latitude'],
            'longitude'      => $validated['longitude'],
            'hazard_type'    => $validated['hazard_type'],
            'severity_level' => $validated['severity_level'],
            'description'    => $validated['description'] ?? null,
            'photo_path'     => $photoPath,
            'status'         => 'pending',
        ]);

        // Broadcast real-time incident submit to LGU dashboard
        broadcast(new IncidentSubmitted($incident));

        return response()->json([
            'status'  => 'success',
            'message' => 'Incident report submitted. Pending LGU review.',
            'data'    => array_merge($incident->toArray(), [
                'photo_url' => $incident->photo_url,
            ]),
        ], 201);
    }

    /**
     * LGU fetches all pending incidents for review.
     * Route: GET /api/incidents  (role:admin,lgu_staff)
     */
    public function index(Request $request)
    {
        $status = $request->query('status', 'pending');

        $incidents = PendingIncident::with('reporter:id,name')
            ->where('status', $status)
            ->latest()
            ->paginate(20);

        // Append photo_url to each item
        $incidents->getCollection()->transform(function ($incident) {
            $incident->photo_url = $incident->photo_url;
            return $incident;
        });

        return response()->json([
            'status' => 'success',
            'data'   => $incidents,
        ]);
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

        // Promote to official hazard
        $hazard = Hazard::create([
            'name'           => $incident->name,
            'latitude'       => $incident->latitude,
            'longitude'      => $incident->longitude,
            'radius_meters'  => 75,
            'hazard_type'    => $incident->hazard_type,
            'severity_level' => $incident->severity_level,
            'reported_by'    => $incident->reported_by,
        ]);

        // Mark incident as approved
        $incident->update([
            'status'      => 'approved',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'review_note' => $request->input('note'),
        ]);

        // Broadcast real-time to all map listeners
        broadcast(new HazardCreated($hazard));

        return response()->json([
            'status'  => 'success',
            'message' => 'Incident approved and promoted to hazard.',
            'hazard'  => $hazard,
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
            'status'      => 'rejected',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'review_note' => $request->input('note', 'Insufficient evidence.'),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Incident report rejected.',
        ]);
    }

    /**
     * Serve the incident photo (from local storage).
     * Route: GET /api/incidents/{id}/photo
     */
    public function photo($id)
    {
        $incident = PendingIncident::findOrFail($id);

        if (!$incident->photo_path || !Storage::disk('public')->exists($incident->photo_path)) {
            abort(404, 'Photo not found.');
        }

        return response()->file(Storage::disk('public')->path($incident->photo_path));
    }
}
