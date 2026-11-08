<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    /**
     * Send a push notification to one or multiple Expo push tokens.
     */
    public static function send($tokens, string $title, string $body, array $data = []): bool
    {
        $tokens = is_array($tokens) ? $tokens : [$tokens];
        $tokens = array_filter($tokens); // Remove empty values

        if (empty($tokens)) {
            return false;
        }

        // Expo allows batching up to 100 notifications in one request
        $messages = [];
        foreach ($tokens as $token) {
            if (! str_starts_with($token, 'ExponentPushToken') && ! str_starts_with($token, 'host.exp.exponent')) {
                continue;
            }
            $messages[] = [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'priority' => 'high',
                'data' => $data,
            ];
        }

        if (empty($messages)) {
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Accept-Encoding' => 'gzip, deflate',
                'Content-Type' => 'application/json',
            ])->post('https://exp.host/--/api/v2/push/send', $messages);

            if ($response->failed()) {
                Log::error('Expo Push Notification request failed: '.$response->body());

                return false;
            }

            return true;
        } catch (\Exception $e) {
            Log::error('PushNotificationService error: '.$e->getMessage());
        }

        return false;
    }

    /**
     * Retrieve targeted push tokens for residents living in specific barangays
     * OR physically located within proximity of the hazard coordinates.
     * Prevents alert fatigue and spam to distant residents.
     *
     * @param float|null $latitude
     * @param float|null $longitude
     * @param float $radiusMeters
     * @param array $barangays
     * @return array
     */
    public static function getTargetedTokens(?float $latitude = null, ?float $longitude = null, float $radiusMeters = 500, array $barangays = []): array
    {
        $barangays = array_values(array_filter(array_map('trim', $barangays)));
        $hasCoords = $latitude !== null && $longitude !== null;

        $users = \App\Models\User::whereNotNull('push_token')
            ->with('familyProfile:id,user_id,barangay')
            ->get();

        $filtered = $users->filter(function ($user) use ($barangays, $hasCoords, $latitude, $longitude, $radiusMeters) {
            // 1. Check registered home barangay
            $userBarangay = trim($user->familyProfile?->barangay ?? '');
            if (!empty($barangays) && !empty($userBarangay)) {
                foreach ($barangays as $b) {
                    if (strcasecmp($b, $userBarangay) === 0) {
                        return true;
                    }
                }
            }

            // 2. Check live GPS proximity if user coordinates exist
            if ($hasCoords && $user->last_latitude !== null && $user->last_longitude !== null) {
                $dist = self::haversineDistance(
                    (float) $user->last_latitude,
                    (float) $user->last_longitude,
                    $latitude,
                    $longitude
                );
                // Ensure resident is alerted if physically inside the hazard footprint,
                // or if their configured alert preference extends further than the hazard radius.
                // A resident's preference must never shrink or suppress alerts inside the hazard zone.
                $userPrefRadius = (float) ($user->alert_radius_meters ?? 0);
                $effectiveRadius = max((float) $radiusMeters, $userPrefRadius);
                if ($dist <= $effectiveRadius) {
                    return true;
                }
            }

            return false;
        });

        return $filtered->pluck('push_token')->unique()->values()->toArray();
    }

    /**
     * Calculate distance between two coordinates in meters via Haversine formula.
     */
    public static function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
