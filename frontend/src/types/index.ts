export type PilihanEkspor = {
  label: string;
  ket: string;
  jalankan: () => void;
};

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
  /** Tingkat kepentingan (1 = paling penting), diturunkan dari Perpres 72/2021. */
  tier?: number;
  /** Jalur sebab akibat: 'Langsung' (Intervensi Spesifik) atau 'Tidak langsung'. */
  jalur?: string;
  kelompok?: string;
  /** Justifikasi penempatan tier, beserta sitasinya. */
  dasar?: string;
}

export interface Alternative {
  id: string;
  name: string;
  values: Record<string, number>;
  raw_attributes?: {
    row_number?: number;
    umur_bulan?: number;
    jenis_kelamin?: string;
    tinggi_badan_cm?: number | null;
    haz?: number | null;
    status_gizi?: string;
    tren_memburuk?: string | null;
    kelengkapan?: string | null;
  };
  /** Nonaktif berarti keluar dari perhitungan tetapi tetap tampil di daftar. */
  aktif?: boolean;
  sumber?: string;
  /** Waktu perubahan terakhir, dari sistem. */
  diperbarui_pada?: string | null;
}

export interface RankingItem {
  /** Dari server. false = keluar dari daftar prioritas tetapi tetap diperingkat. */
  aktif?: boolean;
  id: string;
  name: string;
  score: number;
  rank: number;
  priority_level: PriorityLevel;
  is_partial?: boolean;
  completeness_ratio?: string;
  missing_criteria?: string[];
  /** Ditandai bila data < 5/7 kriteria; tingkatnya tidak boleh diturunkan sepihak. */
  perlu_verifikasi?: boolean;
  /** Tindakan klinis yang dianjurkan untuk tingkat ini. */
  tindakan?: string;
  raw_attributes?: Alternative['raw_attributes'];
  details?: {
    method?: string;
    benefit_score?: number;
    cost_score?: number;
    /** Alasan penetapan tingkat prioritas menurut aturan klinis. */
    tingkat_dasar?: string;
    n_kriteria_tinggi?: number;
    nilai_ordinal?: Record<string, number>;
    [key: string]: unknown;
  };
}

/**
 * Sistem ini memakai SATU metode skoring saja, yaitu MOORA. SAW sudah dihapus
 * supaya tidak ada dua rumus yang berjalan bersamaan.
 */
export interface CalculationResult {
  method: 'moora';
  /** Hasil RESMI, dihitung atas balita aktif saja. */
  rankings: RankingItem[];
  /**
   * Balita nonaktif beserta posisinya dari perhitungan KEDUA atas seluruh
   * balita. Bukan hasil resmi; hanya untuk menunjukkan kalau diaktifkan lagi
   * ia ada di urutan berapa.
   */
  nonaktif?: RankingItem[];
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
  tier?: Record<string, number>;
  jejak_audit?: Array<{
    pasangan: string;
    tier_i: number;
    tier_j: number;
    beda_tier: number;
    nilai_saaty: number;
    label: string;
    arah: string;
  }>;
  ahp_result: {
    weights: Record<string, number>;
    weights_fuzzy?: Record<string, number>;
    tfn?: Record<string, [number, number, number]>;
    lambda_max: number;
    consistency_index: number;
    random_index: number;
    consistency_ratio: number;
    is_valid: boolean;
    status_label?: string;
    catatan_konsistensi?: string;
  };
}

export interface DatasetSampleResponse {
  status: string;
  dataset_source: string;
  dataset_path: string;
  dataset_format?: '7_kriteria' | 'legacy_4_kolom';
  is_dummy_sintetis?: boolean;
  total_samples_returned: number;
  offset: number;
  limit: number;
  active_criteria: string[];
  missing_criteria: string[];
  samples: Alternative[];
}
