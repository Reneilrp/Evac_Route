<?php

namespace App\Http\Controllers\Api;

use App\Events\HazardCreated;
use App\Events\HazardResolved;
use App\Http\Controllers\Controller;
use App\Models\BroadcastAlert;
use App\Models\Hazard;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;

class HazardController extends Controller
{
    /**
     * Dictionary of calibrated coordinates for key Zamboanga City barangays.
     */
    protected static array $barangayCoordinates = [
        'Tumaga' => ['lat' => 6.9325, 'lon' => 122.0805],
        'Tetuan' => ['lat' => 6.9189, 'lon' => 122.0886],
        'Guiwan' => ['lat' => 6.9242, 'lon' => 122.0911],
        'Sta. Maria' => ['lat' => 6.9280, 'lon' => 122.0715],
        'San Roque' => ['lat' => 6.9455, 'lon' => 122.0620],
        'Pasonanca' => ['lat' => 6.9530, 'lon' => 122.0720],
        'Tugbungan' => ['lat' => 6.9100, 'lon' => 122.0950],
        'Baliwasan' => ['lat' => 6.9150, 'lon' => 122.0550],
        'Campo Islam' => ['lat' => 6.9120, 'lon' => 122.0480],
        'Santa Catalina' => ['lat' => 6.9105, 'lon' => 122.0800],
        'San Jose Gusu' => ['lat' => 6.9180, 'lon' => 122.0420],
        'Calarian' => ['lat' => 6.9250, 'lon' => 122.0300],
        'Ayala' => ['lat' => 6.9600, 'lon' => 121.9500],
        'Manicahan' => ['lat' => 7.0300, 'lon' => 122.1800],
        'Curuan' => ['lat' => 7.1500, 'lon' => 122.2500],
        'Vitali' => ['lat' => 7.3700, 'lon' => 122.2900],
    ];

    /**
     * Pre-mapped Zamboanga City geohazard presets.
     */
    public static function getPresetDefinitions(): array
    {
        return [
            'tumaga_basin' => [
                'key' => 'tumaga_basin',
                'name' => 'Tumaga River Flash Flood Corridor',
                'hazard_type' => 'flood',
                'barangays' => ['Tumaga', 'Guiwan', 'Tetuan', 'Tugbungan'],
                'latitude' => 6.9325,
                'longitude' => 122.0805,
                'radius_meters' => 1200,
                'estimated_duration_hours' => 6,
                'description' => 'MGB Very High Flood Susceptibility corridor. High-risk overflow spanning Saaz, Tumaga, Guiwan, Tetuan down to Tugbungan outlet.',
            ],
            'saaz_corridor' => [
                'key' => 'saaz_corridor',
                'name' => 'Saaz / San Roque River Basin',
                'hazard_type' => 'flood',
                'barangays' => ['San Roque', 'Sta. Maria', 'Pasonanca'],
                'latitude' => 6.9450,
                'longitude' => 122.0680,
                'radius_meters' => 1000,
                'estimated_duration_hours' => 4,
                'description' => 'Upper river basin swelling risk affecting Villa San Ignacio, Filinvest, and Gov. Ramos Ave bottlenecks.',
            ],
            'baliwasan_surge' => [
                'key' => 'baliwasan_surge',
                'name' => 'Southwest Monsoon (Habagat) Coastal Surge',
                'hazard_type' => 'flood',
                'barangays' => ['Baliwasan', 'Campo Islam', 'Mariki'],
                'latitude' => 6.9150,
                'longitude' => 122.0550,
                'radius_meters' => 1500,
                'estimated_duration_hours' => 8,
                'description' => 'High tide coastal inundation and gale-force wave runup along shoreline settlements.',
            ],
            'manicahan_flood' => [
                'key' => 'manicahan_flood',
                'name' => 'Manicahan Agricultural River Overflow',
                'hazard_type' => 'flood',
                'barangays' => ['Manicahan', 'Victoria', 'Lamisahan'],
                'latitude' => 7.0300,
                'longitude' => 122.1800,
                'radius_meters' => 1500,
                'estimated_duration_hours' => 6,
                'description' => 'Agricultural river plain overflow cutting off highway transit to East Coast.',
            ],
            'pasonanca_slide' => [
                'key' => 'pasonanca_slide',
                'name' => 'Pasonanca Upstream Landslide Alert',
                'hazard_type' => 'debris',
                'barangays' => ['Pasonanca', 'Dulian'],
                'latitude' => 6.9600,
                'longitude' => 122.0750,
                'radius_meters' => 1000,
                'estimated_duration_hours' => 12,
                'description' => 'Steep slope saturation and rockfall danger along mountain bypass roads.',
            ],
        ];
    }

