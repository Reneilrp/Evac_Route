<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ShelterController;
use App\Http\Controllers\Api\CheckInController;
use App\Http\Controllers\Api\HazardController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ResidentStatusController;
use App\Http\Controllers\Api\BundledApiController;

// --- PUBLIC ROUTES (No Auth Required) ---
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/register/family', [AuthController::class, 'registerFamily'])->middleware('throttle:10,1');

// The Capacity Matching Query
Route::get('/shelters/active', [ShelterController::class, 'getActiveShelters']);
// Hazard Reporting & Avoidance
Route::get('/hazards', [HazardController::class, 'getActiveHazards']);

// --- PROTECTED ROUTES (Sanctum + Active Status Required) ---
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user()->load('familyProfile');
    });

    // Logout — Revoke current Sanctum token
    Route::post('/logout', function (Request $request) {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    });

    // Resident Specific Route
    Route::get('/my-status', [ResidentStatusController::class, 'myStatus']);

    // --- LGU & ADMIN ROUTES (Role Required) ---
    Route::middleware(['role:admin,lgu_staff'])->group(function () {
        // Bundled Optimization Endpoints
        Route::get('/dashboard/overview', [BundledApiController::class, 'getDashboardOverview']);
        Route::get('/map/dashboard', [BundledApiController::class, 'getMapDashboard']);
        Route::get('/inventory/dashboard', [BundledApiController::class, 'getInventoryDashboard']);
        // 1. Shelter Management
        Route::get('/shelters', [ShelterController::class, 'getAll']);         // All shelters (admin view)
        Route::post('/shelters', [ShelterController::class, 'store']);
        Route::put('/shelters/{id}', [ShelterController::class, 'update']);
        Route::delete('/shelters/{id}', [ShelterController::class, 'destroy']);
        
        // 2. The Check-in & Relief Deduction Logic
        Route::post('/shelters/{shelter_id}/check-in', [CheckInController::class, 'processCheckIn']);
        Route::post('/shelters/{shelter_id}/check-out', [CheckInController::class, 'processCheckOut']);
        Route::post('/evacuation-logs/{id}/check-out', [CheckInController::class, 'manualCheckOut']);

        // 3. Hazard Pinning & Resolution
        Route::post('/hazards', [HazardController::class, 'reportHazard']);
        Route::put('/hazards/{id}/resolve', [HazardController::class, 'resolveHazard']);

        // 4. Inventory & Rations
        Route::get('/inventory', [InventoryController::class, 'getItems']);
        Route::post('/inventory', [InventoryController::class, 'storeItem']);
        Route::put('/inventory/{id}/adjust', [InventoryController::class, 'adjustStock']);
        Route::get('/rations/templates', [InventoryController::class, 'getTemplates']);
        Route::post('/rations/template', [InventoryController::class, 'storeTemplate']);
        Route::put('/rations/templates/{id}/active', [InventoryController::class, 'activateTemplate']);

        // 5. Evacuation Logs (Audit Trail)
        Route::get('/evacuation-logs', [CheckInController::class, 'getLogs']);
    });

    // Admin-Only Staff CRUD
    Route::middleware(['role:admin'])->group(function () {
        Route::get('/staff', [AuthController::class, 'getStaff']);
        Route::post('/staff', [AuthController::class, 'storeStaff']);
        Route::put('/staff/{id}', [AuthController::class, 'updateStaff']);
        Route::delete('/staff/{id}', [AuthController::class, 'deleteStaff']);
    });
});
