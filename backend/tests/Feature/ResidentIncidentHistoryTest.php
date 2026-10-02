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

test('resident cannot access other residents incident reports or photos', function () {
    $residentA = User::factory()->create(['role' => 'resident']);
    $residentB = User::factory()->create(['role' => 'resident']);

    // Incident by Resident A
    $incidentA = PendingIncident::create([
        'reported_by' => $residentA->id,
        'name' => 'Report by Resident A',
        'latitude' => 6.9126,
        'longitude' => 122.0729,
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'status' => 'pending',
    ]);

    // Incident by Resident B
    $incidentB = PendingIncident::create([
        'reported_by' => $residentB->id,
        'name' => 'Report by Resident B',
        'latitude' => 6.9200,
        'longitude' => 122.0800,
        'hazard_type' => 'earthquake',
        'severity_level' => 'medium',
        'status' => 'pending',
    ]);

    // Resident A requests their incidents
    $responseA = $this->actingAs($residentA)->getJson('/api/user/incidents');
    $responseA->assertStatus(200);
    $dataA = $responseA->json('data');

    // Resident A must only see their own report, NOT Resident B's
    expect($dataA)->toHaveCount(1);
    expect($dataA[0]['id'])->toBe($incidentA->id);
    expect($dataA[0]['name'])->toBe('Report by Resident A');
    expect(array_key_exists('reviewed_by', $dataA[0]))->toBeFalse();
    expect(array_key_exists('frequency_evaluation', $dataA[0]))->toBeFalse();

    // Resident A attempts to access Resident B's photo -> must be 403 Forbidden
    $photoResponse = $this->actingAs($residentA)->getJson("/api/incidents/{$incidentB->id}/photo");
    $photoResponse->assertStatus(403);

    // Resident A attempts to access LGU queue -> must be 403 Forbidden
    $queueResponse = $this->actingAs($residentA)->getJson('/api/incidents');
    $queueResponse->assertStatus(403);
});

test('resident can archive and unarchive their own incident reports', function () {
    $resident = User::factory()->create(['role' => 'resident']);
    $otherResident = User::factory()->create(['role' => 'resident']);

    $incident = PendingIncident::create([
        'reported_by' => $resident->id,
        'name' => 'Report to Archive',
        'latitude' => 6.9126,
        'longitude' => 122.0729,
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'status' => 'approved',
    ]);

    // Other resident cannot archive someone else's incident
    $unauthorized = $this->actingAs($otherResident)->patchJson("/api/user/incidents/{$incident->id}/archive");
    $unauthorized->assertStatus(403);

    // Resident archives their report
    $archiveResponse = $this->actingAs($resident)->patchJson("/api/user/incidents/{$incident->id}/archive");
    $archiveResponse->assertStatus(200);
    expect($archiveResponse->json('data.is_archived'))->toBeTrue();

    // Query active incidents (archived=false)
    $activeResponse = $this->actingAs($resident)->getJson('/api/user/incidents?archived=false');
    $activeResponse->assertStatus(200);
    expect($activeResponse->json('data'))->toHaveCount(0);

    // Query archived incidents (archived=true)
    $archivedResponse = $this->actingAs($resident)->getJson('/api/user/incidents?archived=true');
    $archivedResponse->assertStatus(200);
    $archivedData = $archivedResponse->json('data');
    expect($archivedData)->toHaveCount(1);
    expect($archivedData[0]['is_archived'])->toBeTrue();

    // Resident unarchives / restores report
    $unarchiveResponse = $this->actingAs($resident)->patchJson("/api/user/incidents/{$incident->id}/unarchive");
    $unarchiveResponse->assertStatus(200);
    expect($unarchiveResponse->json('data.is_archived'))->toBeFalse();

    // Active incidents now contains report again
    $activeAgain = $this->actingAs($resident)->getJson('/api/user/incidents?archived=false');
    expect($activeAgain->json('data'))->toHaveCount(1);
});
