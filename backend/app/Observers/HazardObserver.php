<?php

namespace App\Observers;

use App\Models\Hazard;

class HazardObserver
{
    /**
     * Handle the Hazard "created" event.
     */
    public function created(Hazard $hazard): void
    {
        if ($hazard->is_active) {
            $this->autoActivateNearbyShelters($hazard);
        }
    }

    /**
     * Handle the Hazard "updated" event.
     */
    public function updated(Hazard $hazard): void
    {
        // If hazard just became active
        if ($hazard->isDirty('is_active') && $hazard->is_active) {
            $this->autoActivateNearbyShelters($hazard);
        }
    }

    /**
     * Geospatial query to find closed secondary shelters within a safe 2.5km ring of the hazard.
     */
    private function autoActivateNearbyShelters(Hazard $hazard): void
    {
        $radius = $hazard->radius_meters ?: 500;
        $maxSafeDistance = $radius + 2500; // 2.5km outer ring buffer

        $shelters = \App\Models\Shelter::where('type', 'secondary')
            ->where('status', 'closed')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get();

        foreach ($shelters as $shelter) {
            // Standard Haversine distance formula
            $earthRadius = 6371000;
            $latFrom = deg2rad($hazard->latitude);
            $lonFrom = deg2rad($hazard->longitude);
            $latTo = deg2rad($shelter->latitude);
            $lonTo = deg2rad($shelter->longitude);

            $latDelta = $latTo - $latFrom;
            $lonDelta = $lonTo - $lonFrom;

            $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
                cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
            $distance = $angle * $earthRadius;

            // Ensure shelter is OUTSIDE the danger zone, but WITHIN the 2.5km safe ring
            if ($distance > $radius && $distance <= $maxSafeDistance) {
                $shelter->update(['status' => 'open']);
                
                // Optional: Broadcast a notification (omitted here, but happens implicitly via DB change)
            }
        }
    }

    /**
     * Handle the Hazard "deleted" event.
     */
    public function deleted(Hazard $hazard): void
    {
        //
    }

    /**
     * Handle the Hazard "restored" event.
     */
    public function restored(Hazard $hazard): void
    {
        //
    }

    /**
     * Handle the Hazard "force deleted" event.
     */
    public function forceDeleted(Hazard $hazard): void
    {
        //
    }
}
