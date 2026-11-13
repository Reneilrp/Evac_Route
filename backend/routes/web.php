<?php

use App\Http\Controllers\ReportPrintController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Official CSWDO Disaster Relief Printable Reports (Blade Views)
Route::get('/reports/stock-print', [ReportPrintController::class, 'printStockReport']);
Route::get('/reports/shelter-capacity-print', [ReportPrintController::class, 'printShelterCapacityReport']);
Route::get('/reports/shelter-ration-print/{id}', [ReportPrintController::class, 'printShelterRationReport']);
Route::get('/reports/dispatch-manifest-print/{id}', [ReportPrintController::class, 'printDispatchManifestReport']);

Route::get('/api/reports/stock-print', [ReportPrintController::class, 'printStockReport']);
Route::get('/api/reports/shelter-capacity-print', [ReportPrintController::class, 'printShelterCapacityReport']);
Route::get('/api/reports/shelter-ration-print/{id}', [ReportPrintController::class, 'printShelterRationReport']);
Route::get('/api/reports/dispatch-manifest-print/{id}', [ReportPrintController::class, 'printDispatchManifestReport']);
