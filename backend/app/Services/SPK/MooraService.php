<?php

namespace App\Services\SPK;

class MooraService
{
    /**
     * Menghitung ranking menggunakan Multi-Objective Optimization on the basis of Ratio Analysis (MOORA)
     * dengan toleransi data parsial (tahan banting).
     */
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
            ];
        }

        // 1. Redistribusi Bobot Proporsional AHP
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

        // 2. Hitung Pembagi Akar Jumlah Kuadrat per Kriteria (dengan proteksi baseline 1.0 & zero-check)
        $denominators = [];
        foreach ($criteriaMap as $code => $crit) {
            $sumSquares = 0.0;
            foreach ($alternatives as $alt) {
                $val = isset($alt['values'][$code]) && is_numeric($alt['values'][$code])
                    ? (float) $alt['values'][$code]
                    : 1.0; // Fallback baseline netral
                $sumSquares += ($val * $val);
            }
            $denominators[$code] = sqrt($sumSquares) ?: 1.0;
        }

        // 3. Normalisasi Rasio dan Perkalian Bobot
        $normalizedMatrix = [];
        $weightedMatrix = [];
        $scores = [];
        $totalStandardCriteria = 7;
        $hasAnyPartial = false;

        foreach ($alternatives as $alt) {
            $altId = (string) $alt['id'];
            $normalizedMatrix[$altId] = [];
            $weightedMatrix[$altId] = [];
            $benefitSum = 0.0;
            $costSum = 0.0;

            $filledCriteriaCount = 0;
            $missingCriteria = [];

            foreach ($criteriaMap as $code => $crit) {
                $hasVal = isset($alt['values'][$code]) && is_numeric($alt['values'][$code]);
                if ($hasVal) {
                    $filledCriteriaCount++;
                    $val = (float) $alt['values'][$code];
                } else {
                    $missingCriteria[] = $code;
                    $val = 1.0; // Imputasi baseline
                }

                $r = $val / ($denominators[$code] > 0 ? $denominators[$code] : 1.0);
                $v = $r * $crit['weight'];

                $normalizedMatrix[$altId][$code] = round($r, 4);
                $weightedMatrix[$altId][$code] = round($v, 4);

                if ($crit['type'] === 'benefit') {
                    $benefitSum += $v;
                } else {
                    $costSum += $v;
                }
            }

            $finalScore = $benefitSum - $costSum;
            $isPartial = count($missingCriteria) > 0 || count($criteriaMap) < $totalStandardCriteria;
            if ($isPartial) {
                $hasAnyPartial = true;
            }

            $scores[] = [
                'id' => $altId,
                'name' => $alt['name'] ?? $altId,
                'score' => round($finalScore, 4),
                'benefit_score' => round($benefitSum, 4),
                'cost_score' => round($costSum, 4),
                'filled_count' => $filledCriteriaCount,
                'is_partial' => $isPartial,
                'completeness_ratio' => "{$filledCriteriaCount}/" . count($criteriaMap),
                'missing_criteria' => $missingCriteria,
                'raw_attributes' => $alt['raw_attributes'] ?? null,
            ];
        }

        $allScores = array_column($scores, 'score');
        $minScore = !empty($allScores) ? min($allScores) : 0;
        $maxScore = !empty($allScores) ? max($allScores) : 0;

        // 4. Perangkingan Descending
        usort($scores, fn ($a, $b) => $b['score'] <=> $a['score']);

        $rankings = [];
        foreach ($scores as $index => $item) {
            $rankings[] = [
                'id' => $item['id'],
                'name' => $item['name'],
                'score' => $item['score'],
                'rank' => $index + 1,
                'priority_level' => $this->determinePriorityLevelMoora($item['score'], $minScore, $maxScore),
                'is_partial' => $item['is_partial'],
                'completeness_ratio' => $item['completeness_ratio'],
                'missing_criteria' => $item['missing_criteria'],
                'raw_attributes' => $item['raw_attributes'],
                'details' => [
                    'method' => 'MOORA',
                    'benefit_score' => $item['benefit_score'],
                    'cost_score' => $item['cost_score'],
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
     * Menentukan tingkat prioritas intervensi gizi untuk skor MOORA (berbasis min-max relatif).
     */
    protected function determinePriorityLevelMoora(float $score, float $minScore, float $maxScore): string
    {
        $range = $maxScore - $minScore;
        if ($range <= 0.0001) {
            return $score > 0.1 ? 'Sedang' : 'Rendah';
        }

        $relative = ($score - $minScore) / $range;

        if ($relative >= 0.75) {
            return 'Sangat Tinggi';
        } elseif ($relative >= 0.50) {
            return 'Tinggi';
        } elseif ($relative >= 0.25) {
            return 'Sedang';
        } else {
            return 'Rendah';
        }
    }
}
