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

    public function test_can_fetch_dataset_samples_from_real_csv(): void
    {
        $response = $this->getJson('/api/spk/dataset/samples?limit=10');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'dataset_source' => 'data_balita.csv',
        ]);

        $samples = $response->json('samples');
        $this->assertCount(10, $samples);
        $this->assertArrayHasKey('C1', $samples[0]['values']);
        $this->assertArrayHasKey('raw_attributes', $samples[0]);
        $this->assertNotNull($samples[0]['raw_attributes']['status_gizi']);
    }

    public function test_can_calculate_resilient_with_partial_criteria(): void
    {
        // Dataset hanya memiliki C1, C2, dan C4 (C3, C5, C6, C7 tidak ada)
        $payload = [
            'method' => 'saw',
            'criteria' => [
                ['code' => 'C1', 'name' => 'Kondisi Gizi', 'weight' => 0.3440, 'type' => 'benefit'],
                ['code' => 'C2', 'name' => 'Riwayat Lahir', 'weight' => 0.0881, 'type' => 'benefit'],
                ['code' => 'C4', 'name' => 'Pola Makan', 'weight' => 0.1466, 'type' => 'benefit'],
            ],
            'alternatives' => [
                [
                    'id' => 'CSV-001',
                    'name' => 'Balita 1 (Severely Stunted)',
                    'values' => ['C1' => 5.0, 'C2' => 4.0, 'C4' => 4.0],
                ],
                [
                    'id' => 'CSV-002',
                    'name' => 'Balita 2 (Normal)',
                    'values' => ['C1' => 2.0, 'C2' => 1.0, 'C4' => 2.0],
                ],
                [
                    'id' => 'CSV-003',
                    'name' => 'Balita 3 (Missing C4 / Fallback)',
                    'values' => ['C1' => 4.0], // Hanya ada C1
                ],
            ],
        ];

        $response = $this->postJson('/api/spk/calculate', $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'data' => [
                'method' => 'saw',
                'is_partial_dataset' => true,
            ],
        ]);

        $rankings = $response->json('data.rankings');
        $this->assertCount(3, $rankings);

        // Balita 1 dengan status severely stunted dan kriteria tinggi harus berada di peringkat 1
        $this->assertEquals('CSV-001', $rankings[0]['id']);
        $this->assertEquals('Sangat Tinggi', $rankings[0]['priority_level']);

        // Balita 3 yang hanya punya C1 harus tertangani dengan fallback tanpa crash
        $balita3 = collect($rankings)->firstWhere('id', 'CSV-003');
        $this->assertNotNull($balita3);
        $this->assertTrue($balita3['is_partial']);
        $this->assertContains('C4', $balita3['missing_criteria']);
    }
}

