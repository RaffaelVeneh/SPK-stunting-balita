<?php

namespace App\Services\SPK;

class AhpService
{
    /**
     * Random Index (RI) Saaty untuk n = 1 s/d 10.
     */
    protected array $randomIndices = [
        1 => 0.00,
        2 => 0.00,
        3 => 0.58,
        4 => 0.90,
        5 => 1.12,
        6 => 1.24,
        7 => 1.32,
        8 => 1.41,
        9 => 1.45,
        10 => 1.49,
    ];

    /**
     * Menghitung bobot kriteria AHP dan menguji konsistensi (Consistency Ratio / CR).
     *
     * @param array $criteriaCodes Array kode kriteria, contoh: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']
     * @param array $matrix Matriks perbandingan berpasangan n x n (skala Saaty 1-9)
     * @return array
     */
    public function computeWeights(array $criteriaCodes, array $matrix): array
    {
        $n = count($criteriaCodes);
        if ($n < 2) {
            throw new \InvalidArgumentException('Jumlah kriteria minimal 2.');
        }

        // 1. Hitung jumlah tiap kolom
        $colSums = array_fill(0, $n, 0.0);
        for ($j = 0; $j < $n; $j++) {
            for ($i = 0; $i < $n; $i++) {
                $colSums[$j] += (float) $matrix[$i][$j];
            }
        }

        // 2. Normalisasi kolom (bagi tiap elemen dengan jumlah kolomnya)
        $normMatrix = [];
        for ($i = 0; $i < $n; $i++) {
            $normMatrix[$i] = [];
            for ($j = 0; $j < $n; $j++) {
                $normMatrix[$i][$j] = $colSums[$j] > 0 ? (float) $matrix[$i][$j] / $colSums[$j] : 0.0;
            }
        }

        // 3. Hitung bobot prioritas (rata-rata per baris pada matriks ternormalisasi)
        $weights = [];
        for ($i = 0; $i < $n; $i++) {
            $rowSum = array_sum($normMatrix[$i]);
            $weights[$criteriaCodes[$i]] = round($rowSum / $n, 4);
        }

        // 4. Hitung Lambda Max (λ_max)
        // Kalikan matriks awal dengan vektor bobot, lalu bagi dengan bobot masing-masing
        $lambdaComponents = [];
        $weightValues = array_values($weights);

        for ($i = 0; $i < $n; $i++) {
            $sumProduct = 0.0;
            for ($j = 0; $j < $n; $j++) {
                $sumProduct += ((float) $matrix[$i][$j] * $weightValues[$j]);
            }
            $lambdaComponents[] = $weightValues[$i] > 0 ? $sumProduct / $weightValues[$i] : 0.0;
        }

        $lambdaMax = array_sum($lambdaComponents) / $n;

        // 5. Hitung Consistency Index (CI)
        $ci = ($lambdaMax - $n) / ($n - 1);

        // 6. Hitung Consistency Ratio (CR)
        $ri = $this->randomIndices[$n] ?? 1.49;
        $cr = $ri > 0 ? $ci / $ri : 0.0;
        $isValid = ($cr < 0.10);

        return [
            'weights' => $weights,
            'lambda_max' => round($lambdaMax, 4),
            'consistency_index' => round($ci, 4),
            'consistency_ratio' => round($cr, 4),
            'random_index' => $ri,
            'is_valid' => $isValid,
            'status_label' => $isValid ? 'KONSISTEN (CR < 0.10)' : 'TIDAK KONSISTEN (Harus Diisi Ulang)',
            'normalized_matrix' => $normMatrix,
        ];
    }

    /**
     * Matriks AHP referensi dari dokumen sistem (CR = 0.011 < 0.10).
     */
    public function getDefaultAhpMatrix(): array
    {
        $codes = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
        
        // Nilai perbandingan berpasangan ahli gizi yang menghasilkan bobot resmi:
        // C1 (34.40%), C3 (22.89%), C4 (14.66%), C2 (8.81%), C6 (8.81%), C5 (5.21%), C7 (5.21%)
        $matrix = [
            [1.0,     4.0,     2.0,     3.0,     6.0,     4.0,     6.0],     // C1 Gizi
            [0.25,    1.0,     0.3333,  0.5,     2.0,     1.0,     2.0],     // C2 Lahir
            [0.5,     3.0,     1.0,     2.0,     4.0,     3.0,     4.0],     // C3 Infeksi
            [0.3333,  2.0,     0.5,     1.0,     3.0,     2.0,     3.0],     // C4 Makan
            [0.1667,  0.5,     0.25,    0.3333,  1.0,     0.5,     1.0],     // C5 Sanitasi
            [0.25,    1.0,     0.3333,  0.5,     2.0,     1.0,     2.0],     // C6 Ekonomi
            [0.1667,  0.5,     0.25,    0.3333,  1.0,     0.5,     1.0],     // C7 Akses Layanan
        ];

        return [
            'criteria' => $codes,
            'matrix' => $matrix,
        ];
    }
}
