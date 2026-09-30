import * as XLSX from 'xlsx';
import type { CalculationResult, Criterion, Alternative, AhpMatrixResponse } from '../types';

export const FUZZY_SUB_CRITERIA_DATA = [
  {
    fungsi: 'Input',
    variabel: 'C1: Kondisi Gizi & Pertumbuhan (TB/U)',
    subCriteria: [
      { himpunan: 'Sangat Rendah Risiko (Optimal)', skor: 1, range: 'Z >= -1.0 SD (Baku Kemenkes/WHO)', jenis: 'Trapesium Right-Shoulder', domain: '[-1.0, -1.0, +∞, +∞]', note: 'Tumbuh kembang optimal, saturasi membership 1.0 pada zona hijau tua.' },
      { himpunan: 'Rendah Risiko (Normal)', skor: 2, range: '-2.0 SD <= TB/U < -1.0 SD', jenis: 'Segitiga', domain: '[-2.2, -1.5, -0.8]', note: 'Pertumbuhan normal sesuai median populasi anak sehat.' },
      { himpunan: 'Sedang (Garis Kuning)', skor: 3, range: '-2.5 SD <= TB/U < -2.0 SD', jenis: 'Segitiga', domain: '[-2.7, -2.1, -1.8]', note: 'Pertumbuhan melandai (growth faltering) mendekati ambang stunting.' },
      { himpunan: 'Tinggi Risiko (Stunted)', skor: 4, range: '-3.0 SD <= TB/U < -2.0 SD (Baku WHO)', jenis: 'Segitiga', domain: '[-3.2, -2.6, -2.0]', note: 'Terindikasi stunting butuh PMT pemulihan Puskesmas.' },
      { himpunan: 'Sangat Tinggi (Severely Stunted)', skor: 5, range: 'TB/U < -3.0 SD (Baku WHO)', jenis: 'Trapesium Left-Shoulder', domain: '[-∞, -∞, -3.2, -2.9]', note: 'Stunting parah / malnutrisi kronis darurat rujukan spesialis anak.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C2: Riwayat Lahir (BBLR & Prematuritas)',
    subCriteria: [
      { himpunan: 'Sangat Rendah (Normal Cukup Bulan)', skor: 1, range: 'BBL >= 2.500 g & Gestasi >= 37 mgg (Standar WHO)', jenis: 'Trapesium Right-Shoulder', domain: '[2500, 2500, +∞, +∞]', note: 'Lahir cukup bulan dengan berat lahir ideal.' },
      { himpunan: 'Rendah (BBL Batas Bawah)', skor: 2, range: 'BBL 2.300 - 2.499 g & Cukup Bulan', jenis: 'Segitiga', domain: '[2200, 2350, 2500]', note: 'Cukup bulan dengan BBL mendekati ambang batas.' },
      { himpunan: 'Sedang (BBLR Ringan)', skor: 3, range: 'BBL 2.000 - 2.299 g atau Lahir 34-36 mgg (Late Preterm)', jenis: 'Segitiga', domain: '[1900, 2150, 2350]', note: 'BBLR ringan butuh pantauan kejar tumbuh ekstra.' },
      { himpunan: 'Tinggi (BBLR Sedang / Moderate-Very Preterm)', skor: 4, range: 'BBL 1.500 - 1.999 g atau Lahir 32-34 mgg (WHO Preterm)', jenis: 'Segitiga', domain: '[1400, 1750, 2050]', note: 'Lahir prematur atau BBLR sedang berisiko infeksi.' },
      { himpunan: 'Sangat Tinggi (BBLSR / Sangat-Ekstrem Prematur)', skor: 5, range: 'BBL < 1.500 g (BBLSR/VLBW) atau Gestasi < 32 mgg (Very/Extremely Preterm)', jenis: 'Trapesium Left-Shoulder', domain: '[0, 0, 1200, 1500]', note: 'Aturan agregasi model: max(skor BBL, skor Gestasi). Komplikasi neonatal tinggi.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C3: Riwayat Penyakit Infeksi (Diare/ISPA)',
    subCriteria: [
      { himpunan: 'Sangat Rendah (Bebas Infeksi)', skor: 1, range: '0 kali sakit / 6 bulan terakhir', jenis: 'Trapesium Left-Shoulder', domain: '[0, 0, 0, 0.8]', note: 'Imunitas prima, tidak ada gangguan serapan usus.' },
      { himpunan: 'Rendah (Infeksi Ringan)', skor: 2, range: '1 kali episode batuk/pilek biasa', jenis: 'Segitiga', domain: '[0.5, 1.0, 2.0]', note: 'Infeksi ringan sembuh cepat tanpa komplikasi.' },
      { himpunan: 'Sedang (Infeksi Berulang Ringan)', skor: 3, range: '2 - 3 kali episode diare/ISPA', jenis: 'Segitiga', domain: '[1.5, 2.5, 3.5]', note: 'Diare akut berulang mulai mengganggu penyerapan zat gizi.' },
      { himpunan: 'Tinggi (Infeksi Kronis / Pneumonia)', skor: 4, range: '4 - 5 kali episode atau Diare Kronis', jenis: 'Segitiga', domain: '[3.0, 4.5, 5.5]', note: 'Definisi operasional model: enteropati lingkungan / infeksi saluran napas bawah.' },
      { himpunan: 'Sangat Tinggi (Penyakit Kronis / TB Anak)', skor: 5, range: '>= 6 kali episode atau TB Anak / Malnutrisi', jenis: 'Trapesium Right-Shoulder', domain: '[5.0, 6.0, +∞, +∞]', note: 'Definisi operasional pakar: infeksi berat sistemik menghambat pertumbuhan.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C4: Kualitas Pola Asuh Makan (Standar IYCF WHO)',
    subCriteria: [
      { himpunan: 'Sangat Rendah Risiko (Kepatuhan IYCF Optimal)', skor: 1, range: 'ASI Eksklusif 6 bln + MDD Terpenuhi + Protein Hewani Tiap Hari', jenis: 'Trapesium Right-Shoulder', domain: '[85, 90, 100, 100]', note: 'Standar Emas IYCF (Infant and Young Child Feeding).' },
      { himpunan: 'Rendah Risiko (Baik)', skor: 2, range: 'Diberikan ASI + MPASI Gizi Seimbang 4-5 kelompok pangan', jenis: 'Segitiga', domain: '[65, 75, 88]', note: 'Kebutuhan makronutrien dan mikronutrien harian tercukupi.' },
      { himpunan: 'Sedang (Kurang Variatif)', skor: 3, range: 'ASI terputus < 6 bln atau MPASI didominasi karbohidrat tunggal', jenis: 'Segitiga', domain: '[45, 55, 70]', note: 'Defisit pangan sumber hewani (telur/ikan/daging).' },
      { himpunan: 'Tinggi Risiko (Buruk / Monoton)', skor: 4, range: 'Tanpa ASI, keragaman rendah (< 3 kelompok pangan), minim mikronutrien', jenis: 'Segitiga', domain: '[20, 35, 50]', note: 'Pola asuh makan salah, dominan makanan olahan/kemasan.' },
      { himpunan: 'Sangat Tinggi (Defisit Nutrisi Akut / Gagal Makan)', skor: 5, range: 'Gagal makan parah / penolakan total / asupan sangat rendah', jenis: 'Trapesium Left-Shoulder', domain: '[0, 0, 15, 30]', note: 'Skor operasional model: asupan gizi tidak mencukupi kebutuhan dasar basal.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C5: Sanitasi & Air Bersih (Tangga Layanan JMP WHO/UNICEF)',
    subCriteria: [
      { himpunan: 'Sangat Rendah Risiko (Safely Managed)', skor: 1, range: 'Tangga JMP 1: Air perpipaan terlindung teruji + Jamban leher angsa septik pribadi', jenis: 'Trapesium Right-Shoulder', domain: '[85, 90, 100, 100]', note: 'Tingkat tertinggi WHO/UNICEF JMP (Joint Monitoring Programme).' },
      { himpunan: 'Rendah Risiko (Basic Service)', skor: 2, range: 'Tangga JMP 2: Air terlindung layak (sumur bor/pompa) + Jamban keluarga layak', jenis: 'Segitiga', domain: '[65, 75, 88]', note: 'Layanan dasar layak memenuhi syarat kesehatan lingkungan.' },
      { himpunan: 'Sedang (Limited Service)', skor: 3, range: 'Tangga JMP 3: Sarana air/jamban komunal bersama antar-keluarga', jenis: 'Segitiga', domain: '[45, 55, 70]', note: 'Fasilitas layak tetapi digunakan bersama >1 rumah tangga.' },
      { himpunan: 'Tinggi Risiko (Unimproved Service)', skor: 4, range: 'Tangga JMP 4: Sumur terbuka tak terlindung, mata air tak terlindungi', jenis: 'Segitiga', domain: '[20, 35, 50]', note: 'Tinggi risiko kontaminasi bakteri patogen fekal pencetus diare.' },
      { himpunan: 'Sangat Tinggi (Open Defecation / BABS)', skor: 5, range: 'Tangga JMP 5: Tanpa jamban (BABS ke kebun/sungai) / air permukaan', jenis: 'Trapesium Left-Shoulder', domain: '[0, 0, 10, 25]', note: 'Praktek BABS menjadi transmisi utama infeksi usus dan enteropati lingkungan.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C6: Kerentanan Sosial-Ekonomi (Garis Kemiskinan & Desil Bansos)',
    subCriteria: [
      { himpunan: 'Sangat Rendah Risiko (Mapan / Desil 8-10)', skor: 1, range: 'Penghasilan di atas UMR regional, ketahanan pangan terjamin', jenis: 'Trapesium Right-Shoulder', domain: '[4.5, 5.0, +∞, +∞]', note: 'Daya beli pangan hewani dan akses medis sangat mandiri.' },
      { himpunan: 'Rendah Risiko (Menengah Stabil / Desil 6-7)', skor: 2, range: 'Penghasilan mendekati UMR, kebutuhan pokok pangan stabil', jenis: 'Segitiga', domain: '[2.8, 3.8, 4.8]', note: 'Keluarga mampu memenuhi kecukupan gizi seimbang.' },
      { himpunan: 'Sedang (Rentan / Desil 4-5)', skor: 3, range: 'Pekerja harian lepas/informal, rentan gejolak inflasi harga pangan', jenis: 'Segitiga', domain: '[1.8, 2.5, 3.2]', note: 'Pengeluaran pangan mendominasi, rawan kompromi kualitas gizi.' },
      { himpunan: 'Tinggi Risiko (Pra-Sejahtera / Desil 2-3 / PKH)', skor: 4, range: 'Penerima Bantuan Sosial Reguler (PKH/BPNT), di sekitar garis kemiskinan BPS', jenis: 'Segitiga', domain: '[0.9, 1.5, 2.2]', note: 'Keluarga terdaftar DTKS, daya beli pangan bergizi sangat terbatas.' },
      { himpunan: 'Sangat Tinggi (Kemiskinan Ekstrem / Desil 1)', skor: 5, range: 'Penghasilan di bawah garis kemiskinan ekstrem BPS / tanpa penghasilan tetap', jenis: 'Trapesium Left-Shoulder', domain: '[0, 0, 0.6, 1.2]', note: 'Definisi operasional: kerentanan ketahanan pangan akut rumah tangga.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C7: Pemanfaatan Posyandu & Layanan Kesehatan (Standar Kemenkes)',
    subCriteria: [
      { himpunan: 'Sangat Rendah Risiko (100% Aktif & IDL Tuntas)', skor: 1, range: 'Hadir Posyandu 12x/thn + Imunisasi Dasar Lengkap (IDL) Tuntas', jenis: 'Trapesium Right-Shoulder', domain: '[90, 95, 100, 100]', note: 'Pemantauan tumbuh kembang dan proteksi penyakit infeksi sempurna.' },
      { himpunan: 'Rendah Risiko (Rutin Standar SPM)', skor: 2, range: 'Hadir 8-11x/thn (Memenuhi Standar Pelayanan Minimal Kemenkes) + IDL Tuntas', jenis: 'Segitiga', domain: '[70, 85, 95]', note: 'Kemenkes mensyaratkan minimal 8x pemantauan pertumbuhan per tahun.' },
      { himpunan: 'Sedang (Cukup / Imunisasi Tertunda)', skor: 3, range: 'Hadir 6-7x/thn atau Imunisasi Dasar belum lengkap', jenis: 'Segitiga', domain: '[50, 65, 78]', note: 'Mulai ada periode penimbangan KMS yang terlewat.' },
      { himpunan: 'Tinggi Risiko (Jarang Terpantau)', skor: 4, range: 'Hadir 3-5x/thn, >3 bulan berturut-turut absen penimbangan', jenis: 'Segitiga', domain: '[25, 40, 58]', note: 'Kader nakes kehilangan deteksi dini growth faltering.' },
      { himpunan: 'Sangat Tinggi (Drop Out / Menolak Posyandu)', skor: 5, range: 'Hadir < 3x/thn atau menolak pemantauan nakes & imunisasi', jenis: 'Trapesium Left-Shoulder', domain: '[0, 0, 15, 30]', note: 'Aturan agregasi model: balita lepas dari pengawasan sistem kesehatan.' },
    ],
  },
];

export const SPK_WORKFLOW_STEPS = [
  { tahap: 1, proses: 'Menentukan Variabel Input (Kriteria)', desc: 'Mengidentifikasi 7 determinan stunting balita berdasarkan regulasi Kemenkes RI & WHO (C1 s/d C7).', rumus: 'Data mentah (Z-score TB/U, BBLR, Frekuensi Diare, ASI, Sanitasi, Pendapatan, Posyandu)' },
  { tahap: 2, proses: 'Menentukan Himpunan Linguistik (Sub-Kriteria)', desc: 'Menentukan 5 kategori derajat risiko untuk setiap kriteria: Sangat Rendah (1), Rendah (2), Sedang (3), Tinggi (4), Sangat Tinggi (5).', rumus: 'Skala Ordinal 1 s/d 5 (Benefit terhadap Urgensi Intervensi)' },
  { tahap: 3, proses: 'Menentukan Domain & Fungsi Keanggotaan', desc: 'Menetapkan batas domain kurva Segitiga (titik puncak) dan Trapesium (rentang saturasi), dengan batas beririsan (overlap) agar stabil.', rumus: 'Kurva Trapesium [a, b, c, d] dan Kurva Segitiga [a, b, c]' },
  { tahap: 4, proses: 'Penerjemahan Sub-Kriteria (Fuzzifikasi)', desc: 'Mengonversi data observasi riil balita ke dalam nilai tegas skala ordinal 1–5 berdasarkan interval sub-kriteria.', rumus: 'Input x_ij in {1, 2, 3, 4, 5}' },
  { tahap: 5, proses: 'Pembobotan Prioritas AHP', desc: 'Menyusun matriks perbandingan berpasangan Saaty (7x7), menghitung bobot prioritas kriteria (w_j), dan menguji rasio konsistensi.', rumus: 'a_ij = 1/a_ji, w_j = sum(n_ij)/n, CR = CI/RI < 0.10' },
  { tahap: 6, proses: 'Normalisasi Matriks (SAW / MOORA)', desc: 'Menghitung matriks ternormalisasi (R) sesuai metode yang aktif (SAW: benefit x_ij / max(x_j); MOORA: rasio x_ij / sqrt(sum(x^2))).', rumus: 'R = [r_ij]' },
  { tahap: 7, proses: 'Perhitungan Nilai Akhir & Triase Prioritas', desc: 'Mengalikan nilai normalisasi dengan bobot AHP (V = R * W), perangkingan descending, dan menetapkan tindakan klinis.', rumus: 'SAW: V_i = sum(w_j * r_ij); MOORA: y_i = sum(w_j * r_ij). Rank 1 = Prioritas Paling Mendesak' },
];

export function exportSpkToExcel({
  result,
  criteria,
  balitas,
  ahpData,
  method,
}: {
  result: CalculationResult;
  criteria: Criterion[];
  balitas: Alternative[];
  ahpData: AhpMatrixResponse | null;
  method: 'saw' | 'moora';
}) {
  const wb = XLSX.utils.book_new();
  const activeCriteria = criteria.filter((c) => c.active !== false);
  const activeCodes = activeCriteria.map((c) => c.code);

  // ==========================================
  // SHEET 1: HASIL TRIASE & PERANGKINGAN
  // ==========================================
  const sheet1Data: (string | number | null)[][] = [];

  sheet1Data.push(['SISTEM PENDUKUNG KEPUTUSAN PENETAPAN PRIORITAS INTERVENSI STUNTING BALITA']);
  sheet1Data.push([`Metode: ${method.toUpperCase()} | Pembobotan: AHP (Analytic Hierarchy Process)`]);
  sheet1Data.push([`Tanggal Export: ${new Date().toLocaleDateString('id-ID')} | Total Balita: ${result.rankings.length}`]);
  sheet1Data.push([]);

  // Header Tabel
  const header1 = [
    'Peringkat (Rank)',
    'Kode Balita',
    'Nama Lengkap',
    'Usia (Bulan)',
    'Jenis Kelamin',
    'Tinggi Badan (cm)',
    'Status Gizi',
    ...activeCodes.map((code) => `Nilai ${code}`),
    'Kelengkapan Data',
    'Skor Akhir SPK',
    'Tingkat Prioritas',
    'Rekomendasi Tindakan Triase',
  ];
  sheet1Data.push(header1);

  // Isi Data Ranking
  const balitaMap = new Map(balitas.map((b) => [b.id, b]));

  for (const item of result.rankings) {
    const raw = balitaMap.get(item.id);
    const attr = raw?.raw_attributes || item.raw_attributes;

    const row: (string | number | null)[] = [
      item.rank,
      item.id,
      item.name,
      attr?.umur_bulan ?? '-',
      attr?.jenis_kelamin ? (attr.jenis_kelamin.toLowerCase() === 'laki-laki' ? 'Laki-Laki' : 'Perempuan') : '-',
      attr?.tinggi_badan_cm ?? '-',
      attr?.status_gizi ?? '-',
    ];

    for (const code of activeCodes) {
      const val = raw?.values[code];
      row.push(typeof val === 'number' ? val : 1.0);
    }

    row.push(item.is_partial ? `${item.completeness_ratio} (Parsial)` : '7/7 (Lengkap)');
    row.push(item.score);
    row.push(item.priority_level);

    let tindakan = 'Pemeliharaan Pola Asuh & Penimbangan Teratur';
    if (item.priority_level === 'Sangat Tinggi') {
      tindakan = 'Rujuk Dokter Spesialis Anak & PMT Pemulihan Segera';
    } else if (item.priority_level === 'Tinggi') {
      tindakan = 'Kunjungan Rumah Kader & Konseling Gizi Intensif';
    } else if (item.priority_level === 'Sedang') {
      tindakan = 'Pemantauan Rutin Posyandu & Suplementasi Vitamin';
    }
    row.push(tindakan);

    sheet1Data.push(row);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'Hasil Triase & Ranking');

  // ==========================================
  // SHEET 2: PERHITUNGAN METODE (SAW / MOORA)
  // ==========================================
  const sheet2Data: (string | number | null)[][] = [];

  sheet2Data.push([`LANGKAH PERHITUNGAN METODE ${method.toUpperCase()} (RINCIAN KETAT)`]);
  sheet2Data.push(['1. Matriks Keputusan Awal (X)']);
  sheet2Data.push(['Kode Balita', ...activeCodes]);

  for (const b of balitas) {
    const r: (string | number | null)[] = [b.id];
    for (const c of activeCodes) {
      r.push(typeof b.values[c] === 'number' ? b.values[c] : 1.0);
    }
    sheet2Data.push(r);
  }

  sheet2Data.push([]);
  sheet2Data.push(['2. Bobot Kriteria Ternormalisasi (W) dan Tipe']);
  const sumW = activeCriteria.reduce((s, c) => s + c.weight, 0);
  sheet2Data.push(['Atribut', ...activeCodes]);
  sheet2Data.push(['Nama Kriteria', ...activeCriteria.map((c) => c.name)]);
  sheet2Data.push(['Bobot Asli AHP', ...activeCriteria.map((c) => c.weight)]);
  sheet2Data.push(['Bobot Efektif (Re-distribusi)', ...activeCriteria.map((c) => Number((c.weight / sumW).toFixed(4)))]);
  sheet2Data.push(['Tipe Kriteria', ...activeCriteria.map((c) => c.type.toUpperCase())]);

  sheet2Data.push([]);
  sheet2Data.push([`3. Matriks Ternormalisasi (R) - ${method === 'saw' ? 'Rumus: r_ij = x_ij / max(x_j)' : 'Rumus: r_ij = x_ij / sqrt(sum(x^2))'}`]);
  sheet2Data.push(['Kode Balita', ...activeCodes]);

  for (const b of balitas) {
    const r: (string | number | null)[] = [b.id];
    const normRow = result.normalized_matrix[b.id] || {};
    for (const c of activeCodes) {
      r.push(normRow[c] ?? 0);
    }
    sheet2Data.push(r);
  }

  sheet2Data.push([]);
  sheet2Data.push([`4. Matriks Terbobot (V) & Skor Akhir - ${method === 'saw' ? 'V_i = sum(w_j * r_ij)' : 'y_i = sum(w_j * r_ij)'}`]);
  sheet2Data.push(['Kode Balita', ...activeCodes, 'Total Skor', 'Peringkat']);

  for (const item of result.rankings) {
    const r: (string | number | null)[] = [item.id];
    const wRow = result.weighted_matrix[item.id] || {};
    for (const c of activeCodes) {
      r.push(wRow[c] ?? 0);
    }
    r.push(item.score);
    r.push(item.rank);
    sheet2Data.push(r);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, `Perhitungan ${method.toUpperCase()}`);

  // ==========================================
  // SHEET 3: PEMBOBOTAN AHP
  // ==========================================
  if (ahpData) {
    const sheet3Data: (string | number | null)[][] = [];

    sheet3Data.push(['PEMBOBOTAN AHP (ANALYTIC HIERARCHY PROCESS)']);
    sheet3Data.push(['Matriks Perbandingan Berpasangan Skala Saaty (1-9) oleh Pakar Gizi']);
    sheet3Data.push([]);

    sheet3Data.push(['Kriteria', ...ahpData.criteria, 'Bobot Prioritas (w_j)']);
    ahpData.matrix.forEach((row, idx) => {
      const code = ahpData.criteria[idx];
      const w = ahpData.ahp_result.weights[code] || 0;
      sheet3Data.push([code, ...row, w]);
    });

    sheet3Data.push([]);
    sheet3Data.push(['UJI KONSISTENSI SAATY (CR < 0.10)']);
    sheet3Data.push(['Parameter', 'Nilai', 'Keterangan']);
    sheet3Data.push(['Lambda Max (λmax)', Number(ahpData.ahp_result.lambda_max.toFixed(4)), 'Nilai Eigen Maksimum']);
    sheet3Data.push(['Consistency Index (CI)', Number(ahpData.ahp_result.consistency_index.toFixed(4)), '(λmax - n) / (n - 1)']);
    sheet3Data.push(['Random Index (RI n=7)', Number(ahpData.ahp_result.random_index.toFixed(4)), 'Tabel Standar Saaty n=7']);
    sheet3Data.push([
      'Consistency Ratio (CR)',
      Number(ahpData.ahp_result.consistency_ratio.toFixed(4)),
      ahpData.ahp_result.is_valid ? 'KONSISTEN & VALID (CR < 0.10)' : 'TIDAK KONSISTEN',
    ]);

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
    XLSX.utils.book_append_sheet(wb, ws3, 'Pembobotan AHP');
  }

  // ==========================================
  // SHEET 4: TAHAPAN & SUB-KRITERIA FUZZY (PERSIS FORMAT ACADEMIC)
  // ==========================================
  const sheet4Data: (string | number | null)[][] = [];

  sheet4Data.push(['TAHAPAN ALUR PROSES SPK (KOMBINASI FUZZY SUB-KRITERIA + AHP + SAW/MOORA)']);
  sheet4Data.push([]);
  sheet4Data.push(['Tahap', 'Proses', 'Yang Dilakukan', 'Rumus / Referensi']);
  for (const step of SPK_WORKFLOW_STEPS) {
    sheet4Data.push([step.tahap, step.proses, step.desc, step.rumus]);
  }

  sheet4Data.push([]);
  sheet4Data.push(['TABEL HIMPUNAN INPUT SUB-KRITERIA & FUNGSI KEANGGOTAAN FUZZY']);
  sheet4Data.push([
    'Fungsi',
    'Variabel',
    'Fungsi Keanggotaan',
    'Skala SPK',
    'Batas Rujukan Klinis / Skala Model',
    'Jenis Keanggotaan',
    'Domain Kurva Fuzzy',
    'Penjelasan / Aturan Agregasi',
  ]);

  for (const item of FUZZY_SUB_CRITERIA_DATA) {
    let first = true;
    for (const sub of item.subCriteria) {
      sheet4Data.push([
        first ? item.fungsi : '',
        first ? item.variabel : '',
        sub.himpunan,
        sub.skor,
        sub.range,
        sub.jenis,
        sub.domain,
        sub.note,
      ]);
      first = false;
    }
  }

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  XLSX.utils.book_append_sheet(wb, ws4, 'Tahapan & Sub-Kriteria Fuzzy');

  // Trigger browser download
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `SPK_Stunting_Triase_${method.toUpperCase()}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
