<?php

namespace App\Services\SPK;

/**
 * MOORA (Multi-Objective Optimization on the basis of Ratio Analysis).
 *
 * Rumus: r_ij = x_ij / akar(sum_i x_ij^2)  ->  y_i = sum_j w_j * r_ij
 * Semua kriteria bertipe BENEFIT, karena tahap fuzzifikasi sudah membalik
 * indikator kesejahteraan (sanitasi bagus, ekonomi mapan) menjadi skor
 * urgensi. Karena itu suku cost tidak pernah terpakai.
 *
 * DUA PERBAIKAN PENTING dibanding versi sebelumnya:
 *
 * 1. TINGKAT PRIORITAS tidak lagi memakai ambang relatif min-max
 *    (rel = (y - y_min) / (y_max - y_min)), melainkan ATURAN KLINIS ABSOLUT.
 *    Alasannya: ambang relatif selalu memaksa ada minimal satu balita
 *    "Sangat Tinggi" dan satu "Rendah" di setiap kohort, sekalipun seluruh
 *    kohortnya sehat. Pada file hasil export lama, semua 20 balita berskor
 *    <= 0,2896 tetapi 5 di antaranya tetap dilabeli "Sangat Tinggi -> Rujuk
 *    Dokter Spesialis Anak". Itu penghasil alarm palsu. Selain itu skor MOORA
 *    menyusut mengikuti ukuran kohort (efek akar n), sehingga skor satu batch
 *    tidak sebanding dengan batch lain.
 *
 *    Sekarang pembagian tugasnya jelas:
 *      - MOORA        -> menentukan URUTAN (siapa diperiksa lebih dulu)
 *      - ATURAN KLINIS -> menentukan TINGKAT (seberapa gawat)
 *
 * 2. DATA YANG TIDAK DIKETAHUI tidak lagi diisi nilai 1. Sebelumnya nilai
 *    kosong diimputasi 1.0, dan karena skala 1 berarti risiko terendah,
 *    "tidak diketahui" diperlakukan sebagai "tidak berisiko" -- keliru dan
 *    berbahaya untuk alat triase. Sekarang kriteria yang kosong dikeluarkan
 *    dari perhitungan dan anak dengan data belum lengkap DITANDAI "perlu
 *    verifikasi lapangan" serta tidak boleh diturunkan tingkatnya sepihak.
 *
 * 3. BOBOT TERKUNCI / TIDAK DINAMIS. Bobot kriteria dipakai APA ADANYA dari
 *    hasil Fuzzy AHP. Redistribusi bobot proporsional sudah DIHAPUS, karena
 *    cara itu membuat bobot efektif berubah mengikuti kriteria mana yang
 *    kebetulan terisi, sehingga angka yang dipakai menghitung bukan lagi bobot
 *    AHP melainkan bobot turunan yang berbeda untuk tiap balita. Akibatnya
 *    peringkat tidak dapat dipertanggungjawabkan dari satu perhitungan AHP.
 *    Konsekuensi yang disengaja: balita berdata kurang memperoleh skor lebih
 *    rendah karena bukti yang terkumpul memang lebih sedikit. Karena itu
 *    tingkat prioritas diambil dari ATURAN KLINIS ABSOLUT, bukan dari skor.
 */
class MooraService
{
    private const TOTAL_KRITERIA_STANDAR = 7;

    /** Tindakan klinis per tingkat prioritas. */
    public const TINDAKAN = [
        'Sangat Tinggi' => 'Rujuk Dokter Spesialis Anak & PMT Pemulihan Segera',
        'Tinggi' => 'Kunjungan Rumah Kader & Konseling Gizi Intensif',
        'Sedang' => 'Pemantauan Rutin Posyandu & Suplementasi Vitamin',
        'Rendah' => 'Pemantauan Rutin Posyandu',
    ];

