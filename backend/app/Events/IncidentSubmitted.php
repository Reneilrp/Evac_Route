<?php

namespace App\Events;

use App\Models\PendingIncident;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IncidentSubmitted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly PendingIncident $incident) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('map-updates'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'incident.submitted';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->incident->id,
            'name' => $this->incident->name,
            'latitude' => (float) $this->incident->latitude,
            'longitude' => (float) $this->incident->longitude,
            'hazard_type' => $this->incident->hazard_type,
            'severity_level' => $this->incident->severity_level,
            'description' => $this->incident->description,
        ];
    }
}
