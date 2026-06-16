<?php

namespace App\Http\Controllers\Api;

use App\Events\DispatchOrderCreated;
use App\Events\DispatchOrderDelivered;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\DispatchOrder;
use App\Models\DispatchOrderItem;
use App\Models\InventoryItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DispatchOrderController extends Controller
{
    /**
     * List dispatch orders.
     * Admin sees all; lgu_staff sees all (they share the queue).
     */
    public function index(Request $request)
    {
        $orders = DispatchOrder::with([
            'shelter:id,name',
            'creator:id,name',
            'assignee:id,name',
            'items.inventoryItem:id,item_name,unit_type',
        ])
            ->orderByRaw("CASE status WHEN 'pending' THEN 1 WHEN 'in_transit' THEN 2 WHEN 'delivered' THEN 3 WHEN 'cancelled' THEN 4 ELSE 5 END")
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $orders]);
    }

    /**
     * Create a new dispatch order with a manifest of items.
     * Admin only.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'shelter_id'             => 'required|exists:shelters,id',
            'notes'                  => 'nullable|string|max:1000',
            'assigned_to'            => 'nullable|exists:users,id',
            'items'                  => 'required|array|min:1',
            'items.*.inventory_item_id' => 'required|exists:inventory_items,id',
            'items.*.quantity'       => 'required|integer|min:1',
        ]);

        $order = DB::transaction(function () use ($validated, $request) {
            $order = DispatchOrder::create([
                'created_by'  => $request->user()->id,
                'assigned_to' => $validated['assigned_to'] ?? null,
                'shelter_id'  => $validated['shelter_id'],
                'notes'       => $validated['notes'] ?? null,
                'status'      => 'pending',
            ]);

            foreach ($validated['items'] as $item) {
                DispatchOrderItem::create([
                    'dispatch_order_id' => $order->id,
                    'inventory_item_id' => $item['inventory_item_id'],
                    'quantity'          => $item['quantity'],
                ]);
            }

            return $order->load([
                'shelter:id,name',
                'creator:id,name',
                'items.inventoryItem:id,item_name,unit_type,total_stock',
            ]);
        });

        // Broadcast to staff mobile apps via WebSocket
        event(new DispatchOrderCreated($order));

        AuditLog::create([
            'user_id'    => $request->user()->id,
            'action'     => 'dispatch_order_created',
            'ip_address' => $request->ip(),
            'old_values' => null,
            'new_values' => [
                'id'         => $order->id,
                'shelter_id' => $order->shelter_id,
                'item_count' => $order->items->count(),
            ],
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Dispatch order created and staff notified.',
            'data'    => $order,
        ], 201);
    }

    /**
     * Staff taps "LOAD & DEPART" — marks order as in_transit.
     * Records the departed_at timestamp and assigns the current staff member.
     */
    public function depart(Request $request, int $id)
    {
        $order = DispatchOrder::with(['items.inventoryItem', 'shelter'])->findOrFail($id);

        if ($order->status !== 'pending') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Only pending orders can be departed.',
            ], 422);
        }

        $order->update([
            'status'      => 'in_transit',
            'assigned_to' => $request->user()->id,
            'departed_at' => now(),
        ]);

        AuditLog::create([
            'user_id'    => $request->user()->id,
            'action'     => 'dispatch_order_departed',
            'ip_address' => $request->ip(),
            'old_values' => ['status' => 'pending'],
            'new_values' => ['status' => 'in_transit', 'order_id' => $order->id],
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Order marked as in transit.',
            'data'    => $order->fresh(['shelter:id,name', 'items.inventoryItem:id,item_name,unit_type']),
        ]);
    }

    /**
     * Staff taps "CONFIRM DELIVERY" — marks order as delivered.
     * Deducts stock from the warehouse for each item in the manifest.
     * Stock is deducted HERE (on physical arrival) not at loading time.
     */
    public function deliver(Request $request, int $id)
    {
        $order = DispatchOrder::with(['items.inventoryItem', 'shelter'])->findOrFail($id);

        if ($order->status !== 'in_transit') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Only in-transit orders can be confirmed as delivered.',
            ], 422);
        }

        DB::transaction(function () use ($order, $request) {
            // 1. Deduct warehouse stock for each manifest item
            foreach ($order->items as $lineItem) {
                $inv = $lineItem->inventoryItem;
                $newStock = max(0, $inv->total_stock - $lineItem->quantity);

                $inv->update(['total_stock' => $newStock]);

                AuditLog::create([
                    'user_id'    => $request->user()->id,
                    'action'     => 'dispatch_stock_deducted',
                    'ip_address' => $request->ip(),
                    'old_values' => ['item' => $inv->item_name, 'stock' => $inv->getOriginal('total_stock')],
                    'new_values' => ['item' => $inv->item_name, 'stock' => $newStock, 'dispatch_order_id' => $order->id],
                ]);
            }

            // 2. Mark the order delivered
            $order->update([
                'status'       => 'delivered',
                'delivered_at' => now(),
            ]);

            // 3. Broadcast delivery to web dashboard
            event(new DispatchOrderDelivered($order->fresh(['shelter', 'items.inventoryItem'])));

            AuditLog::create([
                'user_id'    => $request->user()->id,
                'action'     => 'dispatch_order_delivered',
                'ip_address' => $request->ip(),
                'old_values' => ['status' => 'in_transit'],
                'new_values' => ['status' => 'delivered', 'order_id' => $order->id],
            ]);
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Delivery confirmed. Warehouse stock updated.',
            'data'    => $order->fresh(['shelter:id,name', 'items.inventoryItem:id,item_name,unit_type']),
        ]);
    }

    /**
     * Admin cancels a pending dispatch order.
     */
    public function cancel(Request $request, int $id)
    {
        $order = DispatchOrder::findOrFail($id);

        if ($order->status !== 'pending') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Only pending orders can be cancelled.',
            ], 422);
        }

        $order->update(['status' => 'cancelled']);

        AuditLog::create([
            'user_id'    => $request->user()->id,
            'action'     => 'dispatch_order_cancelled',
            'ip_address' => $request->ip(),
            'old_values' => ['status' => 'pending'],
            'new_values' => ['status' => 'cancelled', 'order_id' => $order->id],
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Dispatch order cancelled.',
        ]);
    }
}
