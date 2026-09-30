import * as XLSX from 'xlsx';
import type { CalculationResult, Criterion, Alternative, AhpMatrixResponse } from '../types';

export const FUZZY_SUB_CRITERIA_DATA = [
  {
    fungsi: 'Input',
    variabel: 'C1: Kondisi Gizi & Pertumbuhan (TB/U)',
    subCriteria: [
      { himpunan: 'Sangat Rendah (Optimal)', skor: 1, range: 'Z >= -1 SD', jenis: 'Trapesium', domain: '[-1, 0, +∞, +∞]', note: 'Nilai di atas -1 SD seluruhnya optimal.' },
      { himpunan: 'Rendah (Gizi Baik)', skor: 2, range: '-2 <= Z < -1 SD', jenis: 'Segitiga', domain: '[-2.0, -1.5, -1.0]', note: 'Titik representatif puncak di -1.5 SD.' },
      { himpunan: 'Sedang (Waspada KMS)', skor: 3, range: '-2.5 <= Z < -1.8 SD', jenis: 'Segitiga', domain: '[-2.5, -2.0, -1.8]', note: 'Kurva pertumbuhan mendatar (garis kuning).' },
      { himpunan: 'Tinggi (Stunted / Pendek)', skor: 4, range: '-3 <= Z < -2 SD', jenis: 'Segitiga', domain: '[-3.0, -2.5, -2.0]', note: 'Terindikasi stunting butuh PMT pemulihan.' },
      { himpunan: 'Sangat Tinggi (Severely Stunted)', skor: 5, range: 'Z < -3 SD', jenis: 'Trapesium', domain: '[-∞, -∞, -3.5, -3.0]', note: 'Saturasi gawat darurat rujukan dokter spesialis.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C2: Riwayat Lahir (BBLR & Prematur)',
    subCriteria: [
      { himpunan: 'Sangat Rendah (Normal Cukup Bulan)', skor: 1, range: '>= 2.500 g, >= 37 mgg', jenis: 'Trapesium', domain: '[2500, 3000, +∞, +∞]', note: 'Lahir cukup bulan berat badan normal.' },
      { himpunan: 'Rendah (BBL Batas Bawah)', skor: 2, range: '2.300 - 2.500 g', jenis: 'Segitiga', domain: '[2200, 2350, 2500]', note: 'Cukup bulan BB mendekati ambang batas.' },
      { himpunan: 'Sedang (BBLR Ringan)', skor: 3, range: '2.000 - 2.300 g', jenis: 'Segitiga', domain: '[1900, 2100, 2300]', note: 'BBLR ringan butuh pantauan ekstra.' },
      { himpunan: 'Tinggi (BBLR / Prematur Sedang)', skor: 4, range: '1.500 - 2.000 g, 34-36 mgg', jenis: 'Segitiga', domain: '[1400, 1750, 2000]', note: 'Lahir prematur atau BBLR sedang.' },
      { himpunan: 'Sangat Tinggi (BBLSR / Prematur Ekstrem)', skor: 5, range: '< 1.500 g, < 32 mgg', jenis: 'Trapesium', domain: '[0, 0, 1200, 1500]', note: 'BBLSR komplikasi neonatal berisiko gagal tumbuh.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C3: Riwayat Penyakit Infeksi (Diare/ISPA)',
    subCriteria: [
      { himpunan: 'Sangat Rendah (Tidak Pernah)', skor: 1, range: '0 kali sakit / 6 bulan', jenis: 'Trapesium', domain: '[0, 0, 0, 1]', note: 'Imunitas prima bebas penyakit infeksi.' },
      { himpunan: 'Rendah (Infeksi Ringan)', skor: 2, range: '1 kali episode sakit', jenis: 'Segitiga', domain: '[0, 1, 2]', note: 'Batuk pilek biasa cepat sembuh.' },
      { himpunan: 'Sedang (Infeksi Berulang Ringan)', skor: 3, range: '2 - 3 kali sakit', jenis: 'Segitiga', domain: '[1, 2.5, 3.5]', note: 'Diare akut berulang mulai mengganggu serapan nutrisi.' },
      { himpunan: 'Tinggi (Infeksi Kronis / Pneumonia)', skor: 4, range: '4 - 5 kali sakit', jenis: 'Segitiga', domain: '[3, 4.5, 6]', note: 'Diare kronis berulang, pneumonia, atau cacingan.' },
      { himpunan: 'Sangat Tinggi (Infeksi Berat / TB Anak)', skor: 5, range: '>= 6 kali / Penyakit Berat', jenis: 'Trapesium', domain: '[5, 6, +∞, +∞]', note: 'TB Anak atau infeksi kronis komplikasi sistemik.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C4: Kualitas Pola Makan (ASI & MPASI)',
    subCriteria: [
      { himpunan: 'Sangat Rendah Risiko (Lengkap & Teratur)', skor: 1, range: 'ASI Eksklusif + Hewani Tiap Hari (80-100%)', jenis: 'Trapesium', domain: '[80, 90, 100, 100]', note: 'Praktek pemberian makan standar emas WHO.' },
      { himpunan: 'Rendah Risiko (Baik)', skor: 2, range: 'ASI ada + Gizi Cukup (65-85%)', jenis: 'Segitiga', domain: '[65, 75, 85]', note: 'Asupan gizi seimbang teratur.' },
      { himpunan: 'Sedang (Kurang Variatif)', skor: 3, range: 'ASI putus dini / Karbohidrat Dominan (45-70%)', jenis: 'Segitiga', domain: '[45, 55, 70]', note: 'Kurang protein hewani esensial.' },
      { himpunan: 'Tinggi Risiko (Buruk)', skor: 4, range: 'Tanpa ASI + Sangat Rendah Mikronutrien (25-50%)', jenis: 'Segitiga', domain: '[25, 35, 50]', note: 'Pola asuh makan salah, dominan ultra-proses.' },
      { himpunan: 'Sangat Tinggi (Gagal Makan Parah)', skor: 5, range: 'Defisit Nutrisi Total (0-30%)', jenis: 'Trapesium', domain: '[0, 0, 15, 30]', note: 'Penolakan makan ekstrem / nutrisi tidak terpenuhi.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C5: Sanitasi Lingkungan & Air Bersih',
    subCriteria: [
      { himpunan: 'Sangat Rendah Risiko (Sangat Layak)', skor: 1, range: 'Air perpipaan + jamban leher angsa pribadi (85-100)', jenis: 'Trapesium', domain: '[85, 95, 100, 100]', note: 'Higienis bebas kontaminasi fekal.' },
      { himpunan: 'Rendah Risiko (Layak)', skor: 2, range: 'Sumur terlindung + jamban keluarga (65-90)', jenis: 'Segitiga', domain: '[65, 75, 90]', note: 'Sanitasi keluarga sehat.' },
      { himpunan: 'Sedang (Komunal / Bergantian)', skor: 3, range: 'Sumur terbuka / jamban komunal (45-70)', jenis: 'Segitiga', domain: '[45, 55, 70]', note: 'Risiko pencemaran bakteri saat musim hujan.' },
      { himpunan: 'Tinggi Risiko (Kurang Layak)', skor: 4, range: 'Air keruh / sanitasi minim (20-50)', jenis: 'Segitiga', domain: '[20, 35, 50]', note: 'Ketiadaan air bersih memicu infeksi saluran cerna.' },
      { himpunan: 'Sangat Tinggi (BABS / Sangat Buruk)', skor: 5, range: 'Tanpa jamban (BABS) / limbah terbuka (0-25)', jenis: 'Trapesium', domain: '[0, 0, 10, 25]', note: 'Buang air besar sembarangan dekat rumah.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C6: Kerentanan Sosial-Ekonomi Keluarga',
    subCriteria: [
      { himpunan: 'Sangat Rendah Risiko (Mapan Mandiri)', skor: 1, range: '>= Rp 4.500.000 / di atas UMR', jenis: 'Trapesium', domain: '[4.5, 6, +∞, +∞]', note: 'Daya beli pangan bergizi tinggi sangat aman.' },
      { himpunan: 'Rendah Risiko (Menengah Stabil)', skor: 2, range: 'Rp 3.000.000 - Rp 5.000.000', jenis: 'Segitiga', domain: '[2.8, 3.8, 5.0]', note: 'Mencukupi kebutuhan pokok sehari-hari.' },
      { himpunan: 'Sedang (Rentan / Pekerja Lepas)', skor: 3, range: 'Rp 2.000.000 - Rp 3.200.000', jenis: 'Segitiga', domain: '[1.8, 2.5, 3.2]', note: 'Penghasilan pas-pasan rentan inflasi pangan.' },
      { himpunan: 'Tinggi Risiko (Pra-Sejahtera / Bansos)', skor: 4, range: 'Rp 1.000.000 - Rp 2.200.000', jenis: 'Segitiga', domain: '[0.9, 1.5, 2.2]', note: 'Keluarga penerima bantuan PKH/BPNT.' },
      { himpunan: 'Sangat Tinggi (Kemiskinan Ekstrem)', skor: 5, range: '< Rp 1.000.000 / Tanpa Penghasilan Tetap', jenis: 'Trapesium', domain: '[0, 0, 0.6, 1.2]', note: 'Daya beli pangan bergizi hampir nol.' },
    ],
  },
  {
    fungsi: 'Input',
    variabel: 'C7: Pemanfaatan Layanan Posyandu',
    subCriteria: [
      { himpunan: 'Sangat Rendah Risiko (100% Aktif)', skor: 1, range: '12 kali hadir + Imunisasi Lengkap (90-100%)', jenis: 'Trapesium', domain: '[90, 95, 100, 100]', note: 'Tumbuh kembang terpantau penuh oleh kader.' },
      { himpunan: 'Rendah Risiko (Rutin)', skor: 2, range: '10-11 kali hadir (75-95%)', jenis: 'Segitiga', domain: '[75, 85, 95]', note: 'Rutin dengan imunisasi dasar lengkap.' },
      { himpunan: 'Sedang (Cukup)', skor: 3, range: '7-9 kali hadir (50-80%)', jenis: 'Segitiga', domain: '[50, 65, 80]', note: 'Mulai ada bulan penimbangan yang terlewat.' },
      { himpunan: 'Tinggi Risiko (Jarang Terpantau)', skor: 4, range: '4-6 kali hadir (25-60%)', jenis: 'Segitiga', domain: '[25, 40, 60]', note: '>3 bulan berturut-turut tidak ditimbang.' },
      { himpunan: 'Sangat Tinggi (Drop Out / Menolak)', skor: 5, range: '< 4 kali / Menolak (0-35%)', jenis: 'Trapesium', domain: '[0, 0, 15, 35]', note: 'Balita lepas dari pengawasan tenaga kesehatan.' },
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
    'Range Satuan Asli',
    'Jenis Keanggotaan',
    'Domain Kurva',
    'Penjelasan Bentuk Kurva',
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
