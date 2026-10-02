<?php

namespace App\Events;

use App\Models\RescueMission;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RescueMissionDispatched implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly RescueMission $mission) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('rescue-alerts'),
            new Channel('map-updates'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'rescue.mission.dispatched';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->mission->id,
            'control_no' => $this->mission->control_no,
            'rescue_unit_id' => $this->mission->rescue_unit_id,
            'rescue_unit_name' => $this->mission->rescueUnit?->name,
            'assigned_personnel_id' => $this->mission->rescueUnit?->assigned_personnel_id,
            'victim_name' => $this->mission->victim_name,
            'victim_phone' => $this->mission->victim_phone,
            'victim_latitude' => $this->mission->victim_latitude,
            'victim_longitude' => $this->mission->victim_longitude,
            'barangay' => $this->mission->barangay,
            'headcount' => $this->mission->headcount,
            'special_needs' => $this->mission->special_needs,
            'situation_description' => $this->mission->situation_description,
            'triage_level' => $this->mission->triage_level,
            'status' => $this->mission->status,
            'target_shelter_id' => $this->mission->target_shelter_id,
            'target_shelter_name' => $this->mission->targetShelter?->name,
            'dispatched_at' => $this->mission->dispatched_at?->toIso8601String(),
        ];
    }
}
