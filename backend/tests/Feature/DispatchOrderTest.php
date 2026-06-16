<?php

use App\Models\User;
use App\Models\Shelter;
use App\Models\InventoryItem;
use App\Models\DispatchOrder;
use App\Models\DispatchOrderItem;
use App\Events\DispatchOrderCreated;
use App\Events\DispatchOrderDelivered;
use Illuminate\Support\Facades\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $this->staff = User::factory()->create(['role' => 'lgu_staff', 'status' => 'active']);
    $this->resident = User::factory()->create(['role' => 'resident', 'status' => 'active']);

    $this->shelter = Shelter::create([
        'name' => 'Main Shelter',
        'latitude' => 6.9,
        'longitude' => 122.0,
        'max_capacity' => 100,
        'current_occupancy' => 0,
        'status' => 'open',
        'pinned_by' => $this->admin->id,
    ]);

    $this->item1 = InventoryItem::create([
        'item_name' => 'Sacks of Rice',
        'total_stock' => 100,
        'unit_type' => 'sacks'
    ]);

    $this->item2 = InventoryItem::create([
        'item_name' => 'Water Boxes',
        'total_stock' => 50,
        'unit_type' => 'boxes'
    ]);
});

test('unauthenticated guest cannot access dispatch routes', function () {
    $this->getJson('/api/dispatch-orders')->assertStatus(401);
    $this->postJson('/api/dispatch-orders', [])->assertStatus(401);
    $this->postJson('/api/dispatch-orders/1/depart')->assertStatus(401);
    $this->postJson('/api/dispatch-orders/1/deliver')->assertStatus(401);
    $this->postJson('/api/dispatch-orders/1/cancel')->assertStatus(401);
});

test('resident cannot access dispatch routes', function () {
    $this->actingAs($this->resident, 'sanctum')->getJson('/api/dispatch-orders')->assertStatus(403);
    $this->actingAs($this->resident, 'sanctum')->postJson('/api/dispatch-orders', [])->assertStatus(403);
    $this->actingAs($this->resident, 'sanctum')->postJson('/api/dispatch-orders/1/depart')->assertStatus(403);
    $this->actingAs($this->resident, 'sanctum')->postJson('/api/dispatch-orders/1/deliver')->assertStatus(403);
    $this->actingAs($this->resident, 'sanctum')->postJson('/api/dispatch-orders/1/cancel')->assertStatus(403);
});

