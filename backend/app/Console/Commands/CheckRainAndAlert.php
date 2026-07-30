<?php

namespace App\Console\Commands;

use App\Models\Hazard;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Services\WeatherService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CheckRainAndAlert extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-rain-and-alert';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Checks if it is currently raining and triggers localized push notifications for prolonged rainfall.';

    protected WeatherService $weatherService;

    public function __construct(WeatherService $weatherService)
    {
        parent::__construct();
        $this->weatherService = $weatherService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $isRaining = $this->weatherService->isCurrentlyRaining();

        if ($isRaining) {
            $this->info('Rain detected in Zamboanga City.');
            $rainStartedAt = Cache::get('rain_started_at');

            if (! $rainStartedAt) {
                // Rain just started
                $rainStartedAt = now()->toIso8601String();
                Cache::forever('rain_started_at', $rainStartedAt);

                $this->info('Rain started. Sending general broadcast warning.');
                $this->sendGeneralRainAlert();
            } else {
                // Rain has been continuous
                $started = Carbon::parse($rainStartedAt);
                $durationMinutes = abs(now()->diffInMinutes($started));
                $this->info("Rain has been continuous for {$durationMinutes} minutes.");

                // If rain lasts longer than 1 hour (60 minutes)
                if ($durationMinutes >= 60) {
                    $this->triggerFloodAlerts();
                }
            }
        } else {
            $this->info('No rain detected in Zamboanga City.');
            $this->clearRainState();
        }
    }

    /**
     * Sends a city-wide notification to all residents warning them that rain has started.
     */
    private function sendGeneralRainAlert()
    {
        $tokens = User::whereNotNull('push_token')->pluck('push_token')->toArray();
        if (empty($tokens)) {
            return;
        }

        PushNotificationService::send(
            $tokens,
            '🌦️ Precipitation Warning',
            'It has started raining in Zamboanga City. Please be alert for potential street-level flooding and drive safely.'
        );
    }

    /**
     * Activates fixed flood spots and sends geo-targeted notifications to nearby residents.
     */
    private function triggerFloodAlerts()
    {
        $triggered = Cache::get('fixed_flood_spots_triggered', false);
        if ($triggered) {
            $this->info('Flood alerts already triggered for this rain session.');

            return;
        }

        // 1. Activate all fixed flood spots
        $fixedSpots = Hazard::where('hazard_type', 'flood')
            ->where('is_fixed_flood_spot', true)
            ->get();

        if ($fixedSpots->isEmpty()) {
            $this->info('No pre-configured fixed flood spots found.');

            return;
        }

        $this->info('Activating fixed flood spots and calculating geofenced residents...');
        $isSqlite = DB::getDriverName() === 'sqlite';

        foreach ($fixedSpots as $hazard) {
            $hazard->update(['is_active' => true]);

            // Query residents within their own alert radius
            if ($isSqlite) {
                $users = User::whereNotNull('push_token')
                    ->whereNotNull('last_latitude')
                    ->whereNotNull('last_longitude')
                    ->get();

                $residents = $users->filter(function ($user) use ($hazard) {
                    $dist = $this->haversine(
                        (float) $user->last_latitude, (float) $user->last_longitude,
                        (float) $hazard->latitude, (float) $hazard->longitude
                    );

                    return $dist <= ($user->alert_radius_meters ?? 500);
                });
            } else {
                $residents = User::whereNotNull('push_token')
                    ->whereNotNull('last_latitude')
                    ->whereNotNull('last_longitude')
                    ->whereRaw('ST_Distance_Sphere(POINT(last_latitude, last_longitude), POINT(?, ?)) <= alert_radius_meters', [
                        $hazard->latitude, $hazard->longitude,
                    ])->get();
            }

            $tokens = $residents->pluck('push_token')->toArray();

            if (! empty($tokens)) {
                $this->info('Sending targeted push alert to '.count($tokens)." residents near {$hazard->name}");
                PushNotificationService::send(
                    $tokens,
                    '⚠️ Street Flooding Alert',
                    "Localized flooding is reported at {$hazard->name} due to prolonged rain. Avoid low-lying streets in your area."
                );
            }
        }

        Cache::forever('fixed_flood_spots_triggered', true);
    }

    /**
     * Clears the rain status and deactivates fixed flood spots after rain stops.
     */
    private function clearRainState()
    {
        if (Cache::has('rain_started_at')) {
            $this->info('Rain has stopped. Clearing rain state.');
            Cache::forget('rain_started_at');
            Cache::forget('fixed_flood_spots_triggered');

            // Deactivate all fixed flood spots
            Hazard::where('hazard_type', 'flood')
                ->where('is_fixed_flood_spot', true)
                ->update(['is_active' => false]);
        }
    }

    /**
     * Calculate distance between two coordinates in meters (Haversine formula).
     */
    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
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
