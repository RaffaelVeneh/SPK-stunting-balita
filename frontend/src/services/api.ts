import type { User, Criterion, Alternative, CalculationResult } from '../types';

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
      // Jika backend belum aktif (misal running dev client-only), sediakan demo login
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
 * Fallback kalkulasi client-side jika API backend offline saat preview
 */
function localCalculate(
  method: 'saw' | 'moora',
  alternatives: Alternative[],
  criteria: Criterion[]
): CalculationResult {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const normalizedCriteria = criteria.map((c) => ({
    ...c,
    weight: totalWeight > 0 ? c.weight / totalWeight : 1 / criteria.length,
  }));

  const normMatrix: Record<string, Record<string, number>> = {};
  const weightMatrix: Record<string, Record<string, number>> = {};

  if (method === 'saw') {
    const maxVals: Record<string, number> = {};
    for (const c of normalizedCriteria) {
      maxVals[c.code] = Math.max(...alternatives.map((a) => a.values[c.code] || 0));
    }

    const scores = alternatives.map((alt) => {
      normMatrix[alt.id] = {};
      weightMatrix[alt.id] = {};
      let total = 0;
      for (const c of normalizedCriteria) {
        const val = alt.values[c.code] || 0;
        const max = maxVals[c.code] || 1;
        const r = val / max;
        const v = r * c.weight;
        normMatrix[alt.id][c.code] = Number(r.toFixed(4));
        weightMatrix[alt.id][c.code] = Number(v.toFixed(4));
        total += v;
      }
      return { id: alt.id, name: alt.name, score: Number(total.toFixed(4)) };
    });

    scores.sort((a, b) => b.score - a.score);

    return {
      method: 'saw',
      rankings: scores.map((s, idx) => ({
        id: s.id,
        name: s.name,
        score: s.score,
        rank: idx + 1,
        priority_level: s.score >= 0.8 ? 'Sangat Tinggi' : s.score >= 0.6 ? 'Tinggi' : s.score >= 0.4 ? 'Sedang' : 'Rendah',
      })),
      normalized_matrix: normMatrix,
      weighted_matrix: weightMatrix,
    };
  } else {
    // MOORA
    const denoms: Record<string, number> = {};
    for (const c of normalizedCriteria) {
      const sumSq = alternatives.reduce((sum, a) => sum + Math.pow(a.values[c.code] || 0, 2), 0);
      denoms[c.code] = Math.sqrt(sumSq) || 1;
    }

    const scores = alternatives.map((alt) => {
      normMatrix[alt.id] = {};
      weightMatrix[alt.id] = {};
      let benSum = 0;
      for (const c of normalizedCriteria) {
        const val = alt.values[c.code] || 0;
        const r = val / denoms[c.code];
        const v = r * c.weight;
        normMatrix[alt.id][c.code] = Number(r.toFixed(4));
        weightMatrix[alt.id][c.code] = Number(v.toFixed(4));
        benSum += v;
      }
      return { id: alt.id, name: alt.name, score: Number(benSum.toFixed(4)) };
    });

    const allS = scores.map((s) => s.score);
    const minS = Math.min(...allS);
    const maxS = Math.max(...allS);

    scores.sort((a, b) => b.score - a.score);

    return {
      method: 'moora',
      rankings: scores.map((s, idx) => {
        const rel = maxS > minS ? (s.score - minS) / (maxS - minS) : 0.5;
        const level = rel >= 0.75 ? 'Sangat Tinggi' : rel >= 0.5 ? 'Tinggi' : rel >= 0.25 ? 'Sedang' : 'Rendah';
        return {
          id: s.id,
          name: s.name,
          score: s.score,
          rank: idx + 1,
          priority_level: level,
        };
      }),
      normalized_matrix: normMatrix,
      weighted_matrix: weightMatrix,
    };
  }
}
