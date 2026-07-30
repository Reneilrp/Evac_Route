<?php

namespace App\Events;

use App\Models\DispatchOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when admin creates a new dispatch order.
 * Broadcasts on the 'staff-alerts' channel so inventory staff
 * receive an in-app notification and push alert.
 */
class DispatchOrderCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly DispatchOrder $order) {}

    public function broadcastOn(): array
    {
        return [new Channel('staff-alerts')];
    }

    public function broadcastAs(): string
    {
        return 'dispatch.order.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->order->id,
            'shelter_name' => $this->order->shelter->name,
            'shelter_id' => $this->order->shelter_id,
            'item_count' => $this->order->items->count(),
            'notes' => $this->order->notes,
            'created_at' => $this->order->created_at->toIso8601String(),
        ];
    }
}
