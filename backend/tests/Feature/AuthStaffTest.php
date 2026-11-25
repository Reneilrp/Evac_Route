<?php

namespace Tests\Feature;

use App\Models\Shelter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthStaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_cswdo_intake_accepts_family_name_field()
    {
        $staff = User::factory()->create([
            'role' => 'lgu_staff',
            'operator_type' => 'scanner',
            'status' => 'active',
        ]);

        $shelter = Shelter::create([
            'name' => 'Tetuan Evacuation Center',
            'latitude' => 6.9214,
            'longitude' => 122.0790,
            'barangay' => 'Tetuan',
            'max_capacity' => 100,
            'current_occupancy' => 0,
            'status' => 'open',
            'activation_status' => 'open',
        ]);

        // Mobile RapidWalkInModal sends 'family_name'
        $response = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/rapid-check-in", [
            'family_name' => 'Dela Cruz Household',
            'headcount' => 4,
            'barangay' => 'Tetuan',
            'contact_number' => '0917-111-2222',
            'vulnerabilities' => ['infant', 'senior'],
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $this->assertEquals(4, $shelter->fresh()->current_occupancy);
    }

    public function test_cswdo_intake_accepts_name_field()
    {
        $staff = User::factory()->create([
            'role' => 'lgu_staff',
            'operator_type' => 'scanner',
            'status' => 'active',
        ]);

        $shelter = Shelter::create([
            'name' => 'Tetuan Evacuation Center',
            'latitude' => 6.9214,
            'longitude' => 122.0790,
            'barangay' => 'Tetuan',
            'max_capacity' => 100,
            'current_occupancy' => 0,
            'status' => 'open',
            'activation_status' => 'open',
        ]);

        // Web QRScannerModal sends 'name'
        $response = $this->actingAs($staff)->postJson("/api/shelters/{$shelter->id}/rapid-check-in", [
            'name' => 'Santos Family',
            'headcount' => 3,
            'barangay' => 'Tetuan',
            'contact_number' => '0917-333-4444',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $this->assertEquals(3, $shelter->fresh()->current_occupancy);
    }

    public function test_newly_registered_cswdo_staff_can_login_with_case_and_whitespace_insensitivity()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        // Registered with uppercase and trailing whitespace
        $storeRes = $this->actingAs($admin)->postJson('/api/staff', [
            'name' => 'CSWDO Gate Officer',
            'email' => 'Cswdo.Scanner@lgu.gov.ph ',
            'password' => 'secret123',
            'role' => 'lgu_staff',
            'operator_type' => 'scanner',
            'status' => 'active',
        ]);

        $storeRes->assertStatus(201);

        // Mobile login (sends lowercase & trimmed)
        $loginRes = $this->postJson('/api/login', [
            'email' => 'cswdo.scanner@lgu.gov.ph',
            'password' => 'secret123',
        ]);

        $loginRes->assertStatus(200);
        $loginRes->assertJsonStructure(['access_token', 'user']);
    }

    public function test_staff_can_also_login_using_name_as_identifier()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $storeRes = $this->actingAs($admin)->postJson('/api/staff', [
            'name' => 'Commander Alpha',
            'email' => 'commander.alpha@lgu.gov.ph',
            'password' => 'secret123',
            'role' => 'lgu_staff',
            'operator_type' => 'rescue',
            'status' => 'active',
        ]);

        $storeRes->assertStatus(201);

        // Login using Name as identifier
        $loginRes = $this->postJson('/api/login', [
            'email' => 'Commander Alpha',
            'password' => 'secret123',
        ]);

        $loginRes->assertStatus(200);
        $loginRes->assertJsonStructure(['access_token', 'user']);
        $this->assertEquals('commander.alpha@lgu.gov.ph', $loginRes->json('user.email'));
    }

    public function test_rescue_fleet_seeder_enables_quick_select_accounts_idempotently()
    {
        $this->seed(\Database\Seeders\RescueFleetSeeder::class);

        foreach (['rescue1@lgu.gov.ph', 'medic1@lgu.gov.ph', 'delta3@lgu.gov.ph'] as $email) {
            $this->postJson('/api/login', [
                'email' => $email,
                'password' => 'password',
            ])->assertStatus(200)
                ->assertJsonPath('user.email', $email);
        }

        // Simulate live state change on MEDIC-1 and re-seed to ensure idempotency
        \App\Models\RescueUnit::where('call_sign', 'MEDIC-1')->update(['status' => 'standby']);
        $this->seed(\Database\Seeders\RescueFleetSeeder::class);

        $this->assertDatabaseHas('rescue_units', [
            'call_sign' => 'MEDIC-1',
            'status' => 'standby',
        ]);
    }
}
