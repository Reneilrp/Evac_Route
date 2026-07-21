<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SettingController extends Controller
{
    /**
     * Get all system settings with defaults.
     * Route: GET /api/settings
     */
    public function index()
    {
        $defaults = [
            'master_emergency_active' => true,
            'active_emergency_title' => 'ACTIVE EMERGENCY DISASTER RESPONSE MODE',
            'active_disaster_type' => 'all', // 'natural' | 'man_made' | 'all'
            'map_center_lat' => 6.9126,
            'map_center_lng' => 122.0729,
            'map_zoom' => 13,
            'capacity_warning_threshold' => 80,
            'low_stock_threshold' => 100,
            'audio_alerts_enabled' => true,
            'siren_volume' => 70,
            'audit_log_retention_days' => 90,
        ];

        // Fetch settings from database
        $settings = Setting::all()->pluck('value', 'key')->toArray();

        // Merge defaults with database values
        $merged = array_merge($defaults, $settings);

        // Ensure boolean casts
        $merged['audio_alerts_enabled'] = filter_var($merged['audio_alerts_enabled'], FILTER_VALIDATE_BOOLEAN);
        $merged['master_emergency_active'] = filter_var($merged['master_emergency_active'], FILTER_VALIDATE_BOOLEAN);

        return response()->json([
            'status' => 'success',
            'data' => $merged,
        ], 200);
    }

    /**
     * Save/Update system configurations.
     * Route: POST /api/settings
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'master_emergency_active' => 'nullable|boolean',
            'active_emergency_title' => 'nullable|string|max:255',
            'active_disaster_type' => 'nullable|string|in:natural,man_made,all',
            'map_center_lat' => 'nullable|numeric',
            'map_center_lng' => 'nullable|numeric',
            'map_zoom' => 'nullable|integer|min:1|max:22',
            'capacity_warning_threshold' => 'nullable|integer|min:0|max:100',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'audio_alerts_enabled' => 'nullable|boolean',
            'siren_volume' => 'nullable|integer|min:0|max:100',
            'audit_log_retention_days' => 'nullable|integer|min:1',
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value);
        }

        // Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'settings_update',
            'ip_address' => $request->ip(),
            'old_values' => null,
            'new_values' => $validated,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'System settings updated successfully.',
        ], 200);
    }

    /**
     * Download a full SQL dump of the MySQL database.
     * Route: POST /api/settings/backup
     */
    public function backupDatabase()
    {
        try {
            $driver = DB::connection()->getDriverName();
            $sqlDump = "-- Evac_Route Automated Database Backup\n";
            $sqlDump .= "-- Generated: " . now()->toDateTimeString() . "\n";
            $sqlDump .= "-- Driver: " . $driver . "\n";
            
            if ($driver === 'sqlite') {
                $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
                
                foreach ($tables as $tableRow) {
                    $tableName = $tableRow->name;
                    
                    // Schema structure
                    $schemaRow = DB::select("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?", [$tableName]);
                    $createSql = $schemaRow[0]->sql;
                    
                    $sqlDump .= "DROP TABLE IF EXISTS `{$tableName}`;\n";
                    $sqlDump .= $createSql . ";\n\n";
                    
                    // Table data
                    $rows = DB::table($tableName)->get()->toArray();
                    if (count($rows) > 0) {
                        $sqlDump .= "INSERT INTO `{$tableName}` VALUES ";
                        $insertValues = [];
                        foreach ($rows as $row) {
                            $values = array_map(function ($val) {
                                if (is_null($val)) return 'NULL';
                                return DB::getPdo()->quote($val);
                            }, (array)$row);
                            $insertValues[] = "\n(" . implode(', ', $values) . ")";
                        }
                        $sqlDump .= implode(', ', $insertValues) . ";\n\n";
                    }
                    $sqlDump .= "\n";
                }
            } else {
                // MySQL
                $tables = DB::select('SHOW TABLES');
                $dbName = config('database.connections.mysql.database');
                $tablesKey = "Tables_in_" . $dbName;
                
                $sqlDump .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

                foreach ($tables as $tableRow) {
                    $tableName = $tableRow->$tablesKey;
                    
                    // Show Create Table
                    $createTable = DB::select("SHOW CREATE TABLE `{$tableName}`");
                    $createSql = $createTable[0]->{'Create Table'};
                    
                    $sqlDump .= "DROP TABLE IF EXISTS `{$tableName}`;\n";
                    $sqlDump .= $createSql . ";\n\n";
                    
                    // Show Rows
                    $rows = DB::table($tableName)->get()->toArray();
                    if (count($rows) > 0) {
                        $sqlDump .= "INSERT INTO `{$tableName}` VALUES ";
                        $insertValues = [];
                        foreach ($rows as $row) {
                            $values = array_map(function ($val) {
                                if (is_null($val)) return 'NULL';
                                return DB::getPdo()->quote($val);
                            }, (array)$row);
                            $insertValues[] = "\n(" . implode(', ', $values) . ")";
                        }
                        $sqlDump .= implode(', ', $insertValues) . ";\n\n";
                    }
                    $sqlDump .= "\n";
                }
                
                $sqlDump .= "SET FOREIGN_KEY_CHECKS=1;\n";
            }

            $filename = "evac_route_backup_" . now()->format('Y_m_d_His') . ".sql";

            return response($sqlDump, 200, [
                'Content-Type' => 'application/sql',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Backup failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear audit logs older than retention days config.
     * Route: POST /api/settings/housekeeping
     */
    public function clearOldLogs(Request $request)
    {
        try {
            $retentionDays = Setting::get('audit_log_retention_days', 90);
            $cutoff = now()->subDays((int)$retentionDays);

            $deletedLogs = AuditLog::where('created_at', '<', $cutoff)->delete();

            // Also record this housekeeping action
            AuditLog::create([
                'user_id' => auth()->id(),
                'action' => 'settings_housekeeping',
                'ip_address' => $request->ip(),
                'old_values' => ['retention_days' => $retentionDays, 'cutoff' => $cutoff->toDateTimeString()],
                'new_values' => ['deleted_audit_logs_count' => $deletedLogs],
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Housekeeping finished. Cleared {$deletedLogs} older log entries.",
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Housekeeping failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
