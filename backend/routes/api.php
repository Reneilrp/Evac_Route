<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BroadcastAlertController;
use App\Http\Controllers\Api\BundledApiController;
use App\Http\Controllers\Api\CheckInController;
use App\Http\Controllers\Api\DispatchOrderController;
use App\Http\Controllers\Api\HazardController;
use App\Http\Controllers\Api\IncidentController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\ReliefClaimController;
use App\Http\Controllers\Api\ResidentRegistryController;
use App\Http\Controllers\Api\ResidentStatusController;
use App\Http\Controllers\Api\RoadMaintenanceController;
use App\Http\Controllers\Api\RoadNetworkController;
use App\Http\Controllers\Api\RescueMissionController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\ShelterController;
use App\Http\Controllers\Api\SitRepController;
use App\Http\Controllers\Api\SystemHealthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// --- PUBLIC ROUTES (No Auth Required) ---
$loginThrottle = app()->environment('testing') ? 'throttle:5,1' : 'throttle:60,1';
Route::post('/login', [AuthController::class, 'login'])->middleware($loginThrottle);
Route::post('/register/family', [AuthController::class, 'registerFamily'])->middleware($loginThrottle);
Route::get('/ping', function () {
    return response()->json(['server_time' => round(microtime(true) * 1000)]);
});

// Capacity Matching
Route::get('/shelters/active', [ShelterController::class, 'getActiveShelters']);
// Hazard Avoidance
Route::get('/hazards', [HazardController::class, 'getActiveHazards']);
// Road Network (public — mobile can sync without auth)
Route::get('/road-network', [RoadNetworkController::class, 'index']);

