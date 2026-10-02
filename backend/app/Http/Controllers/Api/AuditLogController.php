<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Fetch paginated audit & security logs.
     * Route: GET /api/audit-logs
     */
    public function index(Request $request)
    {
        $query = AuditLog::with('user:id,name,email,role,operator_type')
            ->latest('id');

        // Filter by action keyword
        if ($request->filled('action')) {
            $query->where('action', 'like', '%' . $request->query('action') . '%');
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        // Filter by date range
        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->query('from_date'));
        }
        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->query('to_date'));
        }

        // Search in IP address or action
        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = min((int) $request->query('per_page', 25), 100);
        $logs = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $logs,
        ]);
    }
}
