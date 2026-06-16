<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

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
     * Checks if it is currently raining at the Zamboanga City coordinates.
     */
    public function isCurrentlyRaining(): bool
    {
        if (empty($this->apiKey)) {
            \Log::warning('OpenWeatherMap API key is not configured.');
            return false;
        }

        try {
            $response = Http::get('https://api.openweathermap.org/data/2.5/weather', [
                'lat' => $this->lat,
                'lon' => $this->lon,
                'appid' => $this->apiKey,
            ]);

            if ($response->failed()) {
                \Log::error('OpenWeatherMap API call failed: ' . $response->body());
                return false;
            }

            $weather = $response->json('weather');

            if (!empty($weather) && is_array($weather)) {
                $mainCondition = $weather[0]['main'] ?? '';
                $conditionId = $weather[0]['id'] ?? 0;

                // OpenWeatherMap condition IDs: 5xx is Rain, 3xx is Drizzle, 2xx is Thunderstorm
                $isRain = in_array(strtolower($mainCondition), ['rain', 'drizzle', 'thunderstorm'])
                    || ($conditionId >= 200 && $conditionId < 600);

                return $isRain;
            }
        } catch (\Exception $e) {
            \Log::error('WeatherService error: ' . $e->getMessage());
        }

        return false;
    }
}
