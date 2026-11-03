<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hazard;
use App\Services\WeatherService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WeatherController extends Controller
{
    protected WeatherService $weatherService;

    public function __construct(WeatherService $weatherService)
    {
        $this->weatherService = $weatherService;
    }

    /**
     * Get live weather status and rain telemetry for Zamboanga City.
     * Route: GET /api/weather/live-status
     */
    public function liveStatus(Request $request): JsonResponse
    {
        $isRaining = $this->weatherService->isCurrentlyRaining();
        $telemetry = [];

        try {
            if (method_exists($this->weatherService, 'getLiveTelemetry')) {
                $telemetry = $this->weatherService->getLiveTelemetry();
            }
        } catch (\Throwable $e) {
            $telemetry = [];
        }

        $rainStartedAt = Cache::get('rain_started_at');

        if ($isRaining) {
            if (! $rainStartedAt) {
                $rainStartedAt = now()->toIso8601String();
                Cache::forever('rain_started_at', $rainStartedAt);
            }
        } else {
            if ($rainStartedAt) {
                Cache::forget('rain_started_at');
                Cache::forget('fixed_flood_spots_triggered');
                $rainStartedAt = null;
            }
        }

        $durationMinutes = 0;
        if ($rainStartedAt) {
            $durationMinutes = (int) round(abs(now()->diffInMinutes(Carbon::parse($rainStartedAt))));
        }

        $activePresetsCount = Hazard::whereNotNull('preset_key')
            ->where('is_active', true)
            ->count();

        $activeFixedFloodSpotsCount = Hazard::where('hazard_type', 'flood')
            ->where('is_fixed_flood_spot', true)
            ->where('is_active', true)
            ->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'city' => 'Zamboanga City',
                'coordinates' => [
                    'latitude' => 6.9126,
                    'longitude' => 122.0729,
                ],
                'is_raining' => $isRaining,
                'condition' => $telemetry['condition'] ?? ($isRaining ? 'Rain' : 'Clear'),
                'description' => $telemetry['description'] ?? ($isRaining ? 'Precipitation detected' : 'Clear skies'),
                'temp_c' => $telemetry['temp_c'] ?? 29.0,
                'humidity' => $telemetry['humidity'] ?? 75,
                'rain_mm' => $telemetry['rain_mm'] ?? 0.0,
                'telemetry_source' => $telemetry['source'] ?? 'telemetry',
                'rain_started_at' => $rainStartedAt,
                'continuous_rain_duration_minutes' => $durationMinutes,
                'fixed_flood_spots_triggered' => Cache::get('fixed_flood_spots_triggered', false),
                'active_presets_count' => $activePresetsCount,
                'active_fixed_flood_spots_count' => $activeFixedFloodSpotsCount,
                'system_recommendation' => $isRaining
                    ? ($durationMinutes >= 45
                        ? 'High flood risk: Immediate proactive river basin preset activation recommended.'
                        : 'Rain detected: Monitor river levels and stand by for Tumaga/Saaz alerts.')
                    : 'Clear / Normal operational state.',
                'checked_at' => now()->toIso8601String(),
            ],
        ]);
    }
}
