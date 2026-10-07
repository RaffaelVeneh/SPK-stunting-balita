import type {
  User,
  Criterion,
  Alternative,
  CalculationResult,
  AhpMatrixResponse,
  DatasetSampleResponse,
  PriorityLevel,
  RankingItem,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Boleh tidaknya peramban menghitung sendiri ketika API tidak terjangkau.
 *
 * Di produksi ini HARUS 'false'. Alasannya bukan soal kerapian: kalau 'true',
 * alamat API yang salah tidak akan memunculkan galat apa pun — aplikasi tetap
 * menampilkan hasil, padahal angkanya dihitung di peramban dan bukan oleh
 * server. Untuk sistem pendukung keputusan yang dipertanggungjawabkan, hasil
 * yang tampak benar tetapi berasal dari jalur yang salah lebih berbahaya
 * daripada pesan galat.
 */
const IZINKAN_CADANGAN = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === 'true';

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
      // SESI PALSU DIMATIKAN DI PRODUKSI.
      //
      // Sebelumnya, kegagalan jaringan apa pun membuat aplikasi mengarang
      // sesi dengan token 'mock-dev-token-uny' dan membiarkan pengguna masuk.
      // Token itu bukan token Sanctum, sehingga pembacaan berhasil (rute GET
      // tidak butuh sesi) tetapi SETIAP PENULISAN gagal 401 "Unauthenticated".
      // Gejalanya menyesatkan: aplikasi tampak berjalan normal, lalu tiba-tiba
      // menolak menyimpan. Kegagalan masuk sekarang ditampilkan apa adanya.
      if (IZINKAN_CADANGAN && err instanceof TypeError && err.message.includes('fetch')) {
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

    // Cadangan luring, hanya aktif bila VITE_ALLOW_LOCAL_FALLBACK = 'true'.
    // Angka ini HARUS sama dengan hasil Fuzzy AHP server; sumber kebenarannya
    // adalah analisis/bobot_resmi.json. Tier di bawah adalah KELUARAN dari
    // bobot ini, bukan penyebabnya.
    if (IZINKAN_CADANGAN) {
      return [
        { code: 'C1', name: 'Kondisi Gizi & Pertumbuhan (TB/U)', weight: 0.350684, type: 'benefit', tier: 1, jalur: 'Langsung' },
        { code: 'C2', name: 'Riwayat Kelahiran Berisiko (BBLR/Prematur)', weight: 0.087080, type: 'benefit', tier: 4, jalur: 'Langsung' },
        { code: 'C3', name: 'Riwayat Penyakit / Infeksi', weight: 0.227551, type: 'benefit', tier: 2, jalur: 'Langsung' },
        { code: 'C4', name: 'Kualitas Pola Pemberian Makan (ASI/MPASI)', weight: 0.146093, type: 'benefit', tier: 3, jalur: 'Langsung' },
        { code: 'C5', name: 'Sanitasi & Akses Air Bersih', weight: 0.050755, type: 'benefit', tier: 5, jalur: 'Tidak langsung' },
        { code: 'C6', name: 'Kerentanan Sosial-Ekonomi', weight: 0.087080, type: 'benefit', tier: 4, jalur: 'Tidak langsung' },
        { code: 'C7', name: 'Akses Layanan Kesehatan (Posyandu)', weight: 0.050755, type: 'benefit', tier: 5, jalur: 'Tidak langsung' },
      ];
    }

    throw new Error(`Kriteria tidak dapat dimuat dari server (${API_BASE_URL}).`);
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
        body: JSON.stringify({ method: 'moora', alternatives, criteria }),
      });

      if (res.ok) {
        const json = await res.json();
        // Daftar rujukan balita nonaktif berada di tingkat atas respons, bukan
        // di dalam 'data'. Tanpa disertakan di sini, ia terbuang dan baris
        // nonaktif hilang dari tabel.
        return { ...json.data, nonaktif: json.nonaktif ?? [] };
      }
    } catch {
      // Jaringan gagal; ditangani di bawah.
    }

    if (IZINKAN_CADANGAN) {
      return localCalculate(alternatives, criteria);
    }

    throw new Error(`Perhitungan tidak dapat dimuat dari server (${API_BASE_URL}).`);
  },

  /* ======================================================================
     CRUD DATA BALITA
     Tidak ada penghapusan permanen. Data yang salah atau sudah tidak
     terpakai dinonaktifkan: keluar dari perhitungan, tetap tampil di daftar.
     ====================================================================== */

  /**
   * Ubah respons gagal menjadi pesan yang bisa dibaca pengguna.
   *
   * Khusus 401: pesannya diganti karena "Unauthenticated." dari Laravel tidak
   * memberi tahu apa yang harus dilakukan, sedangkan penyebabnya hampir selalu
   * sesi kedaluwarsa dan cukup diatasi dengan masuk ulang.
   */
  pesanGalat(json: unknown, cadangan: string): string {
    const j = json as { message?: string; errors?: Record<string, string[]> } | null;
    if (j?.errors) {
      return Object.values(j.errors).flat().join(' ');
    }
    if (j?.message === 'Unauthenticated.') {
      return 'Sesi Anda tidak sah atau sudah berakhir. Silakan keluar lalu masuk kembali.';
    }
    return j?.message || cadangan;
  },

  /** Header permintaan. `isi` menambahkan token untuk permintaan tulis. */
  headers(isi = false): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/json' };
    const token = this.getToken();
    if (isi && token) {
      h.Authorization = `Bearer ${token}`;
      h['Content-Type'] = 'application/json';
    }
    return h;
  },
  async daftarBalita(): Promise<{
    data: Alternative[];
    total: number;
    jumlah_aktif: number;
    jumlah_nonaktif: number;
  }> {
    const res = await fetch(`${API_BASE_URL}/spk/balita`, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(this.pesanGalat(await res.json().catch(() => null), 'Daftar balita tidak dapat dimuat dari server.'));
    }
    return res.json();
  },

  async tambahBalita(payload: Record<string, unknown>): Promise<Alternative> {
    const res = await fetch(`${API_BASE_URL}/spk/balita`, {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      // Pesan validasi dari Laravel dirapikan supaya bisa ditampilkan apa adanya.
      throw new Error(this.pesanGalat(json, 'Data gagal disimpan.'));
    }
    return json.data;
  },

  async ubahBalita(kode: string, payload: Record<string, unknown>): Promise<Alternative> {
    const res = await fetch(`${API_BASE_URL}/spk/balita/${encodeURIComponent(kode)}`, {
      method: 'PUT',
      headers: this.headers(true),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(this.pesanGalat(json, 'Perubahan gagal disimpan.'));
    }
    return json.data;
  },

  async ubahStatusAktif(kode: string): Promise<{ message: string; data: Alternative }> {
    const res = await fetch(`${API_BASE_URL}/spk/balita/${encodeURIComponent(kode)}/aktif`, {
      method: 'POST',
      headers: this.headers(true),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(this.pesanGalat(json, 'Status gagal diubah.'));
    }
    return json;
  },
};

/**
 * Tingkat prioritas dari PROFIL KLINIS ABSOLUT anak.
 *
 * Menggantikan ambang relatif min-max yang dipakai sebelumnya. Ambang relatif
 * selalu memaksa ada minimal satu balita "Sangat Tinggi" dan satu "Rendah" di
 * setiap kohort, sekalipun seluruh kohortnya sehat. Skala ordinal 1-5 bersifat
 * absolut, sehingga tingkat seorang anak tidak boleh berubah hanya karena anak
 * lain di batch yang sama kebetulan lebih sehat atau lebih sakit.
 *
 * Fungsi ini harus menghasilkan aturan yang IDENTIK dengan
 * MooraService::tentukanTingkatKlinis() di backend.
 */
function tentukanTingkatKlinis(
  nilai: Record<string, number>,
  kelengkapan: number
): { tingkat: PriorityLevel; dasar: string; nTinggi: number; perluVerifikasi: boolean } {
  const URUTAN: PriorityLevel[] = ['Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];
  const naikKe = (t: PriorityLevel, minimal: PriorityLevel): PriorityLevel =>
    URUTAN.indexOf(t) >= URUTAN.indexOf(minimal) ? t : minimal;

  const c1 = typeof nilai.C1 === 'number' ? nilai.C1 : null;
  const lain = Object.entries(nilai)
    .filter(([kode]) => kode !== 'C1')
    .map(([, v]) => v);
  const nTinggi = lain.filter((v) => v >= 4).length;
  const nSedang = lain.filter((v) => Math.abs(v - 3) < 1e-9).length;

  let tingkat: PriorityLevel;
  let dasar: string;

  if (c1 === null) {
    tingkat = 'Sedang';
    dasar = 'C1 tidak terukur; tingkat ditahan di Sedang';
  } else if (c1 >= 5) {
    tingkat = 'Sangat Tinggi';
    dasar = 'C1 = 5 (severely stunted, atau stunted dengan tren tumbuh memburuk) -> rujuk segera';
  } else if (c1 >= 4 && nTinggi >= 2) {
    tingkat = 'Sangat Tinggi';
    dasar = `C1 = 4 dengan ${nTinggi} kriteria risiko tinggi lain (risiko kumulatif)`;
  } else if (c1 >= 4) {
    tingkat = 'Tinggi';
    dasar = 'C1 = 4 (stunted)';
  } else if (nTinggi >= 3) {
    tingkat = 'Tinggi';
    dasar = `C1 = ${c1} tetapi ${nTinggi} kriteria risiko tinggi lain`;
  } else if (c1 >= 3) {
    tingkat = 'Sedang';
    dasar = 'C1 = 3 (waspada KMS)';
  } else if (nTinggi >= 2) {
    tingkat = 'Sedang';
    dasar = `C1 = ${c1} dengan ${nTinggi} kriteria risiko tinggi lain`;
  } else if (nSedang >= 3) {
    tingkat = 'Sedang';
    dasar = `${nSedang} kriteria berisiko sedang`;
  } else {
    tingkat = 'Rendah';
    dasar = 'Seluruh kriteria pada tingkat risiko rendah';
  }

  // Data yang belum lengkap tidak boleh menurunkan tingkat secara sepihak
  let perluVerifikasi = false;
  if (kelengkapan < 5) {
    perluVerifikasi = true;
    if (c1 !== null) {
      const minimal = c1 >= 5 ? 'Sangat Tinggi' : c1 >= 4 ? 'Tinggi' : c1 >= 3 ? 'Sedang' : null;
      if (minimal) {
        const baru = naikKe(tingkat, minimal);
        if (baru !== tingkat) {
          tingkat = baru;
          dasar += ' | DINAIKKAN karena data belum lengkap';
        }
      }
    }
  }

  return { tingkat, dasar, nTinggi, perluVerifikasi };
}

/**
 * Kalkulasi lokal client-side, dipakai hanya bila API tidak dapat dihubungi.
 *
 * Implementasi ini harus mencerminkan MooraService (backend) supaya hasil
 * fallback tidak berbeda dari hasil server. Perbedaan yang pernah ada dan
 * sudah diperbaiki di sini:
 *   - SAW dihapus; sistem hanya memakai MOORA.
 *   - Nilai kosong TIDAK lagi diimputasi 1.0. Sebelumnya "tidak diketahui"
 *     diperlakukan sebagai "tidak berisiko", yang berbahaya untuk alat triase.
 *   - Tingkat prioritas memakai aturan klinis absolut, bukan ambang min-max.
 */
function localCalculate(
  alternatives: Alternative[],
  criteria: Criterion[]
): CalculationResult {
  // ================================================================
  // BOBOT TERKUNCI — TIDAK DINAMIS.
  //
  // Seluruh kriteria dipakai dengan bobot AHP APA ADANYA. Penyaringan
  // kriteria "aktif" dan redistribusi bobot proporsional sudah dihapus,
  // karena keduanya membuat angka yang dipakai menghitung bukan lagi bobot
  // hasil AHP melainkan bobot turunan yang berbeda untuk tiap balita.
  // Harus mencerminkan MooraService.php di backend.
  // ================================================================
  const normalizedCriteria = criteria;

  const normMatrix: Record<string, Record<string, number>> = {};
  const weightMatrix: Record<string, Record<string, number>> = {};
  let hasPartial = false;

  {
    // MOORA: r_ij = x_ij / akar(sum_i x_ij^2)
    // Pembagi dihitung HANYA dari nilai yang ada; ini urusan normalisasi,
    // bukan pembobotan, jadi tidak melanggar aturan bobot terkunci.
    const denoms: Record<string, number> = {};
    for (const c of normalizedCriteria) {
      const sumSq = alternatives.reduce((sum, a) => {
        const v = a.values[c.code];
        return typeof v === 'number' ? sum + v * v : sum;
      }, 0);
      denoms[c.code] = Math.sqrt(sumSq) || 1;
    }

    const scores = alternatives.map((alt) => {
      normMatrix[alt.id] = {};
      weightMatrix[alt.id] = {};
      let benSum = 0;
      let filled = 0;
      const missing: string[] = [];
      const nilaiOrdinal: Record<string, number> = {};

      for (const c of normalizedCriteria) {
        const v = alt.values[c.code];
        if (typeof v !== 'number') {
          missing.push(c.code);
          continue;
        }
        filled++;
        nilaiOrdinal[c.code] = v;

        // Bobot AHP apa adanya. TIDAK diredistribusi ke kriteria yang tersedia.
        const wEff = c.weight;
        const r = v / denoms[c.code];
        const vv = r * wEff;
        normMatrix[alt.id][c.code] = Number(r.toFixed(4));
        weightMatrix[alt.id][c.code] = Number(vv.toFixed(4));
        benSum += vv;
      }

      const isPart = missing.length > 0 || normalizedCriteria.length < 7;
      if (isPart) hasPartial = true;

      const klinis = tentukanTingkatKlinis(nilaiOrdinal, filled);

      return {
        id: alt.id,
        name: alt.name,
        score: Number(benSum.toFixed(4)),
        is_partial: isPart,
        completeness_ratio: `${filled}/${normalizedCriteria.length}`,
        missing_criteria: missing,
        raw_attributes: alt.raw_attributes,
        priority_level: klinis.tingkat,
        perlu_verifikasi: klinis.perluVerifikasi,
        tingkat_dasar: klinis.dasar,
        n_kriteria_tinggi: klinis.nTinggi,
        nilai_ordinal: nilaiOrdinal,
      };
    });

    scores.sort((a, b) => b.score - a.score);

    // Perangkingan dengan penanganan SERI yang benar
    const rankings: RankingItem[] = [];
    let rankSebelumnya = 0;
    let skorSebelumnya: number | null = null;
    scores.forEach((s, idx) => {
      let rank: number;
      if (skorSebelumnya !== null && Math.abs(s.score - skorSebelumnya) < 1e-9) {
        rank = rankSebelumnya;
      } else {
        rank = idx + 1;
        rankSebelumnya = rank;
        skorSebelumnya = s.score;
      }
      rankings.push({
        id: s.id,
        name: s.name,
        score: s.score,
        rank,
        priority_level: s.priority_level,
        is_partial: s.is_partial,
        completeness_ratio: s.completeness_ratio,
        missing_criteria: s.missing_criteria,
        raw_attributes: s.raw_attributes,
        perlu_verifikasi: s.perlu_verifikasi,
        details: {
          method: 'MOORA',
          benefit_score: s.score,
          cost_score: 0,
          tingkat_dasar: s.tingkat_dasar,
          n_kriteria_tinggi: s.n_kriteria_tinggi,
          nilai_ordinal: s.nilai_ordinal,
        },
      });
    });

    return {
      method: 'moora',
      is_partial_dataset: hasPartial,
      active_criteria: normalizedCriteria.map((c) => c.code),
      criteria_count: normalizedCriteria.length,
      rankings,
      normalized_matrix: normMatrix,
      weighted_matrix: weightMatrix,
    };
  }
}
