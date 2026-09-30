<?php

namespace App\Services\SPK;

class SawService
{
    /**
     * Menghitung ranking menggunakan Simple Additive Weighting (SAW).
     *
     * @param array $alternatives [ ['id' => 'A1', 'name' => 'Balita 1', 'values' => ['C1' => 5, 'C2' => 4, ...]], ... ]
     * @param array $criteria     [ ['code' => 'C1', 'name' => 'Kondisi Gizi', 'weight' => 0.3440, 'type' => 'benefit'], ... ]
     * @return array
     */
    public function calculate(array $alternatives, array $criteria): array
    {
        if (empty($alternatives) || empty($criteria)) {
            return [
                'method' => 'saw',
                'rankings' => [],
                'normalized_matrix' => [],
                'weighted_matrix' => [],
            ];
        }

        // 1. Normalisasi Bobot agar sum = 1
        $totalWeight = array_sum(array_column($criteria, 'weight'));
        $criteriaMap = [];
        foreach ($criteria as $c) {
            $code = $c['code'];
            $w = $totalWeight > 0 ? (float) $c['weight'] / $totalWeight : 1 / count($criteria);
            $criteriaMap[$code] = [
                'name' => $c['name'] ?? $code,
                'weight' => $w,
                'type' => strtolower($c['type'] ?? 'benefit'),
            ];
        }

        // 2. Cari Max dan Min per kriteria
        $maxValues = [];
        $minValues = [];

        foreach ($criteriaMap as $code => $crit) {
            $values = [];
            foreach ($alternatives as $alt) {
                $values[] = (float) ($alt['values'][$code] ?? 0);
            }
            $maxValues[$code] = !empty($values) ? max($values) : 0;
            $minValues[$code] = !empty($values) ? min($values) : 0;
        }

        // 3. Normalisasi Matriks R dan Terbobot V
        $normalizedMatrix = [];
        $weightedMatrix = [];
        $scores = [];

        foreach ($alternatives as $alt) {
            $altId = (string) $alt['id'];
            $normalizedMatrix[$altId] = [];
            $weightedMatrix[$altId] = [];
            $totalScore = 0.0;

            foreach ($criteriaMap as $code => $crit) {
                $val = (float) ($alt['values'][$code] ?? 0);
                $r = 0.0;

                if ($crit['type'] === 'benefit') {
                    $max = $maxValues[$code];
                    $r = $max > 0 ? $val / $max : 0.0;
                } else {
                    $min = $minValues[$code];
                    $r = $val > 0 ? $min / $val : 0.0;
                }

                $v = $r * $crit['weight'];
                $normalizedMatrix[$altId][$code] = round($r, 4);
                $weightedMatrix[$altId][$code] = round($v, 4);
                $totalScore += $v;
            }

            $scores[] = [
                'id' => $altId,
                'name' => $alt['name'] ?? $altId,
                'score' => round($totalScore, 4),
            ];
        }

        // 4. Perangkingan Descending
        usort($scores, fn ($a, $b) => $b['score'] <=> $a['score']);

        $rankings = [];
        foreach ($scores as $index => $item) {
            $rankings[] = [
                'id' => $item['id'],
                'name' => $item['name'],
                'score' => $item['score'],
                'rank' => $index + 1,
                'priority_level' => $this->determinePriorityLevel($item['score']),
                'details' => ['method' => 'SAW'],
            ];
        }

        return [
            'method' => 'saw',
            'rankings' => $rankings,
            'normalized_matrix' => $normalizedMatrix,
            'weighted_matrix' => $weightedMatrix,
        ];
    }

    /**
     * Menentukan tingkat prioritas intervensi gizi.
     */
    protected function determinePriorityLevel(float $score): string
    {
        if ($score >= 0.80) {
            return 'Sangat Tinggi';
        } elseif ($score >= 0.60) {
            return 'Tinggi';
        } elseif ($score >= 0.40) {
            return 'Sedang';
        } else {
            return 'Rendah';
        }
    }
}
