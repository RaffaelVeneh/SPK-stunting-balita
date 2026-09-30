<?php

namespace App\Services\SPK;

class MooraService
{
    /**
     * Menghitung ranking menggunakan Multi-Objective Optimization on the basis of Ratio Analysis (MOORA).
     */
    public function calculate(array $alternatives, array $criteria): array
    {
        if (empty($alternatives) || empty($criteria)) {
            return [
                'method' => 'moora',
                'rankings' => [],
                'normalized_matrix' => [],
                'weighted_matrix' => [],
            ];
        }

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

        // 1. Hitung Pembagi Akar Jumlah Kuadrat per Kriteria
        $denominators = [];
        foreach ($criteriaMap as $code => $crit) {
            $sumSquares = 0.0;
            foreach ($alternatives as $alt) {
                $val = (float) ($alt['values'][$code] ?? 0);
                $sumSquares += ($val * $val);
            }
            $denominators[$code] = sqrt($sumSquares) ?: 1.0;
        }

        // 2. Normalisasi Rasio dan Perkalian Bobot
        $normalizedMatrix = [];
        $weightedMatrix = [];
        $scores = [];

        foreach ($alternatives as $alt) {
            $altId = (string) $alt['id'];
            $normalizedMatrix[$altId] = [];
            $weightedMatrix[$altId] = [];
            $benefitSum = 0.0;
            $costSum = 0.0;

            foreach ($criteriaMap as $code => $crit) {
                $val = (float) ($alt['values'][$code] ?? 0);
                $r = $val / $denominators[$code];
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
            $scores[] = [
                'id' => $altId,
                'name' => $alt['name'] ?? $altId,
                'score' => round($finalScore, 4),
                'benefit_score' => round($benefitSum, 4),
                'cost_score' => round($costSum, 4),
            ];
        }

        $allScores = array_column($scores, 'score');
        $minScore = min($allScores);
        $maxScore = max($allScores);

        // 3. Perangkingan Descending
        usort($scores, fn ($a, $b) => $b['score'] <=> $a['score']);

        $rankings = [];
        foreach ($scores as $index => $item) {
            $rankings[] = [
                'id' => $item['id'],
                'name' => $item['name'],
                'score' => $item['score'],
                'rank' => $index + 1,
                'priority_level' => $this->determinePriorityLevelMoora($item['score'], $minScore, $maxScore),
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
        ];
    }

    protected function determinePriorityLevelMoora(float $score, float $minScore, float $maxScore): string
    {
        if ($maxScore == $minScore) {
            return 'Sedang';
        }
        $rel = ($score - $minScore) / ($maxScore - $minScore);
        if ($rel >= 0.75) {
            return 'Sangat Tinggi';
        } elseif ($rel >= 0.50) {
            return 'Tinggi';
        } elseif ($rel >= 0.25) {
            return 'Sedang';
        } else {
            return 'Rendah';
        }
    }
}
