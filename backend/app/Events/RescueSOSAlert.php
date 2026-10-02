<?php

namespace App\Events;

use App\Models\PendingIncident;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RescueSOSAlert implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly PendingIncident $incident, public readonly array $extraDetails = []) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('rescue-alerts'),
            new Channel('map-updates'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'rescue.sos.received';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->incident->id,
            'name' => $this->incident->name,
            'hazard_type' => $this->incident->hazard_type,
            'severity_level' => $this->incident->severity_level,
            'description' => $this->incident->description,
            'latitude' => (float) $this->incident->latitude,
            'longitude' => (float) $this->incident->longitude,
            'reported_by' => $this->incident->reported_by,
            'reporter_name' => $this->incident->reporter?->name ?? 'Citizen in Distress',
            'reporter_phone' => $this->incident->reporter?->familyProfile?->contact_number ?? $this->extraDetails['contact_number'] ?? null,
            'headcount' => $this->incident->reporter?->familyProfile?->headcount ?? $this->extraDetails['headcount'] ?? 1,
            'created_at' => $this->incident->created_at->toIso8601String(),
        ];
    }
}
