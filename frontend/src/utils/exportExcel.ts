import * as XLSX from 'xlsx';
import type { CalculationResult, Criterion, Alternative, AhpMatrixResponse } from '../types';

const RUBRIC_DESCRIPTIONS: Record<string, { name: string; levels: Record<number, string> }> = {
  C1: {
    name: 'Kondisi Gizi & Pertumbuhan (TB/U)',
    levels: {
      1: 'Optimal / Sangat Sehat (Z >= -1 SD)',
      2: 'Normal / Gizi Baik (-2 SD <= Z < -1 SD)',
      3: 'Waspada / Garis Kuning KMS (Z ~ -2 SD)',
      4: 'Stunted / Pendek (-3 SD <= Z < -2 SD, butuh PMT)',
      5: 'Severely Stunted / Sangat Pendek (Z < -3 SD, rujukan RSUD)',
    },
  },
  C2: {
    name: 'Riwayat Kelahiran Berisiko (BBLR/Prematur)',
    levels: {
      1: 'Cukup Bulan (>=37 mgg), BBL >= 2.500 g',
      2: 'Cukup Bulan, BBL 2.300 - 2.499 g',
      3: 'BBLR Ringan (2.000 - 2.299 g)',
      4: 'Prematur Sedang (34-36 mgg) / BBL 1.500 - 1.999 g',
      5: 'Prematur Ekstrem (<32 mgg) / BBLSR (<1.500 g)',
    },
  },
  C3: {
    name: 'Riwayat Penyakit & Infeksi (Diare/ISPA)',
    levels: {
      1: 'Sangat Sehat (tidak sakit 6 bulan terakhir)',
      2: 'Infeksi Ringan (batuk/pilek biasa sembuh cepat)',
      3: 'Infeksi Berulang (diare <= 2x / ISPA 3 bln terakhir)',
      4: 'Infeksi Kronis (diare berulang / pneumonia / cacingan)',
      5: 'Penyakit Berat / Komplikasi Kronis / TB Anak',
    },
  },
  C4: {
    name: 'Kualitas Pola Asuh Makan (ASI & MPASI)',
    levels: {
      1: 'ASI Eksklusif 6 bln + MPASI protein hewani harian',
      2: 'ASI ada, MPASI gizi seimbang teratur',
      3: 'ASI putus dini / MPASI kurang variasi karbohidrat',
      4: 'Tanpa ASI, MPASI sangat rendah protein hewani',
      5: 'Gagal makan parah / asupan gizi tidak terpenuhi sama sekali',
    },
  },
  C5: {
    name: 'Sanitasi Lingkungan & Air Bersih',
    levels: {
      1: 'Air perpipaan terlindung + jamban leher angsa pribadi',
      2: 'Sumur terlindung + jamban keluarga sehat',
      3: 'Sumur terbuka / jamban komunal bergantian',
      4: 'Air keruh tidak terlindung / sanitasi minim',
      5: 'BABS (tanpa jamban) / dekat limbah tercemar',
    },
  },
  C6: {
    name: 'Kerentanan Sosial-Ekonomi Keluarga',
    levels: {
      1: 'Keluarga mapan mandiri (pendapatan > UMR)',
      2: 'Ekonomi stabil mencukupi kebutuhan pokok pangan',
      3: 'Pekerja informal / rentan fluktuasi pangan',
      4: 'Keluarga pra-sejahtera penerima bansos (PKH/BPNT)',
      5: 'Kemiskinan ekstrem / tanpa penghasilan tetap',
    },
  },
  C7: {
    name: 'Pemanfaatan Layanan Kesehatan (Posyandu)',
    levels: {
      1: 'Posyandu 100% lengkap + Imunisasi tuntas',
      2: 'Posyandu rutin (absen <= 1x) + Imunisasi lengkap',
      3: 'Posyandu terlewat beberapa kali, imunisasi tertunda',
      4: 'Jarang ke Posyandu (>3 bln) & imunisasi bolong',
      5: 'Drop out / menolak imunisasi / tidak pernah ke Posyandu',
    },
  },
};

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

    // Nilai Kriteria Aktif
    for (const code of activeCodes) {
      const val = raw?.values[code];
      row.push(typeof val === 'number' ? val : 1.0);
    }

    // Kelengkapan & Hasil
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

  sheet2Data.push([`LANGKAH PERHITUNGAN METODE ${method.toUpperCase()}`]);
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
  sheet2Data.push(['4. Matriks Terbobot (V) & Skor Akhir']);
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

    // Matriks Saaty
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
  // SHEET 4: PANDUAN RUBRIK SKALA 1–5
  // ==========================================
  const sheet4Data: (string | number | null)[][] = [];

  sheet4Data.push(['PANDUAN OPERASIONAL SKALA PENILAIAN 1–5']);
  sheet4Data.push(['Prinsip Benefit terhadap Risiko: Skala 1 = Optimal/Aman, Skala 5 = Kritis/Darurat']);
  sheet4Data.push([]);
  sheet4Data.push([
    'Kode',
    'Nama Kriteria',
    'Skala 1 (Optimal)',
    'Skala 2 (Baik)',
    'Skala 3 (Waspada)',
    'Skala 4 (Tinggi/Mendesak)',
    'Skala 5 (Kritis/Darurat)',
  ]);

  for (const [code, info] of Object.entries(RUBRIC_DESCRIPTIONS)) {
    sheet4Data.push([
      code,
      info.name,
      info.levels[1],
      info.levels[2],
      info.levels[3],
      info.levels[4],
      info.levels[5],
    ]);
  }

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  XLSX.utils.book_append_sheet(wb, ws4, 'Panduan Rubrik Skala 1-5');

  // Trigger browser download
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `SPK_Stunting_Triase_${method.toUpperCase()}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
