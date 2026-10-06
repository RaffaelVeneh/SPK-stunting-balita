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
     * Matriks perbandingan berpasangan resmi sistem.
     *
     * Sebelumnya method ini mengembalikan matriks yang diketik manual, dan
     * matriks tersebut TIDAK menghasilkan bobot yang dipakai sistem:
     * matriksnya memberi C1 = 35,62% sedangkan perhitungan memakai C1 = 34,40%.
     * Dokumentasi di dalamnya juga menyebut "CR = 0.011" yang merupakan milik
     * matriks versi lama (sel C1-C5 dan C1-C7 bernilai 5, bukan 6).
     *
     * Sekarang matriksnya DITURUNKAN dari KriteriaDefinition, sehingga selalu
     * sinkron dengan bobot yang dipakai. Angka bobotnya sendiri dihitung oleh
     * FuzzyAhpService.
     */
    public function getDefaultAhpMatrix(): array
    {
        return [
            'criteria' => KriteriaDefinition::kode(),
            'matrix' => KriteriaDefinition::matriksPasangan(),
            'tier' => KriteriaDefinition::tier(),
        ];
    }
}
