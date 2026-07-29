<?php

namespace App\Events;

use App\Models\BroadcastAlert;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EmergencyAlertBroadcasted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly BroadcastAlert $alert) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('map-updates'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'emergency.alert';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->alert->id,
            'title' => $this->alert->title,
            'message' => $this->alert->message,
            'severity' => $this->alert->severity,
            'scope' => $this->alert->scope,
            'barangay' => $this->alert->barangay,
            'is_simulation' => (bool) ($this->alert->is_simulation ?? false),
            'created_at' => $this->alert->created_at->toIso8601String(),
        ];
    }
}
