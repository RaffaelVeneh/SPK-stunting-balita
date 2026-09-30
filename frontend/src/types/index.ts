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
  description?: string;
  active?: boolean;
}

export interface Alternative {
  id: string;
  name: string;
  values: Record<string, number>;
  raw_attributes?: {
    row_number?: number;
    umur_bulan?: number;
    jenis_kelamin?: string;
    tinggi_badan_cm?: number;
    status_gizi?: string;
  };
}

export interface RankingItem {
  id: string;
  name: string;
  score: number;
  rank: number;
  priority_level: PriorityLevel;
  is_partial?: boolean;
  completeness_ratio?: string;
  missing_criteria?: string[];
  raw_attributes?: {
    row_number?: number;
    umur_bulan?: number;
    jenis_kelamin?: string;
    tinggi_badan_cm?: number;
    status_gizi?: string;
  };
  details?: Record<string, unknown>;
}

export interface CalculationResult {
  method: 'saw' | 'moora';
  rankings: RankingItem[];
  normalized_matrix: Record<string, Record<string, number>>;
  weighted_matrix: Record<string, Record<string, number>>;
  is_partial_dataset?: boolean;
  active_criteria?: string[];
  criteria_count?: number;
}

export interface AhpMatrixResponse {
  status: string;
  criteria: string[];
  matrix: number[][];
  ahp_result: {
    weights: Record<string, number>;
    lambda_max: number;
    consistency_index: number;
    random_index: number;
    consistency_ratio: number;
    is_valid: boolean;
  };
}

export interface DatasetSampleResponse {
  status: string;
  dataset_source: string;
  dataset_path: string;
  total_samples_returned: number;
  offset: number;
  limit: number;
  active_criteria: string[];
  missing_criteria: string[];
  samples: Alternative[];
}
