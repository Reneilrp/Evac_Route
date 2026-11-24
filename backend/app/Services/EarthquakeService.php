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
    const CACHE_TTL_SECONDS = 60; // 60 seconds cache for rapid real-time seismic detection

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

                    $mag = (float) ($props['mag'] ?? 0);
                    $tsunamiFlag = (int) ($props['tsunami'] ?? 0);
                    $estimatedIntensity = $this->calculateEstimatedIntensity($mag, $distKm, $depth);
                    $guidance = $this->determineGuidance($mag, $distKm, $depth, $estimatedIntensity, $tsunamiFlag, $lat, $lng);

                    return [
                        'id' => $feature['id'] ?? uniqid('eq_'),
                        'title' => $props['title'] ?? 'Seismic Event',
                        'place' => $props['place'] ?? 'Unknown Location',
                        'magnitude' => $mag,
                        'time' => $props['time'] ?? null,
                        'time_formatted' => isset($props['time']) ? date('Y-m-d H:i:s', (int) ($props['time'] / 1000)) : null,
                        'url' => $props['url'] ?? null,
                        'tsunami' => $tsunamiFlag,
                        'tsunami_threat' => $guidance['tsunami_threat'] ?? false,
                        'latitude' => $lat,
                        'longitude' => $lng,
                        'depth_km' => $depth,
                        'distance_km' => round($distKm, 1),
                        'is_nearby_zamboanga' => $distKm <= 150,
                        'severity' => $this->classifySeverity($mag),
                        'estimated_intensity' => round($estimatedIntensity, 1),
                        'peis_label' => $guidance['peis_label'],
                        'guidance_tier' => $guidance['tier'], // 'emergency' | 'advisory' | 'informational'
                        'guidance_title' => $guidance['title'],
                        'guidance_action' => $guidance['action'],
                        'safety_directive' => $guidance['directive'],
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

    /**
     * Estimates ground shaking intensity (PEIS / Modified Mercalli equivalent)
     * at target location using standard seismological attenuation.
     *
     * I_est = 1.5 * M - 3.5 * log10(sqrt(D^2 + h^2)) + 3.0
     */
    public function calculateEstimatedIntensity(float $mag, float $distKm, float $depthKm): float
    {
        $effDepth = max($depthKm, 10.0);
        $hypocentralDist = sqrt(($distKm * $distKm) + ($effDepth * $effDepth));
        $hypocentralDist = max($hypocentralDist, 5.0);

        $intensity = (1.5 * $mag) - (3.5 * log10($hypocentralDist)) + 3.0;

        return min(10.0, max(1.0, $intensity));
    }

    /**
     * Determines life-safety guidance tier based on estimated shaking intensity, distance, and tsunami threat.
     *
     * Tiers:
     * - emergency: Strong/critical shaking felt locally (Duck, Cover & Hold) OR Offshore Tsunami threat (Evacuate Inland to High Ground)
     * - advisory: Distant epicenter -> Expect light tremors/swaying
     * - informational: Negligible shaking at user location -> Logged only
     */
    public function determineGuidance(float $mag, float $distKm, float $depthKm, float $intensity, int $tsunami = 0, float $lat = 0, float $lng = 0): array
    {
        $peisLabel = match (true) {
            $intensity >= 7.0 => 'PEIS VII-VIII: Destructive Shaking',
            $intensity >= 5.0 => 'PEIS V-VI: Strong Shaking',
            $intensity >= 3.5 => 'PEIS IV: Moderately Strong',
            $intensity >= 2.5 => 'PEIS II-III: Weak / Light Swaying',
            default => 'PEIS I: Scarcely Perceptible',
        };

        // Offshore Tsunami Evaluation (Sulu Trench / Cotabato Trench or USGS Tsunami flag)
        $isOffshoreTsunami = ($tsunami === 1) || ($mag >= 6.0 && $depthKm <= 60.0 && $distKm <= 250.0);

        if ($isOffshoreTsunami) {
            return [
                'tier' => 'emergency',
                'tsunami_threat' => true,
                'title' => '🌊 TSUNAMI EVACUATION WARNING',
                'action' => 'Evacuate Coastal Areas Inland',
                'peis_label' => $peisLabel,
                'directive' => 'Offshore seismic event detected in sea/trench. Coastal barangays (Campo Islam, Baliwasan, Mariki, Rio Hondo, Cawa-Cawa, Labuan, etc.) must immediately evacuate inland to higher ground (KCC Mall / Gov. Camins and above). Inland residents: stay in safe zone, keep roads clear.',
            ];
        }

        // Emergency Tier: Intense shaking expected at resident location (Inland / Non-Tsunami)
        $isEmergency = ($intensity >= 4.5)
            || ($mag >= 5.0 && $distKm <= 35.0)
            || ($mag >= 6.5 && $distKm <= 90.0);

        if ($isEmergency) {
            return [
                'tier' => 'emergency',
                'tsunami_threat' => false,
                'title' => '🚨 STRONG EARTHQUAKE DETECTED',
                'action' => 'Duck, Cover & Hold',
                'peis_label' => $peisLabel,
                'directive' => 'Duck, Cover & Hold under a sturdy desk or table. Keep away from falling hazards and glass, and evacuate to open areas after shaking stops.',
            ];
        }

        // Advisory Tier: Distant epicenter, tremors/swaying possible
        $isAdvisory = ($intensity >= 2.5)
            || ($mag >= 4.2 && $distKm <= 200.0)
            || ($mag >= 5.5 && $distKm <= 350.0);

        if ($isAdvisory) {
            $distRounded = round($distKm, 0);
            return [
                'tier' => 'advisory',
                'tsunami_threat' => false,
                'title' => '🟡 SEISMIC ADVISORY: DISTANT QUAKE',
                'action' => 'Expect Tremors',
                'peis_label' => $peisLabel,
                'directive' => "Expect light tremors or swaying. The epicenter is distant ({$distRounded} km away). Stay calm, check surroundings for loose objects, and monitor official DRRM advisories. Duck, Cover & Hold is not currently needed unless shaking intensifies.",
            ];
        }

        // Informational Tier: Negligible shaking unfelt locally
        $distRounded = round($distKm, 0);
        return [
            'tier' => 'informational',
            'tsunami_threat' => false,
            'title' => 'ℹ️ DISTANT SEISMIC EVENT',
            'action' => 'Monitor Only',
            'peis_label' => $peisLabel,
            'directive' => "Distant seismic event ({$distRounded} km away). No perceptible tremors expected at your location. Logged for DRRM situational awareness.",
        ];
    }
}
