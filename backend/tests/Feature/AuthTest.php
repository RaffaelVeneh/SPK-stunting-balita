<?php

namespace Tests\Feature;

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

    public function test_all_three_superadmins_can_login_with_superadmin_role(): void
    {
        $superadmins = [
            'raffaelvincent.2024@student.uny.ac.id',
            'muhammadfaizulhaq.2024@student.uny.ac.id',
            'galantonalatif.2024@student.uny.ac.id',
        ];

        foreach ($superadmins as $email) {
            $response = $this->postJson('/api/auth/login', [
                'email' => $email,
                'password' => 'password123',
            ]);

            $response->assertStatus(200);
            $response->assertJson([
                'status' => 'success',
                'user' => [
                    'email' => $email,
                    'role' => 'superadmin',
                    'is_superadmin' => true,
                ],
            ]);
            $this->assertNotEmpty($response->json('token'));
        }
    }

    public function test_standard_user_logs_in_as_normal_user(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'mahasiswa.user@student.uny.ac.id',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'user' => [
                'email' => 'mahasiswa.user@student.uny.ac.id',
                'role' => 'user',
                'is_superadmin' => false,
            ],
        ]);
    }
}