    public function reportHazard(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius_meters' => 'numeric|min:1|max:5000',
            'hazard_type' => 'required|in:flood,earthquake,maintenance,debris',
            'severity_level' => 'required|in:low,medium,high',
            'description' => 'nullable|string|max:500',
            'photo_path' => 'nullable|string',
            'estimated_duration_hours' => 'nullable|integer|min:1',
            'is_fixed_flood_spot' => 'nullable|boolean',
        ]);

        $isFixed = (bool) ($validated['is_fixed_flood_spot'] ?? false);

        $hazard = Hazard::create([
            'name' => $validated['name'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'radius_meters' => $validated['radius_meters'] ?? 50,
            'hazard_type' => $validated['hazard_type'],
            'severity_level' => $validated['severity_level'],
            'estimated_duration_hours' => $validated['estimated_duration_hours'] ?? null,
            'reported_by' => auth()->id(),
            'is_fixed_flood_spot' => $isFixed,
            'is_active' => ! $isFixed,
        ]);

        // Broadcast real-time map update with fallback guard
        try {
            broadcast(new HazardCreated($hazard));
        } catch (\Throwable $e) {
            \Log::warning('WebSocket broadcast warning: '.$e->getMessage());
        }

        return response()->json(['status' => 'success', 'data' => $hazard], 201);
    }

    /**
     * Top-Down Official Declaration of an active disaster zone for a barangay.
     * Route: POST /api/hazards/declare-zone
     */
    public function declareZone(Request $request)
    {
        $validated = $request->validate([
            'barangay' => 'required|string|max:100',
            'name' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'radius_meters' => 'nullable|numeric|min:50|max:10000',
            'hazard_type' => 'nullable|in:flood,earthquake,maintenance,debris,fire',
            'severity_level' => 'nullable|in:low,medium,high,critical',
            'estimated_duration_hours' => 'nullable|integer|min:1|max:72',
            'send_broadcast' => 'nullable|boolean',
            'advisory_message' => 'nullable|string|max:1000',
        ]);

        $barangay = $validated['barangay'];
        $coords = self::$barangayCoordinates[$barangay] ?? ['lat' => 6.9214, 'lon' => 122.0790];

        $lat = $validated['latitude'] ?? $coords['lat'];
        $lon = $validated['longitude'] ?? $coords['lon'];
        $radius = $validated['radius_meters'] ?? 800;
        $hazardType = $validated['hazard_type'] ?? 'flood';
        $severity = $validated['severity_level'] ?? 'high';
        $duration = $validated['estimated_duration_hours'] ?? 6;
        $hazardName = $validated['name'] ?? "CDRRMO Active Zone: Barangay {$barangay}";

        $hazard = Hazard::create([
            'name' => $hazardName,
            'barangay' => $barangay,
            'latitude' => $lat,
            'longitude' => $lon,
            'radius_meters' => $radius,
            'hazard_type' => $hazardType,
            'severity_level' => $severity,
            'estimated_duration_hours' => $duration,
            'origin_type' => 'official_declaration',
            'is_active' => true,
            'reported_by' => auth()->id() ?? 1,
        ]);

        // Real-time map update broadcast
        try {
            broadcast(new HazardCreated($hazard));
        } catch (\Throwable $e) {
            \Log::warning('WebSocket broadcast warning: '.$e->getMessage());
        }

        // Optional Automated Broadcast & Push Alert
        $broadcast = null;
        if ($validated['send_broadcast'] ?? true) {
            $alertTitle = "🚨 CDRRMO ACTIVE ALERT: Barangay {$barangay}";
            $alertBody = $validated['advisory_message'] ?? "An active {$hazardType} hazard zone has been officially declared for Barangay {$barangay}. Pre-emptive evacuation and route avoidance advised.";

            try {
                $broadcast = BroadcastAlert::create([
                    'title' => $alertTitle,
                    'message' => $alertBody,
                    'severity' => in_array($severity, ['critical', 'high']) ? 'critical' : 'warning',
                    'scope' => 'all',
                    'created_by' => auth()->id() ?? 1,
                ]);

                // Send Expo Push Notification to users
                $tokens = User::whereNotNull('push_token')->pluck('push_token')->toArray();
                if (!empty($tokens)) {
                    PushNotificationService::send($tokens, $alertTitle, $alertBody, [
                        'type' => 'hazard_zone_declared',
                        'hazard_id' => $hazard->id,
                        'barangay' => $barangay,
                    ]);
                }
            } catch (\Throwable $e) {
                \Log::warning('Broadcast creation error: '.$e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Disaster hazard zone officially declared for Barangay {$barangay}.",
            'data' => [
                'hazard' => $hazard,
                'broadcast_alert' => $broadcast,
            ],
        ], 201);
    }

    /**
     * Get all pre-configured geohazard presets and their live active status.
     * Route: GET /api/hazards/presets
     */
    public function getPresets()
    {
        $definitions = self::getPresetDefinitions();
        $activePresetKeys = Hazard::whereNotNull('preset_key')
            ->where('is_active', true)
            ->pluck('preset_key')
            ->toArray();

        $presets = [];
        foreach ($definitions as $key => $preset) {
            $isActive = in_array($key, $activePresetKeys);
            $activeRecord = $isActive
                ? Hazard::where('preset_key', $key)->where('is_active', true)->first()
                : null;

            $presets[] = array_merge($preset, [
                'is_active' => $isActive,
                'active_hazard_id' => $activeRecord?->id,
                'activated_at' => $activeRecord?->created_at?->toIso8601String(),
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data' => $presets,
        ]);
    }

    /**
     * Toggle a pre-configured geohazard preset ON or OFF.
     * Route: POST /api/hazards/presets/{key}/toggle
     */
    public function togglePreset(Request $request, string $key)
    {
        $definitions = self::getPresetDefinitions();

        if (! array_key_exists($key, $definitions)) {
            return response()->json([
                'status' => 'error',
                'message' => "Invalid geohazard preset key: '{$key}'.",
            ], 404);
        }

        $preset = $definitions[$key];
        $existing = Hazard::where('preset_key', $key)
            ->where('is_active', true)
            ->first();

        if ($existing) {
            // Deactivate
            $existing->update(['is_active' => false]);

            try {
                broadcast(new HazardResolved($existing->id));
            } catch (\Throwable $e) {
            }

            return response()->json([
                'status' => 'success',
                'action' => 'deactivated',
                'message' => "Preset '{$preset['name']}' has been deactivated.",
                'preset_key' => $key,
            ]);
        }

        // Activate
        $hazard = Hazard::create([
            'name' => $preset['name'],
            'barangay' => implode(', ', $preset['barangays']),
            'latitude' => $preset['latitude'],
            'longitude' => $preset['longitude'],
            'radius_meters' => $preset['radius_meters'],
            'hazard_type' => $preset['hazard_type'],
            'severity_level' => 'high',
            'estimated_duration_hours' => $preset['estimated_duration_hours'],
            'origin_type' => 'geohazard_preset',
            'preset_key' => $key,
            'is_active' => true,
            'reported_by' => auth()->id() ?? 1,
        ]);

        try {
            broadcast(new HazardCreated($hazard));
        } catch (\Throwable $e) {
        }

        // Send Alert
        $alertTitle = "🚨 GEOHAZARD PRESET ACTIVATED: {$preset['name']}";
        $alertMessage = "CDRRMO has activated the {$preset['name']} affecting: " . implode(', ', $preset['barangays']) . ". Prepare for pre-emptive evacuation and avoid low-lying corridors.";

        try {
            BroadcastAlert::create([
                'title' => $alertTitle,
                'message' => $alertMessage,
                'severity' => 'critical',
                'scope' => 'all',
                'created_by' => auth()->id() ?? 1,
            ]);

            $tokens = User::whereNotNull('push_token')->pluck('push_token')->toArray();
            if (!empty($tokens)) {
                PushNotificationService::send($tokens, $alertTitle, $alertMessage, [
                    'type' => 'geohazard_preset_activated',
                    'preset_key' => $key,
                    'hazard_id' => $hazard->id,
                ]);
            }
        } catch (\Throwable $e) {
        }

        return response()->json([
            'status' => 'success',
            'action' => 'activated',
            'message' => "Preset '{$preset['name']}' is now ACTIVE.",
            'preset_key' => $key,
            'data' => $hazard,
        ], 201);
    }

    public function getActiveHazards()
    {
        $hazards = Hazard::where('is_active', true)->get();

        return response()->json([
            'status' => 'success',
            'count' => $hazards->count(),
            'data' => $hazards,
        ]);
    }

    public function resolveHazard($id)
    {
        $hazard = Hazard::findOrFail($id);
        $hazard->update(['is_active' => false]);

        // Broadcast real-time removal with fallback guard
        try {
            broadcast(new HazardResolved((int) $id));
        } catch (\Throwable $e) {
            \Log::warning('WebSocket broadcast warning: '.$e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Hazard zone resolved successfully.',
            'data' => $hazard,
        ]);
    }

    public function toggleSimulation(Request $request)
    {
        $validated = $request->validate([
            'simulation_type' => 'required|in:none,siege,flood,fire,chemical,earthquake',
        ]);

        $simType = $validated['simulation_type'];

        // Deactivate all existing hazards first for clean simulation switching
        Hazard::query()->update(['is_active' => false]);

        if ($simType === 'none') {
            try {
                broadcast(new HazardResolved(0));
            } catch (\Throwable $e) {
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Disaster test simulation toggled OFF. Normal operational view active.',
                'active_simulation' => 'none',
            ]);
        }

        // Activate specific disaster simulation hazards
        $targetType = $simType === 'chemical' ? 'chemical_spill' : $simType;
        Hazard::where('hazard_type', $targetType)->update(['is_active' => true]);

        $activeHazard = Hazard::where('is_active', true)
            ->where('hazard_type', $targetType)
            ->first();

        if ($activeHazard) {
            if ($simType === 'earthquake') {
                try {
                    BroadcastAlert::create([
                        'title' => '🚨 EARTHQUAKE WARNING: MAGNITUDE 6.8 TREMORS DETECTED',
                        'message' => "An Earthquake tremor has been detected at Epicenter Latitude: {$activeHazard->latitude}° N, Longitude: {$activeHazard->longitude}° E. Duck, Cover & Hold! Proceed to open area safe zones.",
                        'severity' => 'critical',
                        'scope' => 'all',
                        'created_by' => auth()->id() ?? 1,
                    ]);
                } catch (\Throwable $e) {
                }
            }

            try {
                broadcast(new HazardCreated($activeHazard));
            } catch (\Throwable $e) {
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Disaster test simulation '{$simType}' toggled ON.",
            'active_simulation' => $simType,
            'data' => $activeHazard,
        ]);
    }
}