test('authorized users can list dispatch orders', function () {
    $order1 = DispatchOrder::create([
        'created_by' => $this->admin->id,
        'shelter_id' => $this->shelter->id,
        'status' => 'delivered',
    ]);
    $order2 = DispatchOrder::create([
        'created_by' => $this->admin->id,
        'shelter_id' => $this->shelter->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')->getJson('/api/dispatch-orders');

    $response->assertStatus(200)
             ->assertJsonPath('status', 'success');

    // Should return pending first then delivered (status ordering is: pending, in_transit, delivered, cancelled)
    $data = $response->json('data');
    expect($data)->toHaveCount(2);
    expect($data[0]['id'])->toBe($order2->id);
    expect($data[1]['id'])->toBe($order1->id);
});

test('admin can create a new dispatch order with items', function () {
    Event::fake();

    $payload = [
        'shelter_id' => $this->shelter->id,
        'notes' => 'Urgent deployment',
        'items' => [
            ['inventory_item_id' => $this->item1->id, 'quantity' => 10],
            ['inventory_item_id' => $this->item2->id, 'quantity' => 5],
        ]
    ];

    $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/dispatch-orders', $payload);

    $response->assertStatus(201)
             ->assertJsonPath('status', 'success')
             ->assertJsonPath('message', 'Dispatch order created and staff notified.');

    $orderId = $response->json('data.id');

    $this->assertDatabaseHas('dispatch_orders', [
        'id' => $orderId,
        'shelter_id' => $this->shelter->id,
        'status' => 'pending',
        'created_by' => $this->admin->id,
    ]);

    $this->assertDatabaseHas('dispatch_order_items', [
        'dispatch_order_id' => $orderId,
        'inventory_item_id' => $this->item1->id,
        'quantity' => 10,
    ]);

    $this->assertDatabaseHas('dispatch_order_items', [
        'dispatch_order_id' => $orderId,
        'inventory_item_id' => $this->item2->id,
        'quantity' => 5,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $this->admin->id,
        'action' => 'dispatch_order_created',
    ]);

    Event::assertDispatched(DispatchOrderCreated::class, function ($event) use ($orderId) {
        return $event->order->id === $orderId;
    });
});

test('store validation handles missing and invalid inputs', function () {
    $payload = [
        'shelter_id' => 99999, // invalid shelter
        'items' => [] // empty manifest
    ];

    $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/dispatch-orders', $payload);
    $response->assertStatus(422);
});

test('staff can depart a pending dispatch order', function () {
    $order = DispatchOrder::create([
        'created_by' => $this->admin->id,
        'shelter_id' => $this->shelter->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')->postJson("/api/dispatch-orders/{$order->id}/depart");

    $response->assertStatus(200)
             ->assertJsonPath('status', 'success');

    $this->assertDatabaseHas('dispatch_orders', [
        'id' => $order->id,
        'status' => 'in_transit',
        'assigned_to' => $this->staff->id,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $this->staff->id,
        'action' => 'dispatch_order_departed',
    ]);
});

test('cannot depart a non-pending dispatch order', function () {
    $order = DispatchOrder::create([
        'created_by' => $this->admin->id,
        'shelter_id' => $this->shelter->id,
        'status' => 'delivered',
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')->postJson("/api/dispatch-orders/{$order->id}/depart");
    $response->assertStatus(422)
             ->assertJsonPath('status', 'error')
             ->assertJsonPath('message', 'Only pending orders can be departed.');
});

test('staff can confirm delivery, which deducts stock', function () {
    Event::fake();

    $order = DispatchOrder::create([
        'created_by' => $this->admin->id,
        'shelter_id' => $this->shelter->id,
        'status' => 'in_transit',
    ]);

    $item1 = DispatchOrderItem::create([
        'dispatch_order_id' => $order->id,
        'inventory_item_id' => $this->item1->id,
        'quantity' => 40,
    ]);

    $item2 = DispatchOrderItem::create([
        'dispatch_order_id' => $order->id,
        'inventory_item_id' => $this->item2->id,
        'quantity' => 10,
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')->postJson("/api/dispatch-orders/{$order->id}/deliver");

    $response->assertStatus(200)
             ->assertJsonPath('status', 'success');

    $this->assertDatabaseHas('dispatch_orders', [
        'id' => $order->id,
        'status' => 'delivered',
    ]);

    // Check inventory stock deducted
    // item1 started with 100, deducted 40 => 60
    $this->assertDatabaseHas('inventory_items', [
        'id' => $this->item1->id,
        'total_stock' => 60,
    ]);

    // item2 started with 50, deducted 10 => 40
    $this->assertDatabaseHas('inventory_items', [
        'id' => $this->item2->id,
        'total_stock' => 40,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $this->staff->id,
        'action' => 'dispatch_stock_deducted',
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $this->staff->id,
        'action' => 'dispatch_order_delivered',
    ]);

    Event::assertDispatched(DispatchOrderDelivered::class, function ($event) use ($order) {
        return $event->order->id === $order->id;
    });
});

test('stock floors at zero and does not go negative', function () {
    $order = DispatchOrder::create([
        'created_by' => $this->admin->id,
        'shelter_id' => $this->shelter->id,
        'status' => 'in_transit',
    ]);

    DispatchOrderItem::create([
        'dispatch_order_id' => $order->id,
        'inventory_item_id' => $this->item1->id,
        'quantity' => 150, // More than the 100 stock
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')->postJson("/api/dispatch-orders/{$order->id}/deliver");

    $response->assertStatus(200);

    // Check inventory stock is 0, not negative
    $this->assertDatabaseHas('inventory_items', [
        'id' => $this->item1->id,
        'total_stock' => 0,
    ]);
});

test('cannot deliver a non-in-transit dispatch order', function () {
    $order = DispatchOrder::create([
        'created_by' => $this->admin->id,
        'shelter_id' => $this->shelter->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->staff, 'sanctum')->postJson("/api/dispatch-orders/{$order->id}/deliver");
    $response->assertStatus(422)
             ->assertJsonPath('status', 'error')
             ->assertJsonPath('message', 'Only in-transit orders can be confirmed as delivered.');
});

test('admin can cancel a pending dispatch order', function () {
    $order = DispatchOrder::create([
        'created_by' => $this->admin->id,
        'shelter_id' => $this->shelter->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/dispatch-orders/{$order->id}/cancel");

    $response->assertStatus(200)
             ->assertJsonPath('status', 'success');

    $this->assertDatabaseHas('dispatch_orders', [
        'id' => $order->id,
        'status' => 'cancelled',
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $this->admin->id,
        'action' => 'dispatch_order_cancelled',
    ]);
});

test('cannot cancel a non-pending dispatch order', function () {
    $order = DispatchOrder::create([
        'created_by' => $this->admin->id,
        'shelter_id' => $this->shelter->id,
        'status' => 'in_transit',
    ]);

    $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/dispatch-orders/{$order->id}/cancel");
    $response->assertStatus(422)
             ->assertJsonPath('status', 'error')
             ->assertJsonPath('message', 'Only pending orders can be cancelled.');
});
