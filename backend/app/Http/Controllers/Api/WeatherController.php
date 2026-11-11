<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hazard;
use App\Models\Setting;
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

        $thresholdMinutes = (int) Setting::get('auto_flood_rain_threshold_minutes', 45);
        $autoActivationEnabled = filter_var(Setting::get('auto_flood_activation_enabled', true), FILTER_VALIDATE_BOOLEAN);

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
                Hazard::where('hazard_type', 'flood')
                    ->where('is_fixed_flood_spot', true)
                    ->update(['is_active' => false]);
                $rainStartedAt = null;
            }
        }

        $durationMinutes = 0;
        if ($rainStartedAt) {
            $durationMinutes = (int) round(abs(now()->diffInMinutes(Carbon::parse($rainStartedAt))));
        }

        $fixedFloodSpotsTriggered = (bool) Cache::get('fixed_flood_spots_triggered', false);

        // Auto-activate chronic drainage flood spots if duration meets or exceeds threshold
        if ($isRaining && $autoActivationEnabled && $durationMinutes >= $thresholdMinutes && ! $fixedFloodSpotsTriggered) {
            Hazard::where('hazard_type', 'flood')
                ->where('is_fixed_flood_spot', true)
                ->update(['is_active' => true]);
            Cache::forever('fixed_flood_spots_triggered', true);
            $fixedFloodSpotsTriggered = true;
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
                'flood_trigger_threshold_minutes' => $thresholdMinutes,
                'auto_activation_enabled' => $autoActivationEnabled,
                'fixed_flood_spots_triggered' => $fixedFloodSpotsTriggered,
                'active_presets_count' => $activePresetsCount,
                'active_fixed_flood_spots_count' => $activeFixedFloodSpotsCount,
                'system_recommendation' => $isRaining
                    ? ($durationMinutes >= $thresholdMinutes
                        ? "High flood risk: Continuous rain duration ({$durationMinutes}m) reached configured {$thresholdMinutes}m threshold. Chronic drainage flood corridors active."
                        : "Rain detected: Continuous for {$durationMinutes}m ({$thresholdMinutes}m auto-trigger threshold).")
                    : 'Clear / Normal operational state.',
                'checked_at' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get comprehensive Google Weather-style 24h history, 24h hourly forecast, and 7-day outlook.
     * Route: GET /api/weather/forecast
     */
    public function forecast(Request $request): JsonResponse
    {
        $forceRefresh = $request->boolean('refresh', false);
        $cacheKey = 'zamboanga_weather_forecast_v1';

        if ($forceRefresh) {
            Cache::forget($cacheKey);
        }

        try {
            $forecastData = Cache::remember($cacheKey, 600, function () {
                if (method_exists($this->weatherService, 'getForecastAndHistory')) {
                    return $this->weatherService->getForecastAndHistory();
                }

                return [];
            });
        } catch (\Throwable $e) {
            $forecastData = [];
        }

        $thresholdMinutes = (int) Setting::get('auto_flood_rain_threshold_minutes', 45);
        $autoActivationEnabled = filter_var(Setting::get('auto_flood_activation_enabled', true), FILTER_VALIDATE_BOOLEAN);
        $rainStartedAt = Cache::get('rain_started_at');
        $durationMinutes = $rainStartedAt
            ? (int) round(abs(now()->diffInMinutes(Carbon::parse($rainStartedAt))))
            : 0;

        $activePresetsCount = Hazard::whereNotNull('preset_key')
            ->where('is_active', true)
            ->count();

        $activeFixedFloodSpotsCount = Hazard::where('hazard_type', 'flood')
            ->where('is_fixed_flood_spot', true)
            ->where('is_active', true)
            ->count();

        return response()->json([
            'status' => 'success',
            'data' => array_merge($forecastData, [
                'city' => 'Zamboanga City',
                'coordinates' => [
                    'latitude' => 6.9126,
                    'longitude' => 122.0729,
                ],
                'eoc_telemetry' => [
                    'rain_started_at' => $rainStartedAt,
                    'continuous_rain_duration_minutes' => $durationMinutes,
                    'flood_trigger_threshold_minutes' => $thresholdMinutes,
                    'auto_activation_enabled' => $autoActivationEnabled,
                    'fixed_flood_spots_triggered' => (bool) Cache::get('fixed_flood_spots_triggered', false),
                    'active_presets_count' => $activePresetsCount,
                    'active_fixed_flood_spots_count' => $activeFixedFloodSpotsCount,
                ],
                'checked_at' => now()->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Manually reset/clear rain state, continuous counter, and auto-activated fixed flood spots.
     * Route: POST /api/weather/reset-rain
     */
    public function resetRainState(Request $request): JsonResponse
    {
        Cache::forget('rain_started_at');
        Cache::forget('fixed_flood_spots_triggered');

        Hazard::where('hazard_type', 'flood')
            ->where('is_fixed_flood_spot', true)
            ->update(['is_active' => false]);

        return response()->json([
            'status' => 'success',
            'message' => 'Rainfall telemetry alert and continuous flood counters have been reset successfully.',
            'reset_at' => now()->toIso8601String(),
        ]);
    }
}
