<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_user_can_login()
    {
        $user = User::factory()->create([
            'email' => 'active@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'active@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['access_token', 'user']);
    }

    public function test_inactive_user_cannot_login()
    {
        $user = User::factory()->create([
            'email' => 'inactive@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'status' => 'inactive',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'inactive@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'message' => 'Your account is deactivated. Please contact an administrator.',
        ]);
    }

    public function test_active_user_status_change_revokes_token_and_blocks_access()
    {
        $user = User::factory()->create([
            'email' => 'staff@example.com',
            'role' => 'lgu_staff',
            'status' => 'active',
        ]);

        // Generate token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Verify user can access protected route
        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/user');
        $response->assertStatus(200);

        // Deactivate user
        $user->status = 'inactive';
        $user->save();

        // Clear auth cache in the test container to simulate a fresh request
        auth()->forgetUser();
        auth('sanctum')->forgetUser();

        // Request again — should fail with 403 and delete the token
        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/user');

        $response->assertStatus(403);
        $response->assertJson([
            'status' => 'error',
            'message' => 'Your account is deactivated. Session terminated.',
        ]);

        // Verify token is deleted in the database
        $this->assertEquals(0, $user->tokens()->count());
    }

    public function test_login_endpoint_is_throttled()
    {
        $user = User::factory()->create([
            'email' => 'active@example.com',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);

        // Send 5 login requests (should succeed/fail normally depending on credentials, here we send valid)
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/login', [
                'email' => 'active@example.com',
                'password' => 'password123',
            ]);
            $response->assertStatus(200);
        }

        // The 6th request should be throttled (429 Too Many Requests)
        $response = $this->postJson('/api/login', [
            'email' => 'active@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(429);
    }
}