    private const URUTAN_TINGKAT = ['Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];

    /** Ambang minimum tingkat berdasarkan skor C1, dipakai saat data belum lengkap. */
    private const AMBANG_EKSPEKTASI_C1 = [
        5 => 'Sangat Tinggi',
        4 => 'Tinggi',
        3 => 'Sedang',
    ];

    public function calculate(array $alternatives, array $criteria): array
    {
        if (empty($alternatives) || empty($criteria)) {
            return [
                'method' => 'moora',
                'rankings' => [],
                'normalized_matrix' => [],
                'weighted_matrix' => [],
                'is_partial_dataset' => false,
                'active_criteria' => [],
                'criteria_count' => 0,
            ];
        }

        // 1. Normalisasi bobot agar jumlahnya 1
        $totalWeight = array_sum(array_column($criteria, 'weight'));
        $criteriaMap = [];
        foreach ($criteria as $c) {
            $code = $c['code'];
            $criteriaMap[$code] = [
                'name' => $c['name'] ?? $code,
                'weight' => $totalWeight > 0
                    ? (float) $c['weight'] / $totalWeight
                    : 1.0 / count($criteria),
                'type' => strtolower($c['type'] ?? 'benefit'),
            ];
        }

        // 2. Pembagi akar jumlah kuadrat per kriteria, DIHITUNG HANYA dari
        //    nilai yang benar-benar ada, supaya anak dengan data parsial tidak
        //    dirugikan oleh nilai yang tidak diketahui.
        $denominators = [];
        foreach ($criteriaMap as $code => $crit) {
            $sumSquares = 0.0;
            $jumlah = 0;
            foreach ($alternatives as $alt) {
                $v = $alt['values'][$code] ?? null;
                if (is_numeric($v)) {
                    $sumSquares += ((float) $v) ** 2;
                    $jumlah++;
                }
            }
            $denominators[$code] = $jumlah > 0 && $sumSquares > 0
                ? sqrt($sumSquares)
                : 1.0;
        }

        // 3. Normalisasi rasio, perkalian bobot, dan penentuan tingkat klinis
        $normalizedMatrix = [];
        $weightedMatrix = [];
        $scores = [];
        $hasAnyPartial = false;

        foreach ($alternatives as $alt) {
            $altId = (string) $alt['id'];
            $normalizedMatrix[$altId] = [];
            $weightedMatrix[$altId] = [];

            $benefitSum = 0.0;
            $costSum = 0.0;
            $filledCount = 0;
            $missing = [];
            $nilaiOrdinal = [];

            // Kriteria yang tersedia. Balita boleh belum lengkap, tetapi bobot
            // yang dipakai TIDAK disesuaikan dengan kelengkapan itu (lihat
            // catatan BOBOT TERKUNCI di bawah).
            $available = [];
            foreach ($criteriaMap as $code => $crit) {
                $v = $alt['values'][$code] ?? null;
                if (is_numeric($v)) {
                    $available[$code] = (float) $v;
                    $filledCount++;
                } else {
                    $missing[] = $code;
                }
            }

            foreach ($available as $code => $val) {
                $crit = $criteriaMap[$code];

                // ============================================================
                // BOBOT TERKUNCI — TIDAK DINAMIS.
                //
                // Sebelumnya di sini bobot diredistribusi secara proporsional
                // ke kriteria yang tersedia ($crit['weight'] / $availableWeight).
                // Cara itu dihapus karena membuat bobot efektif bergantung pada
                // kriteria mana yang kebetulan terisi, sehingga angka yang
                // dipakai menghitung bukan lagi bobot hasil AHP melainkan bobot
                // turunan yang berbeda untuk tiap balita. Akibatnya peringkat
                // tidak dapat dipertanggungjawabkan dari satu perhitungan AHP.
                //
                // Sekarang bobot AHP dipakai APA ADANYA. Konsekuensi yang
                // disengaja: balita dengan kriteria belum lengkap memperoleh
                // skor lebih rendah karena bukti yang terkumpul memang lebih
                // sedikit. Itu sebabnya tingkat prioritas TIDAK diambil dari
                // skor, melainkan dari aturan klinis absolut, dan balita
                // berdata kurang ditandai "perlu verifikasi lapangan".
                // ============================================================
                $wLocked = $crit['weight'];

                $r = $val / ($denominators[$code] > 0 ? $denominators[$code] : 1.0);
                $v = $r * $wLocked;

                $normalizedMatrix[$altId][$code] = round($r, 4);
                $weightedMatrix[$altId][$code] = round($v, 4);
                $nilaiOrdinal[$code] = $val;

                if ($crit['type'] === 'benefit') {
                    $benefitSum += $v;
                } else {
                    $costSum += $v;
                }
            }

            $isPartial = $missing !== [] || count($criteriaMap) < self::TOTAL_KRITERIA_STANDAR;
            if ($isPartial) {
                $hasAnyPartial = true;
            }

            $klinis = $this->tentukanTingkatKlinis($nilaiOrdinal, $filledCount);

            $scores[] = [
                'id' => $altId,
                'name' => $alt['name'] ?? $altId,
                'score' => round($benefitSum - $costSum, 4),
                'benefit_score' => round($benefitSum, 4),
                'cost_score' => round($costSum, 4),
                'filled_count' => $filledCount,
                'is_partial' => $isPartial,
                'completeness_ratio' => $filledCount . '/' . count($criteriaMap),
                'missing_criteria' => $missing,
                'raw_attributes' => $alt['raw_attributes'] ?? null,
                'priority_level' => $klinis['tingkat'],
                'tingkat_dasar' => $klinis['dasar'],
                'n_kriteria_tinggi' => $klinis['n_tinggi'],
                'perlu_verifikasi' => $klinis['perlu_verifikasi'],
                'tindakan' => $klinis['tindakan'],
                'nilai_ordinal' => $nilaiOrdinal,
            ];
        }

        // 4. Perangkingan menurun dengan penanganan SERI yang benar
        //    (skor sama -> peringkat sama, peringkat berikutnya melompat).
        usort($scores, static fn ($a, $b) => $b['score'] <=> $a['score']);

        $rankings = [];
        $peringkatSebelumnya = 0;
        $skorSebelumnya = null;
        foreach ($scores as $index => $item) {
            if ($skorSebelumnya !== null && abs($item['score'] - $skorSebelumnya) < 1e-9) {
                $rank = $peringkatSebelumnya;
            } else {
                $rank = $index + 1;
                $peringkatSebelumnya = $rank;
                $skorSebelumnya = $item['score'];
            }

            $rankings[] = [
                'id' => $item['id'],
                'name' => $item['name'],
                'score' => $item['score'],
                'rank' => $rank,
                'priority_level' => $item['priority_level'],
                'is_partial' => $item['is_partial'],
                'completeness_ratio' => $item['completeness_ratio'],
                'missing_criteria' => $item['missing_criteria'],
                'raw_attributes' => $item['raw_attributes'],
                'perlu_verifikasi' => $item['perlu_verifikasi'],
                'tindakan' => $item['tindakan'],
                'details' => [
                    'method' => 'MOORA',
                    'benefit_score' => $item['benefit_score'],
                    'cost_score' => $item['cost_score'],
                    'tingkat_dasar' => $item['tingkat_dasar'],
                    'n_kriteria_tinggi' => $item['n_kriteria_tinggi'],
                    'nilai_ordinal' => $item['nilai_ordinal'],
                ],
            ];
        }

        return [
            'method' => 'moora',
            'rankings' => $rankings,
            'normalized_matrix' => $normalizedMatrix,
            'weighted_matrix' => $weightedMatrix,
            'is_partial_dataset' => $hasAnyPartial,
            'active_criteria' => array_keys($criteriaMap),
            'criteria_count' => count($criteriaMap),
        ];
    }

    /**
     * Tingkat prioritas dari PROFIL KLINIS ABSOLUT anak, bukan dari posisinya
     * di dalam kohort. Skala ordinal 1-5 bersifat absolut, sehingga tingkat
     * seorang anak tidak berubah hanya karena anak lain di batch yang sama
     * kebetulan lebih sehat atau lebih sakit.
     *
     * Aturan (dievaluasi berurutan, kecocokan pertama dipakai):
     *
     *   SANGAT TINGGI : C1 = 5
     *                   ATAU (C1 = 4 DAN >= 2 kriteria lain >= 4)
     *   TINGGI        : C1 = 4
     *                   ATAU (C1 <= 3 DAN >= 3 kriteria lain >= 4)
     *   SEDANG        : C1 = 3
     *                   ATAU (C1 <= 2 DAN >= 2 kriteria lain >= 4)
     *                   ATAU (>= 3 kriteria lain = 3)
     *   RENDAH        : selainnya
     *
     * @param  array<string, float>  $nilai  skor ordinal per kode kriteria
     */
    public function tentukanTingkatKlinis(array $nilai, int $kelengkapan): array
    {
        $c1 = $nilai['C1'] ?? null;

        $lain = [];
        foreach ($nilai as $kode => $v) {
            if ($kode !== 'C1') {
                $lain[] = $v;
            }
        }
        $nTinggi = count(array_filter($lain, static fn ($v) => $v >= 4));
        $nSedang = count(array_filter($lain, static fn ($v) => abs($v - 3) < 1e-9));

        if ($c1 === null) {
            $tingkat = 'Sedang';
            $dasar = 'C1 tidak terukur; tingkat ditahan di Sedang';
        } elseif ($c1 >= 5) {
            $tingkat = 'Sangat Tinggi';
            $dasar = 'C1 = 5 (severely stunted, atau stunted dengan tren tumbuh memburuk) -> rujuk segera';
        } elseif ($c1 >= 4 && $nTinggi >= 2) {
            $tingkat = 'Sangat Tinggi';
            $dasar = "C1 = 4 dengan {$nTinggi} kriteria risiko tinggi lain (risiko kumulatif)";
        } elseif ($c1 >= 4) {
            $tingkat = 'Tinggi';
            $dasar = 'C1 = 4 (stunted)';
        } elseif ($nTinggi >= 3) {
            $tingkat = 'Tinggi';
            $dasar = 'C1 = ' . (int) $c1 . " tetapi {$nTinggi} kriteria risiko tinggi lain";
        } elseif ($c1 >= 3) {
            $tingkat = 'Sedang';
            $dasar = 'C1 = 3 (waspada KMS)';
        } elseif ($nTinggi >= 2) {
            $tingkat = 'Sedang';
            $dasar = 'C1 = ' . (int) $c1 . " dengan {$nTinggi} kriteria risiko tinggi lain";
        } elseif ($nSedang >= 3) {
            $tingkat = 'Sedang';
            $dasar = "{$nSedang} kriteria berisiko sedang";
        } else {
            $tingkat = 'Rendah';
            $dasar = 'Seluruh kriteria pada tingkat risiko rendah';
        }

        // --- koreksi data belum lengkap ---
        // Anak yang datanya belum diketahui TIDAK boleh diturunkan tingkatnya
        // secara sepihak.
        $perluVerifikasi = false;
        if ($kelengkapan < 5) {
            $perluVerifikasi = true;
            if ($c1 !== null) {
                $minimal = self::AMBANG_EKSPEKTASI_C1[(int) $c1] ?? null;
                if ($minimal !== null
                    && array_search($tingkat, self::URUTAN_TINGKAT, true)
                        < array_search($minimal, self::URUTAN_TINGKAT, true)) {
                    $tingkat = $minimal;
                    $dasar .= ' | DINAIKKAN karena data belum lengkap';
                }
            }
        }

        return [
            'tingkat' => $tingkat,
            'dasar' => $dasar,
            'n_tinggi' => $nTinggi,
            'n_sedang' => $nSedang,
            'perlu_verifikasi' => $perluVerifikasi,
            'tindakan' => self::TINDAKAN[$tingkat],
        ];
    }
}
