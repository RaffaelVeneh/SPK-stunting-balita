<?php

namespace Tests\Feature;

use Tests\TestCase;

class SpkTest extends TestCase
{
    public function test_can_fetch_default_criteria(): void
    {
        $response = $this->getJson('/api/spk/criteria');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'criteria' => [
                '*' => ['code', 'name', 'weight', 'type'],
            ],
        ]);
        $this->assertCount(7, $response->json('criteria'));
    }

    public function test_can_calculate_saw(): void
    {
        $payload = [
            'method' => 'saw',
            'criteria' => [
                ['code' => 'C1', 'name' => 'Kondisi Gizi', 'weight' => 0.5, 'type' => 'benefit'],
                ['code' => 'C2', 'name' => 'Sanitasi', 'weight' => 0.5, 'type' => 'benefit'],
            ],
            'alternatives' => [
                ['id' => 'B01', 'name' => 'Balita Kritis', 'values' => ['C1' => 5, 'C2' => 5]],
                ['id' => 'B02', 'name' => 'Balita Sehat', 'values' => ['C1' => 1, 'C2' => 1]],
            ],
        ];

        $response = $this->postJson('/api/spk/calculate', $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'data' => [
                'method' => 'saw',
            ],
        ]);

        $rankings = $response->json('data.rankings');
        $this->assertCount(2, $rankings);
        $this->assertEquals('B01', $rankings[0]['id']);
        $this->assertEquals(1, $rankings[0]['rank']);
        $this->assertEquals('B02', $rankings[1]['id']);
        $this->assertEquals(2, $rankings[1]['rank']);
    }

    public function test_can_calculate_moora(): void
    {
        $payload = [
            'method' => 'moora',
            'criteria' => [
                ['code' => 'C1', 'name' => 'Kondisi Gizi', 'weight' => 0.5, 'type' => 'benefit'],
                ['code' => 'C2', 'name' => 'Sanitasi', 'weight' => 0.5, 'type' => 'benefit'],
            ],
            'alternatives' => [
                ['id' => 'B01', 'name' => 'Balita Kritis', 'values' => ['C1' => 5, 'C2' => 5]],
                ['id' => 'B02', 'name' => 'Balita Sehat', 'values' => ['C1' => 1, 'C2' => 1]],
            ],
        ];

        $response = $this->postJson('/api/spk/calculate', $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'data' => [
                'method' => 'moora',
            ],
        ]);

        $rankings = $response->json('data.rankings');
        $this->assertCount(2, $rankings);
        $this->assertEquals('B01', $rankings[0]['id']);
        $this->assertEquals(1, $rankings[0]['rank']);
    }

    public function test_ahp_matrix_returns_consistent_weights(): void
    {
        $response = $this->getJson('/api/spk/ahp/matrix');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'ahp_result' => [
                'is_valid' => true,
            ],
        ]);

        $cr = $response->json('ahp_result.consistency_ratio');
        $this->assertLessThan(0.10, $cr, "Consistency Ratio harus < 0.10, didapatkan: {$cr}");

        $weights = $response->json('ahp_result.weights');
        $this->assertArrayHasKey('C1', $weights);
        $this->assertArrayHasKey('C2', $weights);
        $this->assertArrayHasKey('C3', $weights);
        $this->assertArrayHasKey('C4', $weights);
        $this->assertArrayHasKey('C5', $weights);
        $this->assertArrayHasKey('C6', $weights);
        $this->assertArrayHasKey('C7', $weights);

        // C1 (Kondisi Gizi) harus memiliki bobot tertinggi
        $this->assertEquals(max($weights), $weights['C1']);
    }
}
