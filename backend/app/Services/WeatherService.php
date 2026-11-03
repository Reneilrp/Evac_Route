<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WeatherService
{
    protected string $apiKey;

    protected float $lat = 6.9126;

    protected float $lon = 122.0729;

    public function __construct()
    {
        $this->apiKey = config('services.openweather.key') ?? env('OPENWEATHER_API_KEY', '');
    }

    /**
     * Retrieves rich weather telemetry for Zamboanga City.
     * Uses OpenWeatherMap when configured, falling back to Open-Meteo.
     */
    public function getLiveTelemetry(): array
    {
        $isRaining = false;
        $condition = 'Clear';
        $description = 'Clear skies';
        $tempC = 29.0;
        $humidity = 75;
        $rainMm = 0.0;
        $source = 'open-meteo';

        if (! empty($this->apiKey)) {
            try {
                $response = Http::timeout(4)->get('https://api.openweathermap.org/data/2.5/weather', [
                    'lat' => $this->lat,
                    'lon' => $this->lon,
                    'appid' => $this->apiKey,
                    'units' => 'metric',
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $weather = $data['weather'][0] ?? [];
                    $mainCondition = $weather['main'] ?? 'Clear';
                    $conditionId = $weather['id'] ?? 800;

                    $isRaining = in_array(strtolower($mainCondition), ['rain', 'drizzle', 'thunderstorm'])
                        || ($conditionId >= 200 && $conditionId < 600);

                    $condition = $mainCondition;
                    $description = $weather['description'] ?? $mainCondition;
                    $tempC = (float) ($data['main']['temp'] ?? 29.0);
                    $humidity = (int) ($data['main']['humidity'] ?? 75);
                    $rainMm = (float) ($data['rain']['1h'] ?? ($isRaining ? 2.5 : 0.0));
                    $source = 'openweathermap';

                    return [
                        'is_raining' => $isRaining,
                        'condition' => $condition,
                        'description' => $description,
                        'temp_c' => round($tempC, 1),
                        'humidity' => $humidity,
                        'rain_mm' => round($rainMm, 1),
                        'source' => $source,
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('OpenWeatherMap telemetry error: '.$e->getMessage().'. Falling back to Open-Meteo.');
            }
        }

        // Fallback: Open-Meteo
        try {
            $response = Http::timeout(4)->get('https://api.open-meteo.com/v1/forecast', [
                'latitude' => $this->lat,
                'longitude' => $this->lon,
                'current' => 'rain,showers,weather_code,temperature_2m,relative_humidity_2m',
            ]);

            if ($response->successful()) {
                $current = $response->json('current') ?? [];
                $rain = (float) ($current['rain'] ?? 0);
                $showers = (float) ($current['showers'] ?? 0);
                $weatherCode = (int) ($current['weather_code'] ?? 0);
                $rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

                $isRaining = $rain > 0 || $showers > 0 || in_array($weatherCode, $rainCodes);
                $condition = $isRaining ? 'Rain' : 'Clear';
                $description = $isRaining ? ($weatherCode >= 95 ? 'Thunderstorm' : 'Rain Showers') : 'Clear / Partly Cloudy';
                $tempC = (float) ($current['temperature_2m'] ?? 29.0);
                $humidity = (int) ($current['relative_humidity_2m'] ?? 75);
                $rainMm = max($rain, $showers);

                return [
                    'is_raining' => $isRaining,
                    'condition' => $condition,
                    'description' => $description,
                    'temp_c' => round($tempC, 1),
                    'humidity' => $humidity,
                    'rain_mm' => round($rainMm, 1),
                    'source' => 'open-meteo',
                ];
            }
        } catch (\Exception $e) {
            Log::error('Open-Meteo telemetry error: '.$e->getMessage());
        }

        return [
            'is_raining' => $this->isCurrentlyRaining(),
            'condition' => 'Clear',
            'description' => 'Clear skies',
            'temp_c' => 29.0,
            'humidity' => 75,
            'rain_mm' => 0.0,
            'source' => 'fallback',
        ];
    }

    /**
     * Checks if it is currently raining at the Zamboanga City coordinates.
     * Tries OpenWeatherMap first, then falls back to Open-Meteo if needed.
     */
    public function isCurrentlyRaining(): bool
    {
        // Primary: OpenWeatherMap (if API key configured)
        if (! empty($this->apiKey)) {
            try {
                $response = Http::get('https://api.openweathermap.org/data/2.5/weather', [
                    'lat' => $this->lat,
                    'lon' => $this->lon,
                    'appid' => $this->apiKey,
                ]);

                if ($response->successful()) {
                    $weather = $response->json('weather');

                    if (! empty($weather) && is_array($weather)) {
                        $mainCondition = $weather[0]['main'] ?? '';
                        $conditionId = $weather[0]['id'] ?? 0;

                        // OpenWeatherMap condition IDs: 5xx is Rain, 3xx is Drizzle, 2xx is Thunderstorm
                        $isRain = in_array(strtolower($mainCondition), ['rain', 'drizzle', 'thunderstorm'])
                            || ($conditionId >= 200 && $conditionId < 600);

                        return $isRain;
                    }
                } else {
                    Log::warning('OpenWeatherMap API call failed (HTTP '.$response->status().'). Falling back to Open-Meteo.');
                }
            } catch (\Exception $e) {
                Log::warning('OpenWeatherMap error: '.$e->getMessage().'. Falling back to Open-Meteo.');
            }
        } else {
            Log::info('OpenWeatherMap API key is not configured. Falling back to Open-Meteo.');
        }

        // Secondary / Fallback: Open-Meteo (No API Key required)
        return $this->checkOpenMeteo();
    }

    /**
     * Fallback rain check using Open-Meteo API (Free, no API key required).
     */
    protected function checkOpenMeteo(): bool
    {
        try {
            $response = Http::get('https://api.open-meteo.com/v1/forecast', [
                'latitude' => $this->lat,
                'longitude' => $this->lon,
                'current' => 'rain,showers,weather_code',
            ]);

            if ($response->successful()) {
                $current = $response->json('current');

                if (is_array($current)) {
                    $rain = (float) ($current['rain'] ?? 0);
                    $showers = (float) ($current['showers'] ?? 0);
                    $weatherCode = (int) ($current['weather_code'] ?? 0);

                    // WMO Weather Interpretation Codes:
                    // 51, 53, 55: Drizzle
                    // 56, 57: Freezing Drizzle
                    // 61, 63, 65: Rain (Slight, Moderate, Heavy)
                    // 66, 67: Freezing Rain
                    // 80, 81, 82: Rain Showers
                    // 95, 96, 99: Thunderstorms
                    $rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

                    return $rain > 0 || $showers > 0 || in_array($weatherCode, $rainCodes);
                }
            } else {
                Log::error('Open-Meteo API call failed (HTTP '.$response->status().').');
            }
        } catch (\Exception $e) {
            Log::error('Open-Meteo API error: '.$e->getMessage());
        }

        return false;
    }
}
