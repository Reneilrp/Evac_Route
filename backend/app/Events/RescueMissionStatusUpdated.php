<?php

namespace App\Events;

use App\Models\RescueMission;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RescueMissionStatusUpdated implements ShouldBroadcastNow
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
        return 'rescue.mission.status_updated';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->mission->id,
            'control_no' => $this->mission->control_no,
            'rescue_unit_id' => $this->mission->rescue_unit_id,
            'rescue_unit_name' => $this->mission->rescueUnit?->name,
            'status' => $this->mission->status,
            'arrived_at' => $this->mission->arrived_at?->toIso8601String(),
            'completed_at' => $this->mission->completed_at?->toIso8601String(),
            'target_shelter_id' => $this->mission->target_shelter_id,
            'target_shelter_name' => $this->mission->targetShelter?->name,
            'notes' => $this->mission->notes,
        ];
    }
}
