<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HazardResolved implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly int $hazardId) {}

    public function broadcastOn(): array
    {
        return [new Channel('map-updates')];
    }

    public function broadcastAs(): string
    {
        return 'hazard.resolved';
    }

    public function broadcastWith(): array
    {
        return ['hazard_id' => $this->hazardId];
    }
}
