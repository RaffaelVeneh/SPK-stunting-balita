<?php

namespace Tests\Feature;

use App\Models\BalitaSpk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpkTest extends TestCase
{
    // Basis data uji memakai SQLite di memori dan sebelumnya tidak menjalankan
    // migrasi sama sekali. Dulu itu tidak masalah karena data balita dibaca dari
    // berkas CSV; sejak pindah ke tabel balita_spk, migrasinya wajib dijalankan.
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Beberapa baris disemai supaya endpoint dataset punya isi untuk diuji.
        // Nilainya lengkap tujuh kriteria, sesuai syarat masuk aplikasi.
        // Nilai kriteria dibuat bervariasi penuh 1-5. Kalau semua sama, uji
        // sebaran kriteria gagal karena datasetnya degenerat.
        $status = ['normal', 'stunted', 'severely stunted', 'tinggi'];

        for ($i = 1; $i <= 12; $i++) {
            BalitaSpk::create([
                'kode' => sprintf('BAL-%04d', $i),
                'nama' => 'Uji ' . $i,
                'usia_bulan' => 12 + $i * 2,
                'jenis_kelamin' => $i % 2 === 1 ? 'Laki-Laki' : 'Perempuan',
                'tinggi_badan_cm' => 70 + $i,
                'haz' => -3.0 + ($i % 7) * 0.7,
                'status_gizi' => $status[$i % 4],
                'tren_memburuk' => $i % 3 === 0,
                'c1' => (($i - 1) % 5) + 1,
                'c2' => (($i + 1) % 5) + 1,
                'c3' => (($i + 2) % 5) + 1,
                'c4' => (($i + 3) % 5) + 1,
                'c5' => (($i + 4) % 5) + 1,
                'c6' => ($i % 5) + 1,
                'c7' => (($i + 2) % 5) + 1,
                'aktif' => true,
                'sumber' => 'dummy',
            ]);
        }
    }
    public function test_can_fetch_default_criteria(): void
    {
        $response = $this->getJson('/api/spk/criteria');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'criteria' => [
                '*' => ['code', 'name', 'weight', 'type', 'tier', 'jalur'],
            ],
        ]);
        $this->assertCount(7, $response->json('criteria'));

        $weights = array_column($response->json('criteria'), 'weight', 'code');
        $this->assertEqualsWithDelta(1.0, array_sum($weights), 1e-4, 'Total bobot harus 1');

        // BOBOT RESMI yang sudah disetujui dosen pembimbing, dari Fuzzy AHP
        // (Buckley) atas matriks perbandingan berpasangan tetap. Dikunci di
        // sini supaya perubahan apa pun pada matriks atau metode langsung
        // menggagalkan tes, bukan diam-diam menggeser hasil triase.
        $resmi = [
            'C1' => 0.350684, 'C2' => 0.087080, 'C3' => 0.227551,
            'C4' => 0.146093, 'C5' => 0.050755, 'C6' => 0.087080,
            'C7' => 0.050755,
        ];
        foreach ($resmi as $kode => $nilai) {
            $this->assertEqualsWithDelta(
                $nilai,
                $weights[$kode],
                1e-5,
                "Bobot {$kode} tidak sesuai angka resmi"
            );
        }

        // C1 tertinggi, dan urutannya C1 > C3 > C4 > C2=C6 > C5=C7
        $this->assertEqualsWithDelta(max($weights), $weights['C1'], 1e-6);
        $this->assertGreaterThan($weights['C3'], $weights['C1']);
        $this->assertGreaterThan($weights['C4'], $weights['C3']);
        $this->assertGreaterThan($weights['C2'], $weights['C4']);
        $this->assertEqualsWithDelta($weights['C2'], $weights['C6'], 1e-6);
        $this->assertEqualsWithDelta($weights['C5'], $weights['C7'], 1e-6);
        $this->assertGreaterThan($weights['C5'], $weights['C2']);

        // Penyebab langsung (C1-C4) tidak boleh kalah dari tidak langsung
        $langsung = min($weights['C1'], $weights['C2'], $weights['C3'], $weights['C4']);
        $tidakLangsung = max($weights['C5'], $weights['C6'], $weights['C7']);
        $this->assertGreaterThanOrEqual(
            $tidakLangsung,
            $langsung,
            'Kriteria penyebab langsung (C1-C4) tidak boleh lebih rendah daripada tidak langsung (C5-C7)'
        );
    }

    /**
     * REGRESSION TEST untuk bug yang pernah terjadi:
     * matriks AHP yang ditampilkan menghasilkan bobot 35,62% untuk C1,
     * sedangkan perhitungan memakai 34,40%. Kedua endpoint sekarang harus
     * menghasilkan bobot yang identik karena keduanya diturunkan dari
     * KriteriaDefinition yang sama.
     */
    public function test_weights_from_criteria_match_weights_from_ahp_matrix(): void
    {
        $criteria = $this->getJson('/api/spk/criteria')->json('criteria');
        $bobotCriteria = array_column($criteria, 'weight', 'code');

        $matrix = $this->getJson('/api/spk/ahp/matrix')->json('ahp_result.weights_fuzzy');

        $this->assertNotEmpty($bobotCriteria);
        $this->assertNotEmpty($matrix);

        foreach ($bobotCriteria as $kode => $w) {
            $this->assertEqualsWithDelta(
                $w,
                $matrix[$kode],
                1e-6,
                "Bobot {$kode} berbeda antara /criteria dan /ahp/matrix — bug desinkronisasi bobot kembali terjadi"
            );
        }
    }

    public function test_ahp_matrix_returns_consistent_weights(): void
    {
        $response = $this->getJson('/api/spk/ahp/matrix');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'ahp_result' => ['is_valid' => true],
        ]);

        $cr = $response->json('ahp_result.consistency_ratio');
        $this->assertLessThan(0.10, $cr, "Consistency Ratio harus < 0.10, didapatkan: {$cr}");

        // Jejak audit 21 perbandingan unik harus tersedia
        $jejak = $response->json('jejak_audit');
        $this->assertCount(21, $jejak, 'Harus ada 21 perbandingan unik untuk 7 kriteria');
        $this->assertArrayHasKey('label', $jejak[0]);
        $this->assertArrayHasKey('beda_tier', $jejak[0]);

        // Matriks harus resiprokal
        $matriks = $response->json('matrix');
        for ($i = 0; $i < 7; $i++) {
            $this->assertEqualsWithDelta(1.0, $matriks[$i][$i], 1e-9);
            for ($j = 0; $j < 7; $j++) {
                $this->assertEqualsWithDelta(
                    1.0,
                    $matriks[$i][$j] * $matriks[$j][$i],
                    1e-9,
                    "Matriks tidak resiprokal pada [{$i}][{$j}]"
                );
            }
        }
    }

    public function test_saw_is_rejected_because_only_moora_is_supported(): void
    {
        $response = $this->postJson('/api/spk/calculate', [
            'method' => 'saw',
            'alternatives' => [
                ['id' => 'B01', 'name' => 'Balita', 'values' => ['C1' => 5]],
            ],
        ]);

        $response->assertStatus(422);
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
            'scoring_method' => 'MOORA',
            'data' => ['method' => 'moora'],
        ]);

        $rankings = $response->json('data.rankings');
        $this->assertCount(2, $rankings);
        $this->assertEquals('B01', $rankings[0]['id']);
        $this->assertEquals(1, $rankings[0]['rank']);
        $this->assertEquals('Sangat Tinggi', $rankings[0]['priority_level']);
        $this->assertEquals('Rendah', $rankings[1]['priority_level']);
    }

    /**
     * Tingkat prioritas harus berasal dari ATURAN KLINIS ABSOLUT, bukan dari
     * posisi relatif di dalam kohort. Artinya anak dengan profil identik harus
     * mendapat tingkat yang sama, walau kohortnya diubah-ubah.
     */
    public function test_priority_level_is_absolute_not_cohort_relative(): void
    {
        $anak = ['id' => 'X1', 'name' => 'Anak', 'values' => ['C1' => 5, 'C2' => 1, 'C3' => 1]];

        // Kohort A: hanya anak ini
        $a = $this->postJson('/api/spk/calculate', ['method' => 'moora', 'alternatives' => [$anak]])
            ->json('data.rankings.0.priority_level');

        // Kohort B: anak yang sama, tapi ada banyak anak yang jauh lebih sehat
        $alternatives = [$anak];
        for ($i = 0; $i < 10; $i++) {
            $alternatives[] = [
                'id' => "S{$i}", 'name' => 'Sehat', 'values' => ['C1' => 1, 'C2' => 1, 'C3' => 1],
            ];
        }
        $b = $this->postJson('/api/spk/calculate', ['method' => 'moora', 'alternatives' => $alternatives])
            ->json('data.rankings.0.priority_level');

        $this->assertEquals('Sangat Tinggi', $a);
        $this->assertEquals(
            $a,
            $b,
            'Tingkat prioritas berubah karena komposisi kohort — aturan relatif min-max kembali dipakai'
        );
    }

    public function test_partial_data_is_not_imputed_as_low_risk(): void
    {
        $response = $this->postJson('/api/spk/calculate', [
            'method' => 'moora',
            'criteria' => [
                ['code' => 'C1', 'name' => 'Gizi', 'weight' => 0.5, 'type' => 'benefit'],
                ['code' => 'C2', 'name' => 'Lahir', 'weight' => 0.2, 'type' => 'benefit'],
                ['code' => 'C3', 'name' => 'Infeksi', 'weight' => 0.3, 'type' => 'benefit'],
            ],
            'alternatives' => [
                // Hanya punya C1; C2 sampai C7 tidak diketahui
                ['id' => 'P01', 'name' => 'Parsial', 'values' => ['C1' => 5.0]],
            ],
        ]);

        $response->assertStatus(200);
        $item = $response->json('data.rankings.0');

        // Bobot terkunci: klien mengirim 3 kriteria, tetapi sistem tetap
        // memakai ketujuh kriteria resmi dengan bobot AHP-nya.
        $this->assertEquals(7, $response->json('data.criteria_count'));
        $this->assertEqualsCanonicalizing(
            ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
            $response->json('data.active_criteria')
        );

        $this->assertTrue($item['is_partial']);
        $this->assertEquals('1/7', $item['completeness_ratio']);
        $this->assertEqualsCanonicalizing(
            ['C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
            $item['missing_criteria']
        );

        // Kriteria yang hilang TIDAK boleh muncul dengan nilai rekaan
        $ordinal = $item['details']['nilai_ordinal'];
        $this->assertArrayNotHasKey('C2', $ordinal);
        $this->assertArrayNotHasKey('C3', $ordinal);

        // Data belum lengkap harus ditandai, bukan diturunkan tingkatnya diam-diam
        $this->assertTrue($item['perlu_verifikasi']);
    }

    /**
     * BOBOT TERKUNCI. Apa pun yang dikirim klien pada field 'criteria' harus
     * diabaikan sepenuhnya. Ini menutup jalur pembobotan dinamis: sebelumnya
     * klien dapat mengirim bobotnya sendiri dan bobot itu diredistribusi
     * mengikuti kriteria yang aktif di antarmuka.
     */
    public function test_client_supplied_weights_are_completely_ignored(): void
    {
        $alternatives = [
            ['id' => 'A1', 'name' => 'Berisiko', 'values' => ['C1' => 5.0, 'C2' => 4.0, 'C3' => 5.0]],
            ['id' => 'A2', 'name' => 'Aman', 'values' => ['C1' => 1.0, 'C2' => 1.0, 'C3' => 1.0]],
        ];

        $kirim = function (array $criteria, array $alternatives) {
            return $this->postJson('/api/spk/calculate', [
                'method' => 'moora',
                'criteria' => $criteria,
                'alternatives' => $alternatives,
            ])->json('data.rankings');
        };

        // Bobot ekstrem yang saling bertolak belakang
        $a = $kirim([['code' => 'C1', 'name' => 'x', 'weight' => 0.99, 'type' => 'benefit']], $alternatives);
        $b = $kirim([['code' => 'C1', 'name' => 'x', 'weight' => 0.01, 'type' => 'benefit']], $alternatives);

        $this->assertEquals(
            $a,
            $b,
            'Hasil berubah ketika klien mengirim bobot berbeda — bobot tidak lagi terkunci'
        );

        // Dan urutannya harus sama dengan hasil tanpa mengirim criteria sama sekali
        $c = $this->postJson('/api/spk/calculate', [
            'method' => 'moora',
            'alternatives' => $alternatives,
        ])->json('data.rankings');

        $this->assertEquals($a, $c, 'Hasil berbeda antara mengirim criteria dan tidak mengirim');
    }

    /**
     * Balita dengan kriteria lebih lengkap tidak boleh dirugikan, dan balita
     * berdata kurang memang memperoleh skor lebih kecil sebagai konsekuensi
     * bobot yang terkunci. Yang penting: tingkat prioritasnya TIDAK ikut turun.
     */
    public function test_locked_weights_do_not_lower_priority_level_of_incomplete_data(): void
    {
        $rankings = $this->postJson('/api/spk/calculate', [
            'method' => 'moora',
            'alternatives' => [
                // C1 = 5 tetapi hanya satu kriteria terisi
                ['id' => 'KURANG', 'name' => 'Data kurang', 'values' => ['C1' => 5.0]],
                // C1 = 5 dengan data lengkap
                ['id' => 'LENGKAP', 'name' => 'Data lengkap', 'values' => [
                    'C1' => 5.0, 'C2' => 4.0, 'C3' => 3.0, 'C4' => 2.0,
                    'C5' => 2.0, 'C6' => 2.0, 'C7' => 2.0,
                ]],
            ],
        ])->json('data.rankings');

        $kurang = collect($rankings)->firstWhere('id', 'KURANG');
        $lengkap = collect($rankings)->firstWhere('id', 'LENGKAP');

        // Data lengkap wajar berskor lebih tinggi
        $this->assertGreaterThan($kurang['score'], $lengkap['score']);

        // Tetapi tingkatnya sama, karena tingkat tidak diambil dari skor
        $this->assertEquals('Sangat Tinggi', $kurang['priority_level']);
        $this->assertEquals('Sangat Tinggi', $lengkap['priority_level']);
    }

    public function test_severely_stunted_child_is_never_labelled_low_priority(): void
    {
        $alternatives = [];
        for ($c1 = 1; $c1 <= 5; $c1++) {
            for ($lain = 1; $lain <= 5; $lain++) {
                $alternatives[] = [
                    'id' => "T{$c1}{$lain}",
                    'name' => "Tes {$c1}-{$lain}",
                    'values' => ['C1' => (float) $c1, 'C2' => (float) $lain, 'C3' => (float) $lain],
                ];
            }
        }

        $rankings = $this->postJson('/api/spk/calculate', [
            'method' => 'moora',
            'alternatives' => $alternatives,
        ])->json('data.rankings');

        foreach ($rankings as $r) {
            if ((float) $r['details']['nilai_ordinal']['C1'] >= 5.0) {
                $this->assertEquals(
                    'Sangat Tinggi',
                    $r['priority_level'],
                    "Anak dengan C1 = 5 tidak boleh berlabel {$r['priority_level']}"
                );
            }
        }
    }

    public function test_can_fetch_dataset_samples_from_dummy_7_kriteria(): void
    {
        $response = $this->getJson('/api/spk/dataset/samples?limit=10');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'dataset_format' => '7_kriteria',
        ]);

        $samples = $response->json('samples');
        $this->assertCount(10, $samples);

        foreach ($samples as $s) {
            $this->assertArrayHasKey('values', $s);
            $this->assertArrayHasKey('raw_attributes', $s);
            $this->assertNotNull($s['raw_attributes']['status_gizi']);
            // Setiap kriteria harus bernilai 1-5 bila ada
            foreach ($s['values'] as $kode => $v) {
                $this->assertGreaterThanOrEqual(1, $v, "Nilai {$kode} di luar rentang");
                $this->assertLessThanOrEqual(5, $v, "Nilai {$kode} di luar rentang");
            }
        }
    }

    public function test_dataset_summary_reports_criterion_spread(): void
    {
        $response = $this->getJson('/api/spk/dataset/summary');

        $response->assertStatus(200);
        $response->assertJson(['status' => 'success', 'dataset_format' => '7_kriteria']);

        $sebaran = $response->json('sebaran_kriteria');
        $this->assertArrayHasKey('C1', $sebaran);
        $this->assertArrayHasKey('C7', $sebaran);

        // Setiap kriteria harus mencakup lebih dari satu tingkat, kalau tidak
        // kriteria itu tidak informatif dan bobotnya tidak akan berpengaruh.
        foreach ($sebaran as $kode => $tingkat) {
            $terisi = count(array_filter($tingkat));
            $this->assertGreaterThan(
                2,
                $terisi,
                "Kriteria {$kode} hanya punya {$terisi} tingkat berbeda — dataset kembali degenerat"
            );
        }
    }
}
