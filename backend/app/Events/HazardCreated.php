<?php

namespace App\Events;

use App\Models\Hazard;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HazardCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Hazard $hazard) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('map-updates'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'hazard.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->hazard->id,
            'name' => $this->hazard->name,
            'latitude' => (float) $this->hazard->latitude,
            'longitude' => (float) $this->hazard->longitude,
            'radius_meters' => (float) $this->hazard->radius_meters,
            'estimated_duration_hours' => $this->hazard->estimated_duration_hours ? (int) $this->hazard->estimated_duration_hours : null,
            'hazard_type' => $this->hazard->hazard_type,
            'severity_level' => $this->hazard->severity_level,
            'is_active' => $this->hazard->is_active,
        ];
    }
}
