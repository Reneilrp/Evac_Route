<?php

use App\Models\PendingIncident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('resident can fetch their submitted incident history with read status indicator', function () {
    $resident = User::factory()->create(['role' => 'resident']);
    $lguStaff = User::factory()->create(['role' => 'lgu_staff']);

    // Create an unread incident report
    $unreadIncident = PendingIncident::create([
        'reported_by' => $resident->id,
        'name' => 'Flooded Tetuan Road',
        'latitude' => 6.9126,
        'longitude' => 122.0729,
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'status' => 'pending',
        'read_at' => null,
    ]);

    // Fetch resident's incidents
    $response = $this->actingAs($resident)->getJson('/api/user/incidents');

    $response->assertStatus(200);
    $data = $response->json('data');

    expect($data)->toHaveCount(1);
    expect($data[0]['is_read'])->toBeFalse();

    // Now simulate LGU staff fetching pending queue (which auto-marks pending as read)
    $this->actingAs($lguStaff)->getJson('/api/incidents?status=pending');

    // Re-fetch as resident
    $response = $this->actingAs($resident)->getJson('/api/user/incidents');

    $data = $response->json('data');
    expect($data[0]['is_read'])->toBeTrue();
});