// --- PROTECTED ROUTES (Sanctum + Active Status) ---
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user()->load(['familyProfile', 'assignedRescueUnit', 'rescueUnits', 'assignedShelter']);
    });
    Route::post('/logout', function (Request $request) {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    });

    // Resident-Specific Routes
    Route::get('/my-status', [ResidentStatusController::class, 'myStatus']);
    Route::get('/resident/map-data', [BundledApiController::class, 'getResidentMapData']);
    Route::get('/alerts', [BroadcastAlertController::class, 'index']);
    // P2: Store/refresh the Expo Push Token for server-initiated notifications
    Route::post('/user/push-token', [AuthController::class, 'storePushToken']);
    Route::post('/user/location', [AuthController::class, 'updateLocation']);

    // Resident Incident Reporting (any authenticated user)
    Route::post('/incidents', [IncidentController::class, 'submit']);
    Route::get('/user/incidents', [IncidentController::class, 'myIncidents']);
    Route::patch('/user/incidents/{id}/archive', [IncidentController::class, 'archive']);
    Route::patch('/user/incidents/{id}/unarchive', [IncidentController::class, 'unarchive']);
    Route::get('/incidents/{id}/photo', [IncidentController::class, 'photo']);
    Route::post('/rescue/sos', [RescueMissionController::class, 'submitSOS']);
    Route::post('/shelters/{shelter_id}/geofence-checkin', [CheckInController::class, 'geofenceCheckIn']);

    // --- LGU & ADMIN ROUTES ---
    Route::middleware(['role:admin,lgu_staff'])->group(function () {
        // Bundled Optimization Endpoints
        Route::get('/dashboard/overview', [BundledApiController::class, 'getDashboardOverview']);
        Route::get('/map/dashboard', [BundledApiController::class, 'getMapDashboard']);
        Route::get('/inventory/dashboard', [BundledApiController::class, 'getInventoryDashboard']);
        Route::get('/shelters/dashboard', [BundledApiController::class, 'getSheltersDashboard']);
        Route::get('/lgu/barangay-relief-summary/{barangay}', [BundledApiController::class, 'getBarangayReliefSummary']);

        // 1. Shelter Management
        Route::get('/shelters', [ShelterController::class, 'getAll']);
        Route::post('/shelters', [ShelterController::class, 'store']);
        Route::put('/shelters/{id}', [ShelterController::class, 'update']);
        Route::delete('/shelters/{id}', [ShelterController::class, 'destroy']);
        Route::get('/shelters/{id}/details', [ShelterController::class, 'getDetails']);

        // 2. Check-in & Relief
        Route::post('/shelters/{shelter_id}/check-in', [CheckInController::class, 'processCheckIn']);
        Route::post('/shelters/{shelter_id}/rapid-check-in', [CheckInController::class, 'rapidCheckIn']);
        Route::post('/shelters/{shelter_id}/check-out', [CheckInController::class, 'processCheckOut']);
        Route::post('/evacuation-logs/{id}/check-out', [CheckInController::class, 'manualCheckOut']);

        // 3. Hazard Management & Disaster Simulation Toggle
        Route::post('/hazards', [HazardController::class, 'reportHazard']);
        Route::put('/hazards/{id}/resolve', [HazardController::class, 'resolveHazard']);
        Route::post('/simulation/toggle', [HazardController::class, 'toggleSimulation']);

        // 4. Incident Review Queue (residents' field reports)
        Route::get('/incidents', [IncidentController::class, 'index']);
        Route::post('/incidents/{id}/approve', [IncidentController::class, 'approve']);
        Route::post('/incidents/{id}/reject', [IncidentController::class, 'reject']);

        // 5. Road Network Management (LGU can block/unblock segments)
        Route::put('/road-network/edges/{id}/status', [RoadNetworkController::class, 'updateEdgeStatus']);

        // 6. Inventory & Rations
        Route::get('/inventory', [InventoryController::class, 'getItems']);
        Route::post('/inventory', [InventoryController::class, 'storeItem']);
        Route::put('/inventory/{id}/adjust', [InventoryController::class, 'adjustStock']);
        Route::get('/rations/templates', [InventoryController::class, 'getTemplates']);
        Route::post('/rations/template', [InventoryController::class, 'storeTemplate']);
        Route::put('/rations/templates/{id}/active', [InventoryController::class, 'activateTemplate']);

        // 7. Phase 2 Relief Claim (QR scan at distribution point)
        Route::post('/relief/claim', [ReliefClaimController::class, 'claim']);
        Route::get('/relief/status', [ReliefClaimController::class, 'status']);

        // 8. Evacuation Logs
        Route::get('/evacuation-logs', [CheckInController::class, 'getLogs']);
        Route::get('/residents', [ResidentRegistryController::class, 'index']);

        // 9. Road Maintenance
        Route::get('/road-maintenance', [RoadMaintenanceController::class, 'index']);
        Route::post('/road-maintenance', [RoadMaintenanceController::class, 'store']);
        Route::put('/road-maintenance/{id}/resolve', [RoadMaintenanceController::class, 'resolve']);

        // 10. Broadcast Warning Alerts
        Route::post('/alerts', [BroadcastAlertController::class, 'store']);
        Route::delete('/alerts/{id}', [BroadcastAlertController::class, 'destroy']);

        // 11. Dispatch Orders (Relief logistics tracking)
        Route::get('/dispatch-orders', [DispatchOrderController::class, 'index']);
        Route::post('/dispatch-orders', [DispatchOrderController::class, 'store']);
        Route::post('/dispatch-orders/{id}/depart', [DispatchOrderController::class, 'depart']);
        Route::post('/dispatch-orders/{id}/deliver', [DispatchOrderController::class, 'deliver']);
        Route::post('/dispatch-orders/{id}/cancel', [DispatchOrderController::class, 'cancel']);

        // 12. DRRM Rescue Unit & Responder Dispatch
        Route::get('/rescue/units', [RescueMissionController::class, 'units']);
        Route::post('/rescue/units', [RescueMissionController::class, 'storeUnit']);
        Route::get('/rescue/missions', [RescueMissionController::class, 'missions']);
        Route::post('/rescue/missions', [RescueMissionController::class, 'store']);
        Route::put('/rescue/missions/{id}/status', [RescueMissionController::class, 'updateStatus']);

        // 13. System Settings (Readable by all LGU staff and Admin)
        Route::get('/settings', [SettingController::class, 'index']);

        // Admin Only Settings Mutation
        Route::middleware('role:admin')->group(function () {
            Route::post('/settings', [SettingController::class, 'store']);
            Route::post('/settings/backup', [SettingController::class, 'backupDatabase']);
            Route::post('/settings/housekeeping', [SettingController::class, 'clearOldLogs']);
        });
    });

    // Staff CRUD (Accessible by Admin and LGU Agency Staff)
    Route::middleware(['role:admin,lgu_staff'])->group(function () {
        Route::get('/staff', [AuthController::class, 'getStaff']);
        Route::post('/staff', [AuthController::class, 'storeStaff']);
        Route::put('/staff/{id}', [AuthController::class, 'updateStaff']);
        Route::delete('/staff/{id}', [AuthController::class, 'deleteStaff']);
    });

    // Security, Audit, Telemetry & Official SitRep (Admin Only)
    Route::middleware(['role:admin'])->group(function () {
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/reports/sitrep', [SitRepController::class, 'index']);
        Route::get('/system-health', [SystemHealthController::class, 'index']);
        Route::post('/system-health/clear-cache', [SystemHealthController::class, 'clearCache']);
    });
});
