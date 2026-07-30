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
}
