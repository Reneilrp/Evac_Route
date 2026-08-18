<?php

use App\Models\PendingIncident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('resident can submit incident report with up to 3 photos', function () {
    Storage::fake('public');
    $resident = User::factory()->create(['role' => 'resident']);

    $file1 = UploadedFile::fake()->image('photo1.jpg');
    $file2 = UploadedFile::fake()->image('photo2.png');
    $file3 = UploadedFile::fake()->image('photo3.webp');

    $response = $this->actingAs($resident)
        ->postJson('/api/incidents', [
            'name' => 'Severe Flooding at Tugbungan',
            'latitude' => 6.9126,
            'longitude' => 122.0729,
            'hazard_type' => 'flood',
            'severity_level' => 'high',
            'description' => 'Water level reaching waist high.',
            'photos' => [$file1, $file2, $file3],
        ]);

    $response->assertStatus(201);
    $data = $response->json('data');

    expect($data['photos'])->toHaveCount(3);
    expect($data['photo_urls'])->toHaveCount(3);

    $incident = PendingIncident::first();
    expect($incident->photos)->toHaveCount(3);
    Storage::disk('public')->assertExists($incident->photos[0]);
    Storage::disk('public')->assertExists($incident->photos[1]);
    Storage::disk('public')->assertExists($incident->photos[2]);
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
    $evaluation = $response->json('data.frequency_evaluation');

    expect($evaluation['is_frequent_hotspot'])->toBeTrue();
    expect($evaluation['nearby_count'])->toBeGreaterThanOrEqual(2);
    expect($evaluation['recommended_fixed_spot'])->toBeTrue();
});
