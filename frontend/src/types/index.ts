export type PriorityLevel = 'Sangat Tinggi' | 'Tinggi' | 'Sedang' | 'Rendah';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'petugas' | 'user';
  is_superadmin: boolean;
  wilayah_id?: number | null;
}

export interface Criterion {
  code: string;
  name: string;
  weight: number;
  type: 'benefit' | 'cost';
}

export interface Alternative {
  id: string;
  name: string;
  values: Record<string, number>;
}

export interface RankingItem {
  id: string;
  name: string;
  score: number;
  rank: number;
  priority_level: PriorityLevel;
  details?: Record<string, unknown>;
}

export interface CalculationResult {
  method: 'saw' | 'moora';
  rankings: RankingItem[];
  normalized_matrix: Record<string, Record<string, number>>;
  weighted_matrix: Record<string, Record<string, number>>;
}
