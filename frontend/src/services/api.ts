import type { User, Criterion, Alternative, CalculationResult, AhpMatrixResponse, DatasetSampleResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  getToken(): string | null {
    return localStorage.getItem('spk_token');
  },

  setToken(token: string) {
    localStorage.setItem('spk_token', token);
  },

  clearToken() {
    localStorage.removeItem('spk_token');
    localStorage.removeItem('spk_user');
  },

  getUser(): User | null {
    const raw = localStorage.getItem('spk_user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user: User) {
    localStorage.setItem('spk_user', JSON.stringify(user));
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain !== 'uny.ac.id' && domain !== 'student.uny.ac.id') {
      throw new Error('Akses dibatasi. Hanya akun resmi UNY (@uny.ac.id atau @student.uny.ac.id) yang diizinkan masuk.');
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || (data.errors ? Object.values(data.errors).flat().join(', ') : 'Login gagal'));
      }

      this.setToken(data.token);
      this.setUser(data.user);
      return data;
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        const superadmins: Record<string, string> = {
          'raffaelvincent.2024@student.uny.ac.id': 'Raffael Vincent',
          'muhammadfaizulhaq.2024@student.uny.ac.id': 'Muhammad Faizul Haq',
          'galantonalatif.2024@student.uny.ac.id': 'Galantona Latif',
        };
        const isSuper = Boolean(superadmins[email.toLowerCase()]);
        const name = superadmins[email.toLowerCase()] || (email.startsWith('admin') ? 'Dosen / Admin UNY' : 'Mahasiswa UNY (User Biasa)');
        const mockUser: User = {
          id: 1,
          name,
          email,
          role: isSuper ? 'superadmin' : 'user',
          is_superadmin: isSuper,
        };
        const mockToken = 'mock-dev-token-uny';
        this.setToken(mockToken);
        this.setUser(mockUser);
        return { user: mockUser, token: mockToken };
      }
      throw err;
    }
  },

  async getCriteria(): Promise<Criterion[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/spk/criteria`);
      if (res.ok) {
        const json = await res.json();
        return json.criteria;
      }
    } catch {
      // offline fallback
    }

    return [
      { code: 'C1', name: 'Kondisi Gizi & Pertumbuhan (TB/U)', weight: 0.3440, type: 'benefit' },
      { code: 'C2', name: 'Riwayat Kelahiran Berisiko (BBLR/Prematur)', weight: 0.0881, type: 'benefit' },
      { code: 'C3', name: 'Riwayat Penyakit / Infeksi', weight: 0.2289, type: 'benefit' },
      { code: 'C4', name: 'Kualitas Pola Pemberian Makan (ASI/MPASI)', weight: 0.1466, type: 'benefit' },
      { code: 'C5', name: 'Sanitasi & Akses Air Bersih', weight: 0.0521, type: 'benefit' },
      { code: 'C6', name: 'Kerentanan Sosial-Ekonomi', weight: 0.0881, type: 'benefit' },
      { code: 'C7', name: 'Akses Layanan Kesehatan (Posyandu)', weight: 0.0521, type: 'benefit' },
    ];
  },

  async getAhpMatrix(): Promise<AhpMatrixResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/spk/ahp/matrix`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    return null;
  },

  async getDatasetSamples(
    limit: number = 20,
    offset: number = 0,
    status: string = 'all',
    includeC2C4: boolean = true
  ): Promise<DatasetSampleResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      status,
      include_c2_c4: includeC2C4.toString(),
    });

    try {
      const res = await fetch(`${API_BASE_URL}/spk/dataset/samples?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }

    // Demo samples if backend not reached
    return {
      status: 'success',
      dataset_source: 'data_balita.csv (Client Fallback)',
      dataset_path: 'dataset/data_balita.csv',
      total_samples_returned: 5,
      offset: 0,
      limit,
      active_criteria: ['C1', 'C2', 'C4'],
      missing_criteria: ['C3', 'C5', 'C6', 'C7'],
      samples: [
        { id: 'CSV-00001', name: 'Balita #1 (0 bln, L, 44.6 cm)', values: { C1: 4.0, C2: 4.0, C4: 2.0 }, raw_attributes: { row_number: 1, umur_bulan: 0, jenis_kelamin: 'laki-laki', tinggi_badan_cm: 44.6, status_gizi: 'stunted' } },
        { id: 'CSV-00002', name: 'Balita #2 (0 bln, L, 56.7 cm)', values: { C1: 1.0, C2: 1.0, C4: 1.0 }, raw_attributes: { row_number: 2, umur_bulan: 0, jenis_kelamin: 'laki-laki', tinggi_badan_cm: 56.7, status_gizi: 'tinggi' } },
        { id: 'CSV-00003', name: 'Balita #3 (0 bln, L, 46.9 cm)', values: { C1: 2.0, C2: 3.0, C4: 2.0 }, raw_attributes: { row_number: 3, umur_bulan: 0, jenis_kelamin: 'laki-laki', tinggi_badan_cm: 46.9, status_gizi: 'normal' } },
        { id: 'CSV-00005', name: 'Balita #5 (0 bln, L, 42.7 cm)', values: { C1: 5.0, C2: 4.0, C4: 4.0 }, raw_attributes: { row_number: 5, umur_bulan: 0, jenis_kelamin: 'laki-laki', tinggi_badan_cm: 42.7, status_gizi: 'severely stunted' } },
      ],
    };
  },

  async calculate(
    method: 'saw' | 'moora',
    alternatives: Alternative[],
    criteria: Criterion[]
  ): Promise<CalculationResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/spk/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(this.getToken() ? { Authorization: `Bearer ${this.getToken()}` } : {}),
        },
        body: JSON.stringify({ method, alternatives, criteria }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {
      // Fallback kalkulasi lokal di client
    }

    return localCalculate(method, alternatives, criteria);
  },
};

/**
 * Kalkulasi lokal client-side dengan dukungan Resiliensi Data Parsial (Tahan Banting)
 */
function localCalculate(
  method: 'saw' | 'moora',
  alternatives: Alternative[],
  criteria: Criterion[]
): CalculationResult {
  const activeCriteria = criteria.filter((c) => c.active !== false);
  const totalWeight = activeCriteria.reduce((sum, c) => sum + c.weight, 0);

  // Redistribusi bobot proporsional agar sum = 1.0
  const normalizedCriteria = activeCriteria.map((c) => ({
    ...c,
    weight: totalWeight > 0 ? c.weight / totalWeight : 1 / activeCriteria.length,
  }));

  const normMatrix: Record<string, Record<string, number>> = {};
  const weightMatrix: Record<string, Record<string, number>> = {};
  let hasPartial = false;

  if (method === 'saw') {
    const maxVals: Record<string, number> = {};
    for (const c of normalizedCriteria) {
      const vals = alternatives.map((a) => (typeof a.values[c.code] === 'number' ? a.values[c.code] : 1.0));
      maxVals[c.code] = Math.max(...vals, 1.0);
    }

    const scores = alternatives.map((alt) => {
      normMatrix[alt.id] = {};
      weightMatrix[alt.id] = {};
      let total = 0;
      let filled = 0;
      const missing: string[] = [];

      for (const c of normalizedCriteria) {
        const hasVal = typeof alt.values[c.code] === 'number';
        const val = hasVal ? alt.values[c.code] : 1.0;
        if (hasVal) {
          filled++;
        } else {
          missing.push(c.code);
        }

        const max = maxVals[c.code] || 1;
        const r = val / max;
        const v = r * c.weight;
        normMatrix[alt.id][c.code] = Number(r.toFixed(4));
        weightMatrix[alt.id][c.code] = Number(v.toFixed(4));
        total += v;
      }

      const isPart = missing.length > 0 || normalizedCriteria.length < 7;
      if (isPart) hasPartial = true;

      return {
        id: alt.id,
        name: alt.name,
        score: Number(total.toFixed(4)),
        is_partial: isPart,
        completeness_ratio: `${filled}/${normalizedCriteria.length}`,
        missing_criteria: missing,
        raw_attributes: alt.raw_attributes,
      };
    });

    scores.sort((a, b) => b.score - a.score);

    return {
      method: 'saw',
      is_partial_dataset: hasPartial,
      active_criteria: normalizedCriteria.map((c) => c.code),
      criteria_count: normalizedCriteria.length,
      rankings: scores.map((s, idx) => ({
        id: s.id,
        name: s.name,
        score: s.score,
        rank: idx + 1,
        priority_level: s.score >= 0.8 ? 'Sangat Tinggi' : s.score >= 0.6 ? 'Tinggi' : s.score >= 0.4 ? 'Sedang' : 'Rendah',
        is_partial: s.is_partial,
        completeness_ratio: s.completeness_ratio,
        missing_criteria: s.missing_criteria,
        raw_attributes: s.raw_attributes,
      })),
      normalized_matrix: normMatrix,
      weighted_matrix: weightMatrix,
    };
  } else {
    // MOORA
    const denoms: Record<string, number> = {};
    for (const c of normalizedCriteria) {
      const sumSq = alternatives.reduce((sum, a) => {
        const val = typeof a.values[c.code] === 'number' ? a.values[c.code] : 1.0;
        return sum + Math.pow(val, 2);
      }, 0);
      denoms[c.code] = Math.sqrt(sumSq) || 1;
    }

    const scores = alternatives.map((alt) => {
      normMatrix[alt.id] = {};
      weightMatrix[alt.id] = {};
      let benSum = 0;
      let filled = 0;
      const missing: string[] = [];

      for (const c of normalizedCriteria) {
        const hasVal = typeof alt.values[c.code] === 'number';
        const val = hasVal ? alt.values[c.code] : 1.0;
        if (hasVal) {
          filled++;
        } else {
          missing.push(c.code);
        }

        const r = val / denoms[c.code];
        const v = r * c.weight;
        normMatrix[alt.id][c.code] = Number(r.toFixed(4));
        weightMatrix[alt.id][c.code] = Number(v.toFixed(4));
        benSum += v;
      }

      const isPart = missing.length > 0 || normalizedCriteria.length < 7;
      if (isPart) hasPartial = true;

      return {
        id: alt.id,
        name: alt.name,
        score: Number(benSum.toFixed(4)),
        is_partial: isPart,
        completeness_ratio: `${filled}/${normalizedCriteria.length}`,
        missing_criteria: missing,
        raw_attributes: alt.raw_attributes,
      };
    });

    const allS = scores.map((s) => s.score);
    const minS = Math.min(...allS);
    const maxS = Math.max(...allS);

    scores.sort((a, b) => b.score - a.score);

    return {
      method: 'moora',
      is_partial_dataset: hasPartial,
      active_criteria: normalizedCriteria.map((c) => c.code),
      criteria_count: normalizedCriteria.length,
      rankings: scores.map((s, idx) => {
        const rel = maxS > minS ? (s.score - minS) / (maxS - minS) : 0.5;
        const level = rel >= 0.75 ? 'Sangat Tinggi' : rel >= 0.5 ? 'Tinggi' : rel >= 0.25 ? 'Sedang' : 'Rendah';
        return {
          id: s.id,
          name: s.name,
          score: s.score,
          rank: idx + 1,
          priority_level: level,
          is_partial: s.is_partial,
          completeness_ratio: s.completeness_ratio,
          missing_criteria: s.missing_criteria,
          raw_attributes: s.raw_attributes,
        };
      }),
      normalized_matrix: normMatrix,
      weighted_matrix: weightMatrix,
    };
  }
}
