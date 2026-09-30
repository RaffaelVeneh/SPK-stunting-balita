export type CriterionType = 'benefit' | 'cost';

export type PriorityLevel = 'Sangat Tinggi' | 'Tinggi' | 'Sedang' | 'Rendah';

export interface Criterion {
  code: string; // e.g. "C1", "C2"
  name: string;
  weight: number; // 0..1
  type: CriterionType;
}

export interface Alternative {
  id: string;
  name: string;
  values: Record<string, number>; // code -> score (1-5)
}

export interface AlternativeRanking {
  id: string;
  name: string;
  score: number;
  rank: number;
  priorityLevel: PriorityLevel;
  details?: Record<string, unknown>;
}

export interface CalculationResult {
  method: 'saw' | 'moora';
  rankings: AlternativeRanking[];
  normalizedMatrix: Record<string, Record<string, number>>;
  weightedMatrix: Record<string, Record<string, number>>;
}
