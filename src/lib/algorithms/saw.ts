import { Alternative, Criterion, AlternativeRanking, CalculationResult, PriorityLevel } from './types';

export function determinePriorityLevel(score: number): PriorityLevel {
  if (score >= 0.80) return 'Sangat Tinggi';
  if (score >= 0.60) return 'Tinggi';
  if (score >= 0.40) return 'Sedang';
  return 'Rendah';
}

/**
 * Menghitung ranking menggunakan metode SAW (Simple Additive Weighting).
 */
export function calculateSaw(alternatives: Alternative[], criteria: Criterion[]): CalculationResult {
  if (alternatives.length === 0 || criteria.length === 0) {
    return {
      method: 'saw',
      rankings: [],
      normalizedMatrix: {},
      weightedMatrix: {},
    };
  }

  // Hitung total bobot untuk memastikan normalisasi bobot sum = 1
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const normalizedCriteria = criteria.map((c) => ({
    ...c,
    weight: totalWeight > 0 ? c.weight / totalWeight : 1 / criteria.length,
  }));

  // Cari max dan min per kriteria
  const maxValues: Record<string, number> = {};
  const minValues: Record<string, number> = {};

  for (const crit of normalizedCriteria) {
    const vals = alternatives.map((alt) => alt.values[crit.code] ?? 0);
    maxValues[crit.code] = Math.max(...vals);
    minValues[crit.code] = Math.min(...vals);
  }

  // Normalisasi matriks R dan matriks terbobot V
  const normalizedMatrix: Record<string, Record<string, number>> = {};
  const weightedMatrix: Record<string, Record<string, number>> = {};
  const scores: { id: string; name: string; score: number }[] = [];

  for (const alt of alternatives) {
    normalizedMatrix[alt.id] = {};
    weightedMatrix[alt.id] = {};
    let totalScore = 0;

    for (const crit of normalizedCriteria) {
      const x = alt.values[crit.code] ?? 0;
      let r = 0;

      if (crit.type === 'benefit') {
        const max = maxValues[crit.code];
        r = max > 0 ? x / max : 0;
      } else {
        const min = minValues[crit.code];
        r = x > 0 ? min / x : 0;
      }

      const v = r * crit.weight;
      normalizedMatrix[alt.id][crit.code] = Number(r.toFixed(4));
      weightedMatrix[alt.id][crit.code] = Number(v.toFixed(4));
      totalScore += v;
    }

    scores.push({
      id: alt.id,
      name: alt.name,
      score: Number(totalScore.toFixed(4)),
    });
  }

  // Perangkingan
  scores.sort((a, b) => b.score - a.score);

  const rankings: AlternativeRanking[] = scores.map((item, index) => ({
    id: item.id,
    name: item.name,
    score: item.score,
    rank: index + 1,
    priorityLevel: determinePriorityLevel(item.score),
    details: { method: 'SAW' },
  }));

  return {
    method: 'saw',
    rankings,
    normalizedMatrix,
    weightedMatrix,
  };
}
