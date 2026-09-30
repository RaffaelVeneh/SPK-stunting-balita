<?php

namespace App\Services\SPK;

class SawService
{
    /**
     * Menghitung ranking menggunakan Simple Additive Weighting (SAW) dengan resiliensi data parsial.
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
                'is_partial_dataset' => false,
                'active_criteria' => [],
            ];
        }

        // 1. Deteksi kriteria aktif (yang memiliki bobot > 0 atau ada pada data input)
        $activeCodes = [];
        foreach ($criteria as $c) {
            $code = $c['code'];
            // Kriteria dianggap aktif jika ada di kriteria list
            $activeCodes[] = $code;
        }

        // 2. Redistribusi Bobot AHP Proporsional agar sum(w_active) = 1.0 (Tahan Banting)
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

        // 3. Cari Max dan Min per kriteria aktif dengan Fallback Imputasi Baseline (1.0)
        $maxValues = [];
        $minValues = [];

        foreach ($criteriaMap as $code => $crit) {
            $values = [];
            foreach ($alternatives as $alt) {
                // Fallback netral: jika tidak ada data / null / kosong, gunakan baseline 1.0 (risiko minimal)
                $val = isset($alt['values'][$code]) && is_numeric($alt['values'][$code])
                    ? (float) $alt['values'][$code]
                    : 1.0;
                $values[] = $val;
            }
            $maxValues[$code] = !empty($values) ? max($values) : 1.0;
            $minValues[$code] = !empty($values) ? min($values) : 1.0;
        }

        // 4. Normalisasi Matriks R dan Terbobot V
        $normalizedMatrix = [];
        $weightedMatrix = [];
        $scores = [];
        $totalStandardCriteria = 7; // Standar 7 kriteria SPK Stunting

        $hasAnyPartial = false;

        foreach ($alternatives as $alt) {
            $altId = (string) $alt['id'];
            $normalizedMatrix[$altId] = [];
            $weightedMatrix[$altId] = [];
            $totalScore = 0.0;

            $filledCriteriaCount = 0;
            $missingCriteria = [];

            foreach ($criteriaMap as $code => $crit) {
                $hasVal = isset($alt['values'][$code]) && is_numeric($alt['values'][$code]);
                if ($hasVal) {
                    $filledCriteriaCount++;
                    $val = (float) $alt['values'][$code];
                } else {
                    $missingCriteria[] = $code;
                    $val = 1.0; // Imputasi baseline netral
                }

                $r = 0.0;
                if ($crit['type'] === 'benefit') {
                    $max = $maxValues[$code] > 0 ? $maxValues[$code] : 1.0;
                    $r = $val / $max;
                } else {
                    $min = $minValues[$code] > 0 ? $minValues[$code] : 1.0;
                    $r = $val > 0 ? $min / $val : 1.0;
                }

                $v = $r * $crit['weight'];
                $normalizedMatrix[$altId][$code] = round($r, 4);
                $weightedMatrix[$altId][$code] = round($v, 4);
                $totalScore += $v;
            }

            $isPartial = count($missingCriteria) > 0 || count($criteriaMap) < $totalStandardCriteria;
            if ($isPartial) {
                $hasAnyPartial = true;
            }

            $scores[] = [
                'id' => $altId,
                'name' => $alt['name'] ?? $altId,
                'score' => round($totalScore, 4),
                'filled_count' => $filledCriteriaCount,
                'is_partial' => $isPartial,
                'completeness_ratio' => "{$filledCriteriaCount}/" . count($criteriaMap),
                'missing_criteria' => $missingCriteria,
                'raw_attributes' => $alt['raw_attributes'] ?? null,
            ];
        }

        // 5. Perangkingan Descending
        usort($scores, fn ($a, $b) => $b['score'] <=> $a['score']);

        $rankings = [];
        foreach ($scores as $index => $item) {
            $rankings[] = [
                'id' => $item['id'],
                'name' => $item['name'],
                'score' => $item['score'],
                'rank' => $index + 1,
                'priority_level' => $this->determinePriorityLevel($item['score']),
                'is_partial' => $item['is_partial'],
                'completeness_ratio' => $item['completeness_ratio'],
                'missing_criteria' => $item['missing_criteria'],
                'raw_attributes' => $item['raw_attributes'],
                'details' => ['method' => 'SAW'],
            ];
        }

        return [
            'method' => 'saw',
            'rankings' => $rankings,
            'normalized_matrix' => $normalizedMatrix,
            'weighted_matrix' => $weightedMatrix,
            'is_partial_dataset' => $hasAnyPartial,
            'active_criteria' => array_keys($criteriaMap),
            'criteria_count' => count($criteriaMap),
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
