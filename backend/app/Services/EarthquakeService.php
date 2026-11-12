<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class EarthquakeService
{
    /**
     * Zamboanga City Anchor Coordinates
     */
    const ZAMBOANGA_LAT = 6.9214;
    const ZAMBOANGA_LNG = 122.0790;
    const DEFAULT_RADIUS_KM = 350; // Coverage across Zamboanga Peninsula, Basilan, Sulu Sea, Moro Gulf
    const CACHE_TTL_SECONDS = 300; // 5 minutes cache

    /**
     * Fetch recent earthquakes from USGS API near Zamboanga City or within Philippines
     *
     * @param float $radiusKm
     * @param float $minMagnitude
     * @param int $limit
     * @return array
     */
    public function getRecentEarthquakes(float $radiusKm = self::DEFAULT_RADIUS_KM, float $minMagnitude = 2.5, int $limit = 20): array
    {
        $cacheKey = "earthquakes_near_zamboanga_{$radiusKm}_{$minMagnitude}_{$limit}";

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($radiusKm, $minMagnitude, $limit) {
            try {
                $response = Http::timeout(10)->get('https://earthquake.usgs.gov/fdsnws/event/1/query', [
                    'format' => 'geojson',
                    'latitude' => self::ZAMBOANGA_LAT,
                    'longitude' => self::ZAMBOANGA_LNG,
                    'maxradiuskm' => $radiusKm,
                    'minmagnitude' => $minMagnitude,
                    'limit' => $limit,
                    'orderby' => 'time',
                ]);

                if (!$response->successful()) {
                    Log::warning('USGS Earthquake API request failed', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                    return [];
                }

                $data = $response->json();
                $features = $data['features'] ?? [];

                return array_map(function ($feature) {
                    $coords = $feature['geometry']['coordinates'] ?? [0, 0, 0];
                    $lng = (float) ($coords[0] ?? 0);
                    $lat = (float) ($coords[1] ?? 0);
                    $depth = (float) ($coords[2] ?? 0);
                    $props = $feature['properties'] ?? [];

                    $distKm = $this->calculateHaversineDistance(
                        self::ZAMBOANGA_LAT,
                        self::ZAMBOANGA_LNG,
                        $lat,
                        $lng
                    );

                    return [
                        'id' => $feature['id'] ?? uniqid('eq_'),
                        'title' => $props['title'] ?? 'Seismic Event',
                        'place' => $props['place'] ?? 'Unknown Location',
                        'magnitude' => (float) ($props['mag'] ?? 0),
                        'time' => $props['time'] ?? null,
                        'time_formatted' => isset($props['time']) ? date('Y-m-d H:i:s', (int) ($props['time'] / 1000)) : null,
                        'url' => $props['url'] ?? null,
                        'tsunami' => (int) ($props['tsunami'] ?? 0),
                        'latitude' => $lat,
                        'longitude' => $lng,
                        'depth_km' => $depth,
                        'distance_km' => round($distKm, 1),
                        'is_nearby_zamboanga' => $distKm <= 150,
                        'severity' => $this->classifySeverity((float) ($props['mag'] ?? 0)),
                    ];
                }, $features);
            } catch (\Throwable $e) {
                Log::error('USGS Earthquake API Exception: ' . $e->getMessage());
                return [];
            }
        });
    }

    /**
     * Classify earthquake severity based on magnitude
     */
    protected function classifySeverity(float $mag): string
    {
        if ($mag >= 6.0) return 'critical';
        if ($mag >= 5.0) return 'high';
        if ($mag >= 4.0) return 'moderate';
        return 'minor';
    }

    /**
     * Calculate Haversine distance between two points in km
     */
    public function calculateHaversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadiusKm = 6371;

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusKm * $c;
    }
}
