<?php

namespace App\Events;

use App\Models\DispatchOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when staff confirms delivery of a dispatch order.
 * Broadcasts on 'map-updates' so the web inventory panel updates in real time.
 */
class DispatchOrderDelivered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly DispatchOrder $order) {}

    public function broadcastOn(): array
    {
        return [new Channel('map-updates')];
    }

    public function broadcastAs(): string
    {
        return 'dispatch.order.delivered';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->order->id,
            'shelter_name' => $this->order->shelter->name,
            'delivered_at' => $this->order->delivered_at->toIso8601String(),
            'items' => $this->order->items->map(fn ($i) => [
                'item_name' => $i->inventoryItem->item_name,
                'quantity' => $i->quantity,
                'unit_type' => $i->inventoryItem->unit_type,
            ]),
        ];
    }
}
