<?php

namespace App\Events;

use App\Models\Shelter;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShelterStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Shelter $shelter) {}

    public function broadcastOn(): array
    {
        return [new Channel('map-updates')];
    }

    public function broadcastAs(): string
    {
        return 'shelter.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->shelter->id,
            'name' => $this->shelter->name,
            'status' => $this->shelter->status,
            'current_occupancy' => $this->shelter->current_occupancy,
            'max_capacity' => $this->shelter->max_capacity,
        ];
    }
}
