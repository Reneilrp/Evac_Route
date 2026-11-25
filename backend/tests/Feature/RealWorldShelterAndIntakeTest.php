<?php

use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\Shelter;
use App\Models\ShelterDonation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('shelter supports multi-tier activation and CSWDO mobilization', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $shelter = Shelter::create([
        'name' => 'Tetuan Covered Court',
        'latitude' => 6.9214,
        'longitude' => 122.0790,
        'barangay' => 'Tetuan',
        'max_capacity' => 100,
        'current_occupancy' => 0,
        'status' => 'open',
        'activation_status' => 'standby',
    ]);

    // 1. Barangay Tanod / Admin activates covered court
    $toggleRes = $this->actingAs($admin)->postJson("/api/shelters/{$shelter->id}/toggle-activation", [
        'activation_status' => 'open',
        'activation_trigger' => 'barangay_tanod',
    ]);
    $toggleRes->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.activation_status', 'open')
        ->assertJsonPath('data.activation_trigger', 'barangay_tanod');

    // 2. Mobilize CSWD field team
    $mobilizeRes = $this->actingAs($admin)->postJson("/api/shelters/{$shelter->id}/mobilize-cswd", [
        'team_name' => 'CSWDO Sector Response Alpha',
    ]);
    $mobilizeRes->assertStatus(200)
        ->assertJsonPath('data.cswd_mobilized', true)
        ->assertJsonPath('data.cswd_mobilized_team', 'CSWDO Sector Response Alpha');
});

test('shelter auto-activates from standby upon evacuee arrival (self-healing)', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'scanner']);
    $shelter = Shelter::create([
        'name' => 'Baliwasan Gym',
        'latitude' => 6.9152,
        'longitude' => 122.0614,
        'barangay' => 'Baliwasan',
        'max_capacity' => 80,
        'current_occupancy' => 0,
        'status' => 'open',
        'activation_status' => 'standby',
    ]);

    // Resident walks in
    $walkInRes = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/rapid-check-in", [
        'name' => 'Maria Santos',
        'headcount' => 4,
        'barangay' => 'Baliwasan',
        'vulnerabilities' => ['infant', 'senior'],
    ]);

    $walkInRes->assertStatus(200)
        ->assertJsonPath('status', 'success');

    // Shelter should now be auto-activated
    $freshShelter = $shelter->fresh();
    expect($freshShelter->activation_status)->toBe('open');
    expect($freshShelter->activation_trigger)->toBe('influx_auto');
    expect($freshShelter->current_occupancy)->toBe(4);
});

test('supports partial headcount intake and preserves slots during temporary day pass', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'scanner']);
    $shelter = Shelter::create([
        'name' => 'Tetuan Gym',
        'latitude' => 6.9214,
        'longitude' => 122.0790,
        'barangay' => 'Tetuan',
        'max_capacity' => 100,
        'current_occupancy' => 0,
        'status' => 'open',
    ]);

    // Walk-in with 5 members, 1 pregnant, 1 PWD
    $walkInRes = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/rapid-check-in", [
        'name' => 'Dela Cruz Family',
        'headcount' => 5,
        'barangay' => 'Tetuan',
        'vulnerabilities' => ['pregnant', 'pwd'],
    ]);
    $walkInRes->assertStatus(200);
    $logId = $walkInRes->json('data.log.id');

    // 1. Issue day pass (checking flooded home)
    $dayPassRes = $this->actingAs($staff)->postJson("/api/evacuation-logs/{$logId}/day-pass");
    $dayPassRes->assertStatus(200)
        ->assertJsonPath('data.is_temporary_offsite', true);

    // 2. Return from day pass
    $returnRes = $this->actingAs($staff)->postJson("/api/evacuation-logs/{$logId}/return-day-pass");
    $returnRes->assertStatus(200)
        ->assertJsonPath('data.is_temporary_offsite', false);

    // 3. Vulnerability summary
    $summaryRes = $this->actingAs($staff)->getJson("/api/shelters/{$shelter->id}/vulnerability-summary");
    $summaryRes->assertStatus(200)
        ->assertJsonPath('data.vulnerabilities.pregnant', 1)
        ->assertJsonPath('data.vulnerabilities.pwds', 1);
});

test('staff can log spontaneous on-site citizen and NGO donations at the gate', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'scanner']);
    $shelter = Shelter::create([
        'name' => 'Tetuan Central School',
        'latitude' => 6.9214,
        'longitude' => 122.0790,
        'barangay' => 'Tetuan',
        'max_capacity' => 150,
        'current_occupancy' => 20,
        'status' => 'open',
    ]);

    // Log donation of 100 bowls of hot arroz caldo
    $donationRes = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/donations", [
        'donor_name' => 'Rotary Club of Zamboanga City',
        'item_category' => 'hot_meals',
        'item_description' => 'Hot Arroz Caldo / Lugaw with boiled eggs',
        'quantity_servings' => 100,
        'distribution_mode' => 'immediate_community_serving',
    ]);

    $donationRes->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.donor_name', 'Rotary Club of Zamboanga City');

    // Retrieve donations
    $getRes = $this->actingAs($staff)->getJson("/api/shelters/{$shelter->id}/donations");
    $getRes->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.category', 'hot_meals')
        ->assertJsonPath('data.0.item_name', 'Hot Arroz Caldo / Lugaw with boiled eggs')
        ->assertJsonPath('data.0.quantity', 100)
        ->assertJsonPath('data.0.unit', 'servings');
});

test('shelter-scoped day-pass routes and mobile donation payload aliases work seamlessly', function () {
    $staff = User::factory()->create(['role' => 'lgu_staff', 'operator_type' => 'scanner']);
    $shelter = Shelter::create([
        'name' => 'Tetuan Covered Court',
        'latitude' => 6.9214,
        'longitude' => 122.0790,
        'barangay' => 'Tetuan',
        'max_capacity' => 100,
        'current_occupancy' => 0,
        'status' => 'open',
    ]);

    $walkInRes = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/rapid-check-in", [
        'family_name' => 'Jenson Canones',
        'headcount' => 2,
        'barangay' => 'Tetuan',
    ]);
    $walkInRes->assertStatus(200);
    $logId = $walkInRes->json('data.log.id');

    // Shelter-scoped day-pass & return-day-pass used by Mobile StaffScanner and Web ShelterDetailsModal
    $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/day-pass", [
        'evacuation_log_id' => $logId,
    ])->assertStatus(200)->assertJsonPath('data.is_temporary_offsite', true);

    $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/return-day-pass", [
        'evacuation_log_id' => $logId,
    ])->assertStatus(200)->assertJsonPath('data.is_temporary_offsite', false);

    // Mobile LogDonationModal payload format (including canned_goods preset)
    $mobileDonationRes = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/donations", [
        'donor_name' => 'Barangay Tetuan Volunteers',
        'donor_type' => 'citizen',
        'category' => 'canned_goods',
        'item_name' => 'Assorted Sardines & Corned Beef',
        'quantity' => 50,
        'unit' => 'cans',
        'estimated_servings' => 50,
        'distribution_phase' => 'phase_1_influx',
    ]);

    $mobileDonationRes->assertStatus(201)
        ->assertJsonPath('data.item_category', 'canned_goods')
        ->assertJsonPath('data.item_description', 'Assorted Sardines & Corned Beef')
        ->assertJsonPath('data.quantity_servings', 50)
        ->assertJsonPath('data.distribution_mode', 'immediate_community_serving')
        ->assertJsonPath('data.unit', 'cans');
});
