<?php

use App\Models\PendingIncident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('resident can submit incident report with up to 4 photos for credibility', function () {
    Storage::fake('public');
    $resident = User::factory()->create(['role' => 'resident']);

    $file1 = UploadedFile::fake()->image('photo1.jpg');
    $file2 = UploadedFile::fake()->image('photo2.png');
    $file3 = UploadedFile::fake()->image('photo3.webp');
    $file4 = UploadedFile::fake()->image('photo4.jpg');

    $response = $this->actingAs($resident)
        ->postJson('/api/incidents', [
            'name' => 'Severe Flooding at Tugbungan',
            'latitude' => 6.9126,
            'longitude' => 122.0729,
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'description' => 'Water level reaching waist high.',
            'photos' => [$file1, $file2, $file3, $file4],
        ]);

    $response->assertStatus(201);
    $data = $response->json('data');

    expect($data['photos'])->toHaveCount(4);
    expect($data['photo_urls'])->toHaveCount(4);

    $incident = PendingIncident::first();
    expect($incident->photos)->toHaveCount(4);
    Storage::disk('public')->assertExists($incident->photos[0]);
    Storage::disk('public')->assertExists($incident->photos[1]);
    Storage::disk('public')->assertExists($incident->photos[2]);
    Storage::disk('public')->assertExists($incident->photos[3]);
});

test('submitting more than 4 photos returns validation error', function () {
    Storage::fake('public');
    $resident = User::factory()->create(['role' => 'resident']);

    $photos = [
        UploadedFile::fake()->image('photo1.jpg'),
        UploadedFile::fake()->image('photo2.jpg'),
        UploadedFile::fake()->image('photo3.jpg'),
        UploadedFile::fake()->image('photo4.jpg'),
        UploadedFile::fake()->image('photo5.jpg'),
    ];

    $response = $this->actingAs($resident)
        ->postJson('/api/incidents', [
            'name' => 'Overflow Flooding',
            'latitude' => 6.9126,
            'longitude' => 122.0729,
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'photos' => $photos,
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['photos']);
});

test('evaluates incident area as frequent hotspot when multiple reports exist in 250m radius', function () {
    $resident = User::factory()->create(['role' => 'resident']);

    // Create 3 existing incidents in the same area (6.9126, 122.0729)
    PendingIncident::create([
        'reported_by' => $resident->id,
        'name' => 'Report 1',
        'latitude' => 6.9125,
        'longitude' => 122.0728,
        'hazard_type' => 'flood',
        'severity_level' => 'high',
        'status' => 'pending',
    ]);

    PendingIncident::create([
        'reported_by' => $resident->id,
        'name' => 'Report 2',
        'latitude' => 6.9127,
        'longitude' => 122.0730,
        'hazard_type' => 'flood',
        'severity_level' => 'medium',
        'status' => 'approved',
    ]);

    // Submit 3rd report in the same area
    $response = $this->actingAs($resident)
        ->postJson('/api/incidents', [
            'name' => 'Report 3 New',
            'latitude' => 6.9126,
            'longitude' => 122.0729,
            'hazard_type' => 'flood',
            'severity_level' => 'high',
        ]);

    $response->assertStatus(201);
    // Resident does NOT access frequency evaluation / other reports info
    expect($response->json('data.frequency_evaluation'))->toBeNull();

    // LGU staff reviewing the incident queue DOES receive the frequency hotspot evaluation
    $lguStaff = User::factory()->create(['role' => 'lgu_staff']);
    $lguResponse = $this->actingAs($lguStaff)->getJson('/api/incidents?status=pending');
    $lguResponse->assertStatus(200);

    $lguIncidents = $lguResponse->json('data.data');
    $evaluated = collect($lguIncidents)->firstWhere('name', 'Report 3 New');

    expect($evaluated['frequency_evaluation']['is_frequent_hotspot'])->toBeTrue();
    expect($evaluated['frequency_evaluation']['nearby_count'])->toBeGreaterThanOrEqual(2);
    expect($evaluated['frequency_evaluation']['recommended_fixed_spot'])->toBeTrue();
});
