import { Alternative, Criterion, AlternativeRanking, CalculationResult, PriorityLevel } from './types';

export function determinePriorityLevelMoora(score: number, minScore: number, maxScore: number): PriorityLevel {
  if (maxScore === minScore) return 'Sedang';
  const rel = (score - minScore) / (maxScore - minScore);
  if (rel >= 0.75) return 'Sangat Tinggi';
  if (rel >= 0.50) return 'Tinggi';
  if (rel >= 0.25) return 'Sedang';
  return 'Rendah';
}

/**
 * Menghitung ranking menggunakan metode MOORA (Multi-Objective Optimization on the basis of Ratio Analysis).
 */
export function calculateMoora(alternatives: Alternative[], criteria: Criterion[]): CalculationResult {
  if (alternatives.length === 0 || criteria.length === 0) {
    return {
      method: 'moora',
      rankings: [],
      normalizedMatrix: {},
      weightedMatrix: {},
    };
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const normalizedCriteria = criteria.map((c) => ({
    ...c,
    weight: totalWeight > 0 ? c.weight / totalWeight : 1 / criteria.length,
  }));

  // Hitung penyebut akar jumlah kuadrat per kriteria
  const denominators: Record<string, number> = {};
  for (const crit of normalizedCriteria) {
    const sumSquares = alternatives.reduce((sum, alt) => {
      const val = alt.values[crit.code] ?? 0;
      return sum + val * val;
    }, 0);
    denominators[crit.code] = Math.sqrt(sumSquares) || 1;
  }

  // Normalisasi rasio dan pembobotan
  const normalizedMatrix: Record<string, Record<string, number>> = {};
  const weightedMatrix: Record<string, Record<string, number>> = {};
  const scores: { id: string; name: string; score: number; benefitSum: number; costSum: number }[] = [];

  for (const alt of alternatives) {
    normalizedMatrix[alt.id] = {};
    weightedMatrix[alt.id] = {};
    let benefitSum = 0;
    let costSum = 0;

    for (const crit of normalizedCriteria) {
      const x = alt.values[crit.code] ?? 0;
      const r = x / denominators[crit.code];
      const v = r * crit.weight;

      normalizedMatrix[alt.id][crit.code] = Number(r.toFixed(4));
      weightedMatrix[alt.id][crit.code] = Number(v.toFixed(4));

      if (crit.type === 'benefit') {
        benefitSum += v;
      } else {
        costSum += v;
      }
    }

    const finalScore = benefitSum - costSum;
    scores.push({
      id: alt.id,
      name: alt.name,
      score: Number(finalScore.toFixed(4)),
      benefitSum: Number(benefitSum.toFixed(4)),
      costSum: Number(costSum.toFixed(4)),
    });
  }

  const allScores = scores.map((s) => s.score);
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);

  scores.sort((a, b) => b.score - a.score);

  const rankings: AlternativeRanking[] = scores.map((item, index) => ({
    id: item.id,
    name: item.name,
    score: item.score,
    rank: index + 1,
    priorityLevel: determinePriorityLevelMoora(item.score, minScore, maxScore),
    details: {
      method: 'MOORA',
      benefitScore: item.benefitSum,
      costScore: item.costSum,
    },
  }));

  return {
    method: 'moora',
    rankings,
    normalizedMatrix,
    weightedMatrix,
  };
}
