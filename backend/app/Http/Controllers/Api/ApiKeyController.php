<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class ApiKeyController extends Controller
{
    /**
     * Admin: List all generated API keys with monitoring metrics.
     * Route: GET /api/admin/api-keys
     */
    public function index()
    {
        $keys = ApiKey::orderByDesc('created_at')->get();

        return response()->json([
            'status' => 'success',
            'summary' => [
                'total_keys' => $keys->count(),
                'active_keys' => $keys->where('is_active', true)->count(),
                'total_requests' => (int) $keys->sum('requests_count'),
            ],
            'data' => $keys,
        ], 200);
    }

    /**
     * Admin: Get recent API request logs.
     * Route: GET /api/admin/api-keys/logs
     */
    public function logs(Request $request)
    {
        $limit = min(100, max(10, (int) $request->query('limit', 50)));
        $query = \App\Models\ApiKeyLog::with('apiKey:id,name')->orderByDesc('id');

        if ($request->filled('key_id')) {
            $query->where('api_key_id', $request->query('key_id'));
        }

        $logs = $query->limit($limit)->get();

        return response()->json([
            'status' => 'success',
            'count' => $logs->count(),
            'data' => $logs,
        ], 200);
    }

    /**
     * Admin: Generate a new API key.
     * Route: POST /api/admin/api-keys
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'days' => 'nullable|integer|min:1|max:3650',
        ]);

        $expiresAt = ! empty($validated['days']) ? now()->addDays((int) $validated['days']) : null;
        $keyRecord = ApiKey::generate($validated['name'], $expiresAt);

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'api_key_created',
            'ip_address' => $request->ip(),
            'old_values' => null,
            'new_values' => [
                'id' => $keyRecord->id,
                'name' => $keyRecord->name,
                'masked_key' => $keyRecord->masked_key,
                'expires_at' => $keyRecord->expires_at,
            ],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "API Key for '{$keyRecord->name}' generated successfully.",
            'data' => $keyRecord,
        ], 201);
    }

    /**
     * Admin: Toggle key active / revoked status.
     * Route: PATCH /api/admin/api-keys/{id}/toggle
     */
    public function toggleStatus($id)
    {
        $keyRecord = ApiKey::findOrFail($id);
        $oldStatus = $keyRecord->is_active;

        $keyRecord->update(['is_active' => ! $oldStatus]);

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => $keyRecord->is_active ? 'api_key_activated' : 'api_key_revoked',
            'ip_address' => request()->ip(),
            'old_values' => ['is_active' => $oldStatus],
            'new_values' => ['is_active' => $keyRecord->is_active],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "API Key #{$keyRecord->id} is now " . ($keyRecord->is_active ? 'Active' : 'Revoked') . '.',
            'data' => $keyRecord,
        ], 200);
    }

    /**
     * Admin: Delete an API key permanently.
     * Route: DELETE /api/admin/api-keys/{id}
     */
    public function destroy($id)
    {
        $keyRecord = ApiKey::findOrFail($id);
        $oldValues = $keyRecord->toArray();

        $keyRecord->delete();

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'api_key_deleted',
            'ip_address' => request()->ip(),
            'old_values' => $oldValues,
            'new_values' => null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'API Key deleted successfully.',
        ], 200);
    }
}
