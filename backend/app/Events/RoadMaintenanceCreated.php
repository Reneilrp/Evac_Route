<?php

namespace App\Events;

use App\Models\RoadMaintenance;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoadMaintenanceCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly RoadMaintenance $roadMaintenance) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('map-updates'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'road-maintenance.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->roadMaintenance->id,
            'description' => $this->roadMaintenance->description,
            'start_latitude' => (float) $this->roadMaintenance->start_latitude,
            'start_longitude' => (float) $this->roadMaintenance->start_longitude,
            'end_latitude' => (float) $this->roadMaintenance->end_latitude,
            'end_longitude' => (float) $this->roadMaintenance->end_longitude,
            'estimated_duration_hours' => $this->roadMaintenance->estimated_duration_hours ? (int) $this->roadMaintenance->estimated_duration_hours : null,
            'is_active' => $this->roadMaintenance->is_active,
        ];
    }
}
