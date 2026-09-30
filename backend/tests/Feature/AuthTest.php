<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_rejects_non_uny_email_domain(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'user@gmail.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
    }

    public function test_superadmin_can_login_with_student_uny_domain(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'raffaelvincent.2024@student.uny.ac.id',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'user' => [
                'email' => 'raffaelvincent.2024@student.uny.ac.id',
                'role' => 'superadmin',
                'is_superadmin' => true,
            ],
        ]);
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_staff_can_login_with_uny_ac_id_domain(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin.gizi@uny.ac.id',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'user' => [
                'email' => 'admin.gizi@uny.ac.id',
                'role' => 'admin',
            ],
        ]);
    }
}
