<?php

namespace App\Http\Controllers\Api;

use App\Events\EmergencyAlertBroadcasted;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BroadcastAlert;
use Illuminate\Http\Request;

class BroadcastAlertController extends Controller
{
    /**
     * Display a listing of the broadcast alerts.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = BroadcastAlert::with('creator');

        if ($user && ($user->role === 'admin' || $user->role === 'lgu_staff')) {
            if ($request->has('archived')) {
                if ($request->boolean('archived')) {
                    $query->whereNotNull('archived_at');
                } else {
                    $query->whereNull('archived_at');
                }
            }
        } else {
            // Residents only see active non-archived alerts
            $query->whereNull('archived_at');
            $familyProfile = $user?->familyProfile;
            $barangay = $familyProfile?->barangay;

            $query->where(function ($q) use ($barangay) {
                $q->where('scope', 'all');
                if ($barangay) {
                    $q->orWhere(function ($sub) use ($barangay) {
                        $sub->where('scope', 'barangay')->where('barangay', $barangay);
                    });
                }
            });
        }

        $alerts = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $alerts,
        ], 200);
    }

    /**
     * Store a newly created broadcast alert in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'severity' => 'required|in:info,warning,critical',
            'scope' => 'required|in:all,barangay',
            'barangay' => 'required_if:scope,barangay|nullable|string|max:255',
        ]);

        $alert = BroadcastAlert::create([
            'title' => $validated['title'],
            'message' => $validated['message'],
            'severity' => $validated['severity'],
            'scope' => $validated['scope'],
            'barangay' => $validated['scope'] === 'barangay' ? $validated['barangay'] : null,
            'created_by' => $request->user()->id,
        ]);

        // Dispatch real-time WebSocket event
        event(new EmergencyAlertBroadcasted($alert));

        // Write to system Audit Log
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'emergency_alert_broadcasted',
            'ip_address' => $request->ip(),
            'old_values' => null,
            'new_values' => [
                'id' => $alert->id,
                'title' => $alert->title,
                'severity' => $alert->severity,
                'scope' => $alert->scope,
                'barangay' => $alert->barangay,
            ],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Emergency warning broadcasted successfully.',
            'data' => $alert->load('creator'),
        ], 201);
    }

    /**
     * Remove the specified broadcast alert from storage.
     */
    public function destroy($id, Request $request)
    {
        $alert = BroadcastAlert::findOrFail($id);

        // Record Audit Log before deletion
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'emergency_alert_deleted',
            'ip_address' => $request->ip(),
            'old_values' => [
                'id' => $alert->id,
                'title' => $alert->title,
                'severity' => $alert->severity,
                'scope' => $alert->scope,
                'barangay' => $alert->barangay,
            ],
            'new_values' => null,
        ]);

        $alert->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Emergency warning revoked/deleted successfully.',
        ], 200);
    }

    /**
     * Archive an emergency broadcast warning.
     * Route: POST /api/alerts/{id}/archive
     */
    public function archive($id)
    {
        $alert = BroadcastAlert::findOrFail($id);
        $alert->update(['archived_at' => now()]);

        return response()->json([
            'status' => 'success',
            'message' => 'Emergency warning archived successfully.',
            'data' => $alert->load('creator'),
        ], 200);
    }

    /**
     * Unarchive / Restore an emergency broadcast warning.
     * Route: POST /api/alerts/{id}/unarchive
     */
    public function unarchive($id)
    {
        $alert = BroadcastAlert::findOrFail($id);
        $alert->update(['archived_at' => null]);

        return response()->json([
            'status' => 'success',
            'message' => 'Emergency warning restored to active broadcasts.',
            'data' => $alert->load('creator'),
        ], 200);
    }
}
