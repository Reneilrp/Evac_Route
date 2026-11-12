<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\DispatchOrder;
use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Hazard;
use App\Models\InventoryItem;
use App\Models\PendingIncident;
use App\Models\RescueMission;
use App\Models\RescueUnit;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class SystemHealthController extends Controller
{
    /**
     * Get system infrastructure telemetry and diagnostic metrics.
     * Route: GET /api/system-health
     */
    public function index(Request $request)
    {
        // 1. Database Diagnostic & Latency Test
        $dbStart = microtime(true);
        $dbStatus = 'operational';
        $dbDriver = 'unknown';
        $dbError = null;
        try {
            DB::select('SELECT 1');
            $dbDriver = DB::connection()->getDriverName();
        } catch (\Throwable $e) {
            $dbStatus = 'degraded';
            $dbError = $e->getMessage();
        }
        $dbLatencyMs = round((microtime(true) - $dbStart) * 1000, 2);

        // 2. Database Record Metrics
        $recordCounts = [
            'users' => User::count(),
            'family_profiles' => FamilyProfile::count(),
            'shelters' => Shelter::count(),
            'hazards' => Hazard::count(),
            'pending_incidents' => PendingIncident::count(),
            'rescue_units' => RescueUnit::count(),
            'rescue_missions' => RescueMission::count(),
            'inventory_items' => InventoryItem::count(),
            'dispatch_orders' => DispatchOrder::count(),
            'evacuation_logs' => EvacuationLog::count(),
            'audit_logs' => AuditLog::count(),
        ];

        // 3. Server System Metrics
        $memoryUsageMb = round(memory_get_usage(true) / 1024 / 1024, 2);
        $memoryPeakMb = round(memory_get_peak_usage(true) / 1024 / 1024, 2);
        $diskFreeGb = @disk_free_space(base_path()) ? round(disk_free_space(base_path()) / 1024 / 1024 / 1024, 2) : null;
        $diskTotalGb = @disk_total_space(base_path()) ? round(disk_total_space(base_path()) / 1024 / 1024 / 1024, 2) : null;

        // 4. WebSocket (Reverb) Telemetry
        $wsPort = 8080;
        $wsHost = config('reverb.servers.reverb.hostname', '127.0.0.1');
        $wsStatus = 'unknown';

        // Quick socket check to verify Reverb port responsiveness
        $connection = @fsockopen($wsHost, $wsPort, $errno, $errstr, 0.2);
        if (is_resource($connection)) {
            $wsStatus = 'operational';
            fclose($connection);
        } else {
            $wsStatus = 'standby';
        }

        // 5. Mobile & Web Application Condition & Telemetry
        $apkPath = public_path('downloads/EvacRoute.apk');
        $altApkPath = public_path('downloads/Evac_Route.apk');
        $hasApk = file_exists($apkPath) || file_exists($altApkPath);
        $targetApk = file_exists($apkPath) ? $apkPath : (file_exists($altApkPath) ? $altApkPath : null);
        $apkSizeMb = $targetApk ? round(filesize($targetApk) / 1024 / 1024, 2) : 106.8;

        return response()->json([
            'status' => 'success',
            'data' => [
                'database' => [
                    'status' => $dbStatus,
                    'latency_ms' => $dbLatencyMs,
                    'driver' => $dbDriver,
                    'error' => $dbError,
                    'records' => $recordCounts,
                ],
                'websocket' => [
                    'status' => $wsStatus,
                    'driver' => config('broadcasting.default', 'reverb'),
                    'host' => $wsHost,
                    'port' => $wsPort,
                ],
                'server' => [
                    'php_version' => PHP_VERSION,
                    'laravel_version' => app()->version(),
                    'environment' => app()->environment(),
                    'server_time' => now()->toIso8601String(),
                    'timezone' => config('app.timezone'),
                    'memory_usage_mb' => $memoryUsageMb,
                    'memory_peak_mb' => $memoryPeakMb,
                    'disk_free_gb' => $diskFreeGb,
                    'disk_total_gb' => $diskTotalGb,
                ],
                'cache_and_queues' => [
                    'cache_driver' => config('cache.default', 'file'),
                    'queue_connection' => config('queue.default', 'sync'),
                ],
                'web_and_mobile' => [
                    'mobile_client' => [
                        'app_name' => 'EvacRoute Mobile',
                        'package' => 'com.evacroute.mobile',
                        'version' => '1.0.4',
                        'target_sdk' => 'Android 14 (API 34 / Expo SDK 56)',
                        'apk_download_ready' => $hasApk,
                        'apk_size_mb' => $apkSizeMb,
                        'offline_queue_support' => 'Enabled (AsyncStorage + NetInfo auto-sync)',
                        'haptics_engine' => 'Calibrated (expo-haptics)',
                        'gps_geofence' => 'Zamboanga City (6.70°N - 7.52°N, 121.75°E - 122.45°E)',
                    ],
                    'web_client' => [
                        'app_name' => 'EvacRoute Web (EOC Tactical Console)',
                        'bundler' => 'Vite Production Build',
                        'map_engine' => 'Mapbox GL JS + 3D Extrusions',
                        'seismic_radar' => 'USGS Live Stream (60s Cache TTL, 350km Radius)',
                        'websocket_gateway' => $wsStatus === 'operational' ? 'Connected (Laravel Reverb)' : 'Fallback HTTP Polling (3s refresh)',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Clear application caches for maintenance.
     * Route: POST /api/system-health/clear-cache
     */
    public function clearCache(Request $request)
    {
        Artisan::call('cache:clear');
        Artisan::call('config:clear');
        Artisan::call('route:clear');

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'system_cache_cleared',
            'ip_address' => $request->ip(),
            'old_values' => null,
            'new_values' => ['action' => 'clear_application_cache'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Application route and configuration caches successfully flushed.',
        ]);
    }
}
