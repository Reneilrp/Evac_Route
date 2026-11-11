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

                    $isGeneralRain = in_array(strtolower($mainCondition), ['rain', 'drizzle', 'thunderstorm'])
                        || ($conditionId >= 200 && $conditionId < 600);

                    $condition = $mainCondition;
                    $description = $weather['description'] ?? $mainCondition;
                    $tempC = (float) ($data['main']['temp'] ?? 29.0);
                    $humidity = (int) ($data['main']['humidity'] ?? 75);
                    $rainMm = isset($data['rain']['1h']) ? (float) $data['rain']['1h'] : ($isGeneralRain ? 2.5 : 0.0);
                    $source = 'openweathermap';

                    // DRRM threshold: rain under 1.0 mm/h is trace drizzle that does not accumulate on streets/canals.
                    // Meaningful flood-producing rainfall requires >= 1.0 mm/h or active thunderstorm/heavy downpour.
                    $isSignificantRain = ($rainMm >= 1.0)
                        || in_array(strtolower($mainCondition), ['thunderstorm'])
                        || in_array($conditionId, [200, 201, 202, 211, 212, 221, 230, 231, 232, 502, 503, 504, 522]);

                    $isTraceRain = ! $isSignificantRain && ($rainMm > 0 || $isGeneralRain);

                    return [
                        'is_raining' => $isSignificantRain,
                        'is_trace_rain' => $isTraceRain,
                        'condition' => $isTraceRain && ! $isSignificantRain ? 'Trace Drizzle' : $condition,
                        'description' => $description,
                        'temp_c' => round($tempC, 1),
                        'humidity' => $humidity,
                        'rain_mm' => round($rainMm, 2),
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

                $rainMm = max($rain, $showers);
                $isGeneralRain = $rainMm > 0 || in_array($weatherCode, $rainCodes);

                // Significant rain threshold: >= 1.0 mm/h or moderate/heavy rain or thunderstorm (WMO >= 63 or 95+)
                $isSignificantRain = ($rainMm >= 1.0) || in_array($weatherCode, [63, 65, 67, 81, 82, 95, 96, 99]);
                $isTraceRain = ! $isSignificantRain && $isGeneralRain;

                $condition = $isSignificantRain ? 'Rain' : ($isTraceRain ? 'Trace Drizzle' : 'Clear');
                $description = $isSignificantRain
                    ? ($weatherCode >= 95 ? 'Thunderstorm' : 'Rain Showers')
                    : ($isTraceRain ? 'Light Drizzle / Trace Mist' : 'Clear / Partly Cloudy');
                $tempC = (float) ($current['temperature_2m'] ?? 29.0);
                $humidity = (int) ($current['relative_humidity_2m'] ?? 75);

                return [
                    'is_raining' => $isSignificantRain,
                    'is_trace_rain' => $isTraceRain,
                    'condition' => $condition,
                    'description' => $description,
                    'temp_c' => round($tempC, 1),
                    'humidity' => $humidity,
                    'rain_mm' => round($rainMm, 2),
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
                        $conditionId = (int) ($weather[0]['id'] ?? 0);
                        $rain1h = (float) ($response->json('rain.1h') ?? -1.0);

                        // If explicit 1h rain amount is provided by OpenWeather
                        if ($rain1h >= 0.0) {
                            return $rain1h >= 1.0
                                || in_array(strtolower($mainCondition), ['thunderstorm'])
                                || in_array($conditionId, [200, 201, 202, 211, 212, 221, 230, 231, 232, 502, 503, 504, 522]);
                        }

                        // OpenWeatherMap condition IDs: 5xx is Rain, 3xx is Drizzle, 2xx is Thunderstorm
                        // DRRM threshold: trace drizzle (500/3xx) is excluded from flood alarms
                        $isSignificantRain = in_array(strtolower($mainCondition), ['thunderstorm'])
                            || ($conditionId >= 200 && $conditionId < 300)
                            || in_array($conditionId, [501, 502, 503, 504, 520, 521, 522]);

                        return $isSignificantRain;
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
                    $rainMm = max($rain, $showers);

                    // Significant rain threshold: >= 1.0 mm/h or moderate/heavy rain or thunderstorm
                    return ($rainMm >= 1.0) || in_array($weatherCode, [63, 65, 67, 81, 82, 95, 96, 99]);
                }
            } else {
                Log::error('Open-Meteo API call failed (HTTP '.$response->status().').');
            }
        } catch (\Exception $e) {
            Log::error('Open-Meteo API error: '.$e->getMessage());
        }

        return false;
    }

    /**
     * Maps WMO weather interpretation code to condition category and readable description.
     */
    public function mapWmoCode(int $code): array
    {
        return match (true) {
            $code === 0 => ['condition' => 'Clear', 'description' => 'Clear sky'],
            $code === 1 => ['condition' => 'Clear', 'description' => 'Mainly clear'],
            $code === 2 => ['condition' => 'Partly Cloudy', 'description' => 'Partly cloudy'],
            $code === 3 => ['condition' => 'Cloudy', 'description' => 'Overcast clouds'],
            in_array($code, [45, 48]) => ['condition' => 'Fog', 'description' => 'Haze / Foggy conditions'],
            in_array($code, [51, 53, 55, 56, 57]) => ['condition' => 'Drizzle', 'description' => $code >= 55 ? 'Dense drizzle' : 'Light to moderate drizzle'],
            in_array($code, [61, 80]) => ['condition' => 'Rain', 'description' => 'Slight rain showers'],
            in_array($code, [63, 81]) => ['condition' => 'Rain', 'description' => 'Moderate rain showers'],
            in_array($code, [65, 66, 67, 82]) => ['condition' => 'Heavy Rain', 'description' => 'Heavy rain downpour'],
            in_array($code, [95, 96, 99]) => ['condition' => 'Thunderstorm', 'description' => 'Thunderstorm with heavy rain'],
            default => ['condition' => 'Partly Cloudy', 'description' => 'Scattered clouds'],
        };
    }

    /**
     * Converts wind direction degrees to cardinal compass string.
     */
    protected function degreesToCardinal(float $deg): string
    {
        $directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        $idx = (int) round(((fmod($deg, 360) + 360) % 360) / 22.5) % 16;

        return $directions[$idx] ?? 'NE';
    }

    /**
     * Retrieves comprehensive Google Weather-style forecast (next 24h hourly + 7-day daily)
     * and historical telemetry (past 24h hourly) for Zamboanga City.
     */
    public function getForecastAndHistory(): array
    {
        $tz = 'Asia/Manila';

        try {
            $response = Http::timeout(6)->get('https://api.open-meteo.com/v1/forecast', [
                'latitude' => $this->lat,
                'longitude' => $this->lon,
                'timezone' => $tz,
                'past_days' => 1,
                'forecast_days' => 7,
                'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index',
                'hourly' => 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m,uv_index',
                'daily' => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset',
            ]);

            if ($response->successful()) {
                $payload = $response->json();

                return $this->formatOpenMeteoForecast($payload, $tz);
            }
        } catch (\Exception $e) {
            Log::warning('Open-Meteo forecast fetch failed: '.$e->getMessage().'. Using fallback forecast.');
        }

        return $this->buildFallbackForecast($tz);
    }

    /**
     * Parses Open-Meteo response into structured current, past 24h history, next 24h forecast, and 7-day outlook.
     */
    protected function formatOpenMeteoForecast(array $payload, string $tz): array
    {
        $nowManila = now($tz);
        $currentHourIsoPrefix = $nowManila->format('Y-m-d\TH:00');

        $currentRaw = $payload['current'] ?? [];
        $currentCode = (int) ($currentRaw['weather_code'] ?? 1);
        $currentMapped = $this->mapWmoCode($currentCode);
        $currentRain = max((float) ($currentRaw['rain'] ?? 0), (float) ($currentRaw['precipitation'] ?? 0), (float) ($currentRaw['showers'] ?? 0));
        // Significant rain threshold: >= 1.0 mm/h or moderate/heavy or thunderstorm
        $isSignificantRain = ($currentRain >= 1.0) || in_array($currentCode, [63, 65, 67, 81, 82, 95, 96, 99]);
        $isTraceRain = ! $isSignificantRain && ($currentRain > 0 || in_array($currentCode, [51, 53, 55, 56, 57, 61, 80]));

        $windDeg = (float) ($currentRaw['wind_direction_10m'] ?? 45);
        $currentDetails = [
            'temp_c' => round((float) ($currentRaw['temperature_2m'] ?? 29.0), 1),
            'feels_like_c' => round((float) ($currentRaw['apparent_temperature'] ?? 32.0), 1),
            'humidity' => (int) ($currentRaw['relative_humidity_2m'] ?? 75),
            'rain_mm' => round($currentRain, 2),
            'wind_kph' => round((float) ($currentRaw['wind_speed_10m'] ?? 12.0), 1),
            'wind_deg' => (int) round($windDeg),
            'wind_dir' => $this->degreesToCardinal($windDeg),
            'pressure_hpa' => (int) round((float) ($currentRaw['pressure_msl'] ?? 1010)),
            'cloud_cover' => (int) ($currentRaw['cloud_cover'] ?? 40),
            'uv_index' => round((float) ($currentRaw['uv_index'] ?? 5.0), 1),
            'weather_code' => $currentCode,
            'condition' => $isSignificantRain ? $currentMapped['condition'] : ($isTraceRain ? 'Trace Drizzle' : $currentMapped['condition']),
            'description' => $isTraceRain ? 'Light Drizzle / Trace Mist' : $currentMapped['description'],
            'is_raining' => $isSignificantRain,
            'is_trace_rain' => $isTraceRain,
        ];

        $hourly = $payload['hourly'] ?? [];
        $times = $hourly['time'] ?? [];
        $currentIdx = 24; // Default middle index if past_days=1

        foreach ($times as $idx => $timeStr) {
            if (str_starts_with($timeStr, $currentHourIsoPrefix)) {
                $currentIdx = $idx;
                break;
            }
        }

        $buildHourPoint = function (int $idx, bool $isCurrent = false) use ($hourly, $times, $tz, $rainCodes): array {
            $tStr = $times[$idx] ?? now($tz)->toIso8601String();
            $dt = \Carbon\Carbon::parse($tStr, $tz);
            $code = (int) ($hourly['weather_code'][$idx] ?? 1);
            $mapped = $this->mapWmoCode($code);
            $rainVal = max((float) ($hourly['rain'][$idx] ?? 0), (float) ($hourly['precipitation'][$idx] ?? 0));
            $popVal = (int) ($hourly['precipitation_probability'][$idx] ?? ($rainVal > 0 ? 75 : (in_array($code, $rainCodes) ? 60 : 10)));

            return [
                'time' => $dt->toIso8601String(),
                'hour_label' => $isCurrent ? 'Now' : $dt->format('g A'),
                'day_label' => $dt->isToday() ? 'Today' : ($dt->isYesterday() ? 'Yesterday' : ($dt->isTomorrow() ? 'Tomorrow' : $dt->format('D'))),
                'temp_c' => round((float) ($hourly['temperature_2m'][$idx] ?? 28.0), 1),
                'feels_like_c' => round((float) ($hourly['apparent_temperature'][$idx] ?? 31.0), 1),
                'humidity' => (int) ($hourly['relative_humidity_2m'][$idx] ?? 75),
                'rain_mm' => round($rainVal, 2),
                'pop' => min(100, max(0, $popVal)),
                'wind_kph' => round((float) ($hourly['wind_speed_10m'][$idx] ?? 10.0), 1),
                'uv_index' => round((float) ($hourly['uv_index'][$idx] ?? 0.0), 1),
                'weather_code' => $code,
                'condition' => $mapped['condition'],
                'description' => $mapped['description'],
                'is_raining' => $rainVal > 0.05 || in_array($code, $rainCodes),
                'is_now' => $isCurrent,
            ];
        };

        // Past 24 hours (from currentIdx - 23 up to currentIdx)
        $hourlyHistory = [];
        $startHistoryIdx = max(0, $currentIdx - 23);
        for ($i = $startHistoryIdx; $i <= $currentIdx && $i < count($times); $i++) {
            $hourlyHistory[] = $buildHourPoint($i, $i === $currentIdx);
        }

        // Next 24 hours (from currentIdx up to currentIdx + 23)
        $hourlyForecast = [];
        $endForecastIdx = min(count($times) - 1, $currentIdx + 23);
        for ($i = $currentIdx; $i <= $endForecastIdx; $i++) {
            $hourlyForecast[] = $buildHourPoint($i, $i === $currentIdx);
        }

        // Daily 7-day forecast (skip yesterday at index 0 because past_days=1 puts yesterday at index 0)
        $daily = $payload['daily'] ?? [];
        $dailyDates = $daily['time'] ?? [];
        $todayStr = $nowManila->format('Y-m-d');
        $dailyForecast = [];

        foreach ($dailyDates as $dIdx => $dateStr) {
            if ($dateStr < $todayStr) {
                continue;
            }
            $dt = \Carbon\Carbon::parse($dateStr, $tz);
            $dCode = (int) ($daily['weather_code'][$dIdx] ?? 1);
            $dMapped = $this->mapWmoCode($dCode);
            $dRain = max((float) ($daily['precipitation_sum'][$dIdx] ?? 0), (float) ($daily['rain_sum'][$dIdx] ?? 0));
            $dPop = (int) ($daily['precipitation_probability_max'][$dIdx] ?? ($dRain > 0 ? 70 : 15));

            $sunriseRaw = $daily['sunrise'][$dIdx] ?? null;
            $sunsetRaw = $daily['sunset'][$dIdx] ?? null;

            $dailyForecast[] = [
                'date' => $dateStr,
                'day_name' => $dt->isSameDay($nowManila) ? 'Today' : ($dt->isTomorrow() ? 'Tomorrow' : $dt->format('D, M j')),
                'short_day' => $dt->isSameDay($nowManila) ? 'Today' : $dt->format('D'),
                'weather_code' => $dCode,
                'condition' => $dMapped['condition'],
                'description' => $dMapped['description'],
                'temp_max_c' => round((float) ($daily['temperature_2m_max'][$dIdx] ?? 32.0), 1),
                'temp_min_c' => round((float) ($daily['temperature_2m_min'][$dIdx] ?? 25.0), 1),
                'pop_max' => min(100, max(0, $dPop)),
                'rain_sum_mm' => round($dRain, 1),
                'wind_max_kph' => round((float) ($daily['wind_speed_10m_max'][$dIdx] ?? 18.0), 1),
                'uv_max' => round((float) ($daily['uv_index_max'][$dIdx] ?? 8.0), 1),
                'sunrise' => $sunriseRaw ? \Carbon\Carbon::parse($sunriseRaw, $tz)->format('g:i A') : '5:52 AM',
                'sunset' => $sunsetRaw ? \Carbon\Carbon::parse($sunsetRaw, $tz)->format('g:i A') : '5:48 PM',
            ];

            if (count($dailyForecast) >= 7) {
                break;
            }
        }

        return [
            'source' => 'open-meteo',
            'current' => $currentDetails,
            'hourly_history' => $hourlyHistory,
            'hourly_forecast' => $hourlyForecast,
            'daily_forecast' => $dailyForecast,
            'summary' => $this->computeWeatherSummary($hourlyHistory, $hourlyForecast, $currentDetails),
        ];
    }

    /**
     * Computes tactical DRRM summary metrics from past 24h and next 24h hourly series.
     */
    protected function computeWeatherSummary(array $history, array $forecast, array $current): array
    {
        $pastRainTotal = 0.0;
        $pastPeakRain = 0.0;
        $pastRainyHours = 0;

        foreach ($history as $h) {
            $r = (float) ($h['rain_mm'] ?? 0);
            $pastRainTotal += $r;
            if ($r > $pastPeakRain) {
                $pastPeakRain = $r;
            }
            if ($r >= 0.1 || ! empty($h['is_raining'])) {
                $pastRainyHours++;
            }
        }

        $nextRainTotal = 0.0;
        $nextMaxPop = 0;
        $nextRainSlot = null;

        foreach ($forecast as $idx => $f) {
            $r = (float) ($f['rain_mm'] ?? 0);
            $pop = (int) ($f['pop'] ?? 0);
            $nextRainTotal += $r;
            if ($pop > $nextMaxPop) {
                $nextMaxPop = $pop;
            }
            if ($idx > 0 && $nextRainSlot === null && ($pop >= 50 || $r >= 0.3 || ! empty($f['is_raining']))) {
                $nextRainSlot = [
                    'hour_label' => $f['hour_label'],
                    'day_label' => $f['day_label'],
                    'pop' => $pop,
                    'rain_mm' => round($r, 1),
                    'description' => $f['description'],
                ];
            }
        }

        if (! empty($current['is_raining'])) {
            $headline = sprintf(
                'Active precipitation in Zamboanga City (%s, %.1f mm/h). %.1f mm recorded in the past 24h; %.1f mm projected over the next 24h.',
                $current['description'],
                $current['rain_mm'],
                $pastRainTotal,
                $nextRainTotal
            );
        } elseif ($nextRainSlot !== null) {
            $headline = sprintf(
                '%s expected around %s (%s) with %d%% probability. Projected 24h rainfall accumulation: %.1f mm.',
                $nextRainSlot['description'],
                $nextRainSlot['hour_label'],
                $nextRainSlot['day_label'],
                $nextRainSlot['pop'],
                $nextRainTotal
            );
        } else {
            $headline = sprintf(
                'Stable weather outlook across Zamboanga City. Low precipitation chance (%d%% max) over the next 24 hours.',
                $nextMaxPop
            );
        }

        return [
            'past_24h_rain_total_mm' => round($pastRainTotal, 1),
            'past_24h_peak_rain_mm' => round($pastPeakRain, 1),
            'past_24h_rainy_hours' => $pastRainyHours,
            'next_24h_rain_total_mm' => round($nextRainTotal, 1),
            'next_24h_max_pop' => $nextMaxPop,
            'next_rain_expected' => $nextRainSlot,
            'headline' => $headline,
        ];
    }

    /**
     * Generates a resilient fallback forecast if external weather APIs are unreachable.
     */
    protected function buildFallbackForecast(string $tz): array
    {
        $now = now($tz)->startOfHour();
        $live = $this->getLiveTelemetry();
        $isRaining = (bool) ($live['is_raining'] ?? false);
        $baseTemp = (float) ($live['temp_c'] ?? 29.0);

        $hourlyHistory = [];
        for ($i = 23; $i >= 0; $i--) {
            $dt = $now->copy()->subHours($i);
            $hour = (int) $dt->format('G');
            $isDay = $hour >= 6 && $hour <= 18;
            $tempOffset = $isDay ? sin(($hour - 6) / 12 * M_PI) * 3.5 : -1.5;
            $rainMm = ($isRaining && $i <= 2) ? 1.8 : 0.0;

            $hourlyHistory[] = [
                'time' => $dt->toIso8601String(),
                'hour_label' => $i === 0 ? 'Now' : $dt->format('g A'),
                'day_label' => $dt->isToday() ? 'Today' : 'Yesterday',
                'temp_c' => round($baseTemp + $tempOffset - 1.0, 1),
                'feels_like_c' => round($baseTemp + $tempOffset + 2.0, 1),
                'humidity' => $isDay ? 72 : 84,
                'rain_mm' => $rainMm,
                'pop' => $rainMm > 0 ? 80 : 15,
                'wind_kph' => $isDay ? 14.0 : 9.0,
                'uv_index' => $isDay ? round(sin(($hour - 6) / 12 * M_PI) * 8, 1) : 0.0,
                'weather_code' => $rainMm > 0 ? 61 : ($isDay ? 1 : 2),
                'condition' => $rainMm > 0 ? 'Rain' : 'Partly Cloudy',
                'description' => $rainMm > 0 ? 'Slight rain showers' : 'Partly cloudy',
                'is_raining' => $rainMm > 0,
                'is_now' => $i === 0,
            ];
        }

        $hourlyForecast = [];
        for ($i = 0; $i < 24; $i++) {
            $dt = $now->copy()->addHours($i);
            $hour = (int) $dt->format('G');
            $isDay = $hour >= 6 && $hour <= 18;
            $tempOffset = $isDay ? sin(($hour - 6) / 12 * M_PI) * 3.5 : -1.5;
            $afternoonShower = ($hour >= 15 && $hour <= 17);
            $rainMm = ($isRaining && $i <= 1) ? 2.0 : ($afternoonShower ? 0.8 : 0.0);
            $pop = $rainMm > 0 ? 65 : ($afternoonShower ? 55 : 20);

            $hourlyForecast[] = [
                'time' => $dt->toIso8601String(),
                'hour_label' => $i === 0 ? 'Now' : $dt->format('g A'),
                'day_label' => $dt->isToday() ? 'Today' : 'Tomorrow',
                'temp_c' => round($baseTemp + $tempOffset - 1.0, 1),
                'feels_like_c' => round($baseTemp + $tempOffset + 2.0, 1),
                'humidity' => $isDay ? 74 : 85,
                'rain_mm' => $rainMm,
                'pop' => $pop,
                'wind_kph' => $isDay ? 15.0 : 10.0,
                'uv_index' => $isDay ? round(sin(($hour - 6) / 12 * M_PI) * 8, 1) : 0.0,
                'weather_code' => $rainMm > 0 ? 80 : 2,
                'condition' => $rainMm > 0 ? 'Rain' : 'Partly Cloudy',
                'description' => $rainMm > 0 ? 'Scattered rain showers' : 'Partly cloudy',
                'is_raining' => $rainMm > 0,
                'is_now' => $i === 0,
            ];
        }

        $dailyForecast = [];
        for ($d = 0; $d < 7; $d++) {
            $dt = $now->copy()->addDays($d);
            $dailyForecast[] = [
                'date' => $dt->format('Y-m-d'),
                'day_name' => $d === 0 ? 'Today' : ($d === 1 ? 'Tomorrow' : $dt->format('D, M j')),
                'short_day' => $d === 0 ? 'Today' : $dt->format('D'),
                'weather_code' => $d % 3 === 1 ? 80 : 2,
                'condition' => $d % 3 === 1 ? 'Rain' : 'Partly Cloudy',
                'description' => $d % 3 === 1 ? 'Afternoon rain showers' : 'Partly cloudy skies',
                'temp_max_c' => 32.0 - ($d % 2),
                'temp_min_c' => 25.0,
                'pop_max' => $d % 3 === 1 ? 65 : 25,
                'rain_sum_mm' => $d % 3 === 1 ? 4.2 : 0.4,
                'wind_max_kph' => 16.0,
                'uv_max' => 8.0,
                'sunrise' => '5:52 AM',
                'sunset' => '5:48 PM',
            ];
        }

        $currentDetails = [
            'temp_c' => $baseTemp,
            'feels_like_c' => round($baseTemp + 3.0, 1),
            'humidity' => (int) ($live['humidity'] ?? 75),
            'rain_mm' => (float) ($live['rain_mm'] ?? 0.0),
            'wind_kph' => 14.0,
            'wind_deg' => 45,
            'wind_dir' => 'NE',
            'pressure_hpa' => 1010,
            'cloud_cover' => $isRaining ? 85 : 40,
            'uv_index' => 6.0,
            'weather_code' => $isRaining ? 61 : 2,
            'condition' => $live['condition'] ?? ($isRaining ? 'Rain' : 'Partly Cloudy'),
            'description' => $live['description'] ?? ($isRaining ? 'Rain showers' : 'Partly cloudy'),
            'is_raining' => $isRaining,
        ];

        return [
            'source' => $live['source'] ?? 'fallback',
            'current' => $currentDetails,
            'hourly_history' => $hourlyHistory,
            'hourly_forecast' => $hourlyForecast,
            'daily_forecast' => $dailyForecast,
            'summary' => $this->computeWeatherSummary($hourlyHistory, $hourlyForecast, $currentDetails),
        ];
    }
}
