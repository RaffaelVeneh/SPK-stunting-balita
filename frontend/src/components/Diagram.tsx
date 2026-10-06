import React from 'react';

/* ============================================================================
   DIAGRAM ALIR
   Bentuk baku flowchart digambar sebagai SVG supaya tajam di layar maupun saat
   dicetak. Aturan yang dipegang:
   - Tidak ada pigmen baru. Semua simpul memakai kertas + garis rambut, dan
     hanya terminator (mulai/selesai) yang memakai bidang papan, karena di
     sistem ini pigmen hanya boleh menandai tingkat risiko, pilihan, dan keadaan
     aktif. Keputusan dibedakan lewat BENTUK, bukan warna.
   - Semua teks minimal 12px dan memakai Archivo yang di-host sendiri.
   - Satu diagram = satu svg dengan viewBox, sehingga skalanya proporsional di
     layar sempit tanpa memutus konektornya.
   ========================================================================== */

type BentukSimpul = 'terminator' | 'proses' | 'dokumen' | 'simpan';

export type Langkah =
  | { bentuk: BentukSimpul; judul: string; ket?: string }
  | { bentuk: 'keputusan'; judul: string; ya: string; yaKet?: string };

/* --- Ukuran kanvas. Semua koordinat mengacu ke sini. --- */
const W = 900;
const SPINE = 330;
const LEBAR_SIMPUL = 400;
const TINGGI_SIMPUL = 58;
const TINGGI_SIMPUL_DUA = 72;
const JARAK = 34;
const LEBAR_BELAH = 260;
const TINGGI_BELAH = 92;
const X_KELUAR = 512;
const LEBAR_KELUAR = 352;

const WARNA = {
  papan: '#12362c',
  kapur: '#f7f5ee',
  kertas: '#f8f9f6',
  garis: 'rgba(17,28,24,0.30)',
  garisTipis: 'rgba(17,28,24,0.16)',
  tinta: '#101a16',
  tintaMuted: '#46524b',
};

/** Teks yang dipotong menjadi baris-baris dengan lebar maksimum tertentu. */
function baris(teks: string, maks: number): string[] {
  const kata = teks.split(' ');
  const out: string[] = [];
  let kini = '';
  for (const k of kata) {
    if ((kini + ' ' + k).trim().length > maks && kini) {
      out.push(kini.trim());
      kini = k;
    } else {
      kini = (kini + ' ' + k).trim();
    }
  }
  if (kini) out.push(kini);
  return out;
}

const Teks: React.FC<{
  x: number;
  y: number;
  isi: string;
  maks: number;
  warna?: string;
  tebal?: boolean;
  saiz?: number;
}> = ({ x, y, isi, maks, warna = WARNA.tinta, tebal = false, saiz = 12.5 }) => {
  const l = baris(isi, maks);
  const mulai = y - ((l.length - 1) * (saiz + 2)) / 2;
  return (
    <text
      x={x}
      y={mulai}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={warna}
      fontSize={saiz}
      fontWeight={tebal ? 700 : 400}
      fontFamily="Archivo, system-ui, sans-serif"
    >
      {l.map((b, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : saiz + 2}>
          {b}
        </tspan>
      ))}
    </text>
  );
};

const Panah: React.FC<{ id: string; x1: number; y1: number; x2: number; y2: number }> = ({
  id,
  x1,
  y1,
  x2,
  y2,
}) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={WARNA.garis}
    strokeWidth={1.25}
    markerEnd={`url(#${id})`}
  />
);

const DiagramAlir: React.FC<{
  id: string;
  langkah: Langkah[];
  /** Label untuk cabang "tidak" pada keputusan terakhir. */
  akhir?: string;
}> = ({ id, langkah, akhir }) => {
  const kini: string[] = [];
  let y = 26;

  const simpul: React.ReactNode[] = [];
  const panah: React.ReactNode[] = [];
  const keluaran: React.ReactNode[] = [];

  const gambarSimpul = (l: Extract<Langkah, { bentuk: BentukSimpul }>, atas: number): number => {
    const duaBaris = !!l.ket;
    const h = duaBaris ? TINGGI_SIMPUL_DUA : TINGGI_SIMPUL;
    const x = SPINE - LEBAR_SIMPUL / 2;
    const tengah = atas + h / 2;
    const gelap = l.bentuk === 'terminator';

    if (l.bentuk === 'terminator') {
      simpul.push(
        <rect key={`r${atas}`} x={x} y={atas} width={LEBAR_SIMPUL} height={h} rx={h / 2} fill={WARNA.papan} />
      );
    } else if (l.bentuk === 'simpan') {
      simpul.push(
        <g key={`r${atas}`}>
          <rect x={x} y={atas} width={LEBAR_SIMPUL} height={h} rx={4} fill={WARNA.kertas} stroke={WARNA.garis} strokeWidth={1.25} />
          <line x1={x + 16} y1={atas} x2={x + 16} y2={atas + h} stroke={WARNA.garisTipis} strokeWidth={1.25} />
        </g>
      );
    } else if (l.bentuk === 'dokumen') {
      const b = h - 10;
      simpul.push(
        <path
          key={`r${atas}`}
          d={`M${x},${atas} H${x + LEBAR_SIMPUL} V${atas + b} q${-LEBAR_SIMPUL / 4},10 ${-LEBAR_SIMPUL / 2},0 q${-LEBAR_SIMPUL / 4},-10 ${-LEBAR_SIMPUL / 2},0 Z`}
          fill={WARNA.kertas}
          stroke={WARNA.garis}
          strokeWidth={1.25}
        />
      );
    } else {
      simpul.push(
        <rect key={`r${atas}`} x={x} y={atas} width={LEBAR_SIMPUL} height={h} rx={4} fill={WARNA.kertas} stroke={WARNA.garis} strokeWidth={1.25} />
      );
    }

    if (duaBaris) {
      simpul.push(
        <Teks key={`t1${atas}`} x={SPINE} y={tengah - 11} isi={l.judul} maks={48} tebal warna={gelap ? WARNA.kapur : WARNA.tinta} />
      );
      simpul.push(
        <Teks key={`t2${atas}`} x={SPINE} y={tengah + 12} isi={l.ket!} maks={62} warna={gelap ? '#b8b199' : WARNA.tintaMuted} saiz={11.5} />
      );
    } else {
      simpul.push(
        <Teks key={`t1${atas}`} x={SPINE} y={tengah} isi={l.judul} maks={56} tebal warna={gelap ? WARNA.kapur : WARNA.tinta} />
      );
    }
    return h;
  };

  for (let i = 0; i < langkah.length; i++) {
    const l = langkah[i];
    const adaBerikut = i < langkah.length - 1;

    if (l.bentuk === 'keputusan') {
      const atas = y;
      const tengah = atas + TINGGI_BELAH / 2;
      const kiri = SPINE - LEBAR_BELAH / 2;
      const kanan = SPINE + LEBAR_BELAH / 2;

      if (i > 0) panah.push(<Panah key={`p${i}`} id={id} x1={SPINE} y1={atas - JARAK} x2={SPINE} y2={atas} />);

      simpul.push(
        <polygon
          key={`d${i}`}
          points={`${SPINE},${atas} ${kanan},${tengah} ${SPINE},${atas + TINGGI_BELAH} ${kiri},${tengah}`}
          fill={WARNA.kertas}
          stroke={WARNA.garis}
          strokeWidth={1.25}
        />
      );
      simpul.push(<Teks key={`dt${i}`} x={SPINE} y={tengah} isi={l.judul} maks={30} tebal saiz={11.5} />);

      // Keluar ke kanan menuju tingkat hasil
      panah.push(<Panah key={`pe${i}`} id={id} x1={kanan} y1={tengah} x2={X_KELUAR} y2={tengah} />);
      simpul.push(
        <Teks key={`ya${i}`} x={(kanan + X_KELUAR) / 2} y={tengah - 12} isi="Ya" maks={10} tebal warna={WARNA.tintaMuted} saiz={11.5} />
      );
      keluaran.push(
        <g key={`k${i}`}>
          <rect x={X_KELUAR} y={tengah - 26} width={LEBAR_KELUAR} height={52} rx={4} fill={WARNA.papan} />
          <Teks x={X_KELUAR + LEBAR_KELUAR / 2} y={l.yaKet ? tengah - 6 : tengah} isi={l.ya} maks={44} tebal warna={WARNA.kapur} />
          {l.yaKet && (
            <Teks x={X_KELUAR + LEBAR_KELUAR / 2} y={tengah + 12} isi={l.yaKet} maks={50} warna="#b8b199" saiz={11} />
          )}
        </g>
      );

      if (adaBerikut) {
        panah.push(<Panah key={`pt${i}`} id={id} x1={SPINE} y1={atas + TINGGI_BELAH} x2={SPINE} y2={atas + TINGGI_BELAH + JARAK} />);
        simpul.push(
          <Teks key={`td${i}`} x={SPINE + 26} y={atas + TINGGI_BELAH + JARAK / 2} isi="Tidak" maks={10} tebal warna={WARNA.tintaMuted} saiz={11.5} />
        );
      }
      y = atas + TINGGI_BELAH + JARAK;
      kini.push('keputusan');
    } else {
      const h = l.ket ? TINGGI_SIMPUL_DUA : TINGGI_SIMPUL;
      if (i > 0 && kini[kini.length - 1] !== 'keputusan') {
        panah.push(<Panah key={`p${i}`} id={id} x1={SPINE} y1={y - JARAK} x2={SPINE} y2={y} />);
      } else if (i > 0 && kini[kini.length - 1] === 'keputusan') {
        // Sudah digambar oleh cabang "Tidak" keputusan sebelumnya.
      }
      gambarSimpul(l, y);
      y += h + JARAK;
      kini.push('simpul');
    }
  }

  // Simpul penutup kalau langkah terakhir adalah keputusan
  if (akhir && kini[kini.length - 1] === 'keputusan') {
    const atas = y;
    panah.push(<Panah key="pakhir" id={id} x1={SPINE} y1={atas - JARAK} x2={SPINE} y2={atas} />);
    simpul.push(<rect key="rakhir" x={SPINE - LEBAR_SIMPUL / 2} y={atas} width={LEBAR_SIMPUL} height={TINGGI_SIMPUL} rx={4} fill={WARNA.kertas} stroke={WARNA.garis} strokeWidth={1.25} />);
    simpul.push(<Teks key="takhir" x={SPINE} y={atas + TINGGI_SIMPUL / 2} isi={akhir} maks={54} tebal />);
    y += TINGGI_SIMPUL + 20;
  }

  const H = y + 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Diagram alir ${id}`}>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={WARNA.garis} />
        </marker>
      </defs>
      {panah}
      {simpul}
      {keluaran}
    </svg>
  );
};

/* ============================== DIAGRAM ================================== */

export const ALUR_PENGGUNA: Langkah[] = [
  { bentuk: 'terminator', judul: 'Petugas gizi membuka aplikasi' },
  { bentuk: 'proses', judul: 'Masuk dengan surel & sandi', ket: 'Sesi disimpan di peramban; superadmin dapat masuk cepat' },
  { bentuk: 'proses', judul: 'Memilih seksi Triase Prioritas' },
  { bentuk: 'proses', judul: 'Menyaring daftar', ket: 'Jumlah baris, status gizi, atau mencari kode / nama balita' },
  { bentuk: 'dokumen', judul: 'Membaca daftar peringkat', ket: 'Goresan menunjukkan skor 1–5 tiap kriteria; tingkat klinis di kanan' },
  { bentuk: 'proses', judul: 'Membuka Rincian balita', ket: 'Nilai tujuh kriteria, tingkat dasar, dan tindakan yang disarankan' },
  { bentuk: 'keputusan', judul: 'Perlu tindak lanjut lapangan?', ya: 'Tindak lanjut', yaKet: 'Rujuk / kunjungan rumah / PMT' },
  { bentuk: 'proses', judul: 'Mengekspor hasil ke Excel', ket: 'Berisi langkah perhitungan, bobot terkunci, dan jejak audit' },
  { bentuk: 'terminator', judul: 'Selesai' },
];

export const ALUR_SISTEM: Langkah[] = [
  { bentuk: 'terminator', judul: 'Permintaan dari peramban' },
  { bentuk: 'proses', judul: 'Laravel memeriksa sesi', ket: 'Tanpa sesi sah, permintaan ditolak dan diarahkan ke halaman masuk' },
  { bentuk: 'proses', judul: 'Memuat definisi kriteria & matriks', ket: 'KriteriaDefinition adalah sumber kebenaran tunggal' },
  { bentuk: 'proses', judul: 'Menghitung bobot dengan Fuzzy AHP', ket: 'Buckley 1985, dari matriks perbandingan berpasangan pakar' },
  { bentuk: 'keputusan', judul: 'CR di bawah 0,10?', ya: 'Bobot dipakai', yaKet: 'CR 0,007887 — konsisten' },
  { bentuk: 'simpan', judul: 'Membaca dataset balita dummy', ket: 'dataset/dummy_balita_7kriteria.csv — 120 balita, 7 kriteria' },
  { bentuk: 'proses', judul: 'MOORA menghitung skor tiap balita', ket: 'Normalisasi vektor, dikali bobot terkunci, lalu dijumlahkan' },
  { bentuk: 'proses', judul: 'Aturan triase klinis menentukan tingkat', ket: 'Tingkat diambil dari aturan, BUKAN dari skor' },
  { bentuk: 'proses', judul: 'Menyusun peringkat & menandai data kurang', ket: 'Data di bawah 5 dari 7 kriteria ditandai perlu verifikasi' },
  { bentuk: 'dokumen', judul: 'Respons JSON ke peramban' },
  { bentuk: 'terminator', judul: 'Selesai' },
];

export const ALUR_AHP: Langkah[] = [
  { bentuk: 'terminator', judul: 'Matriks perbandingan berpasangan 7×7', ket: undefined },
  { bentuk: 'dokumen', judul: 'Masukan: penilaian pakar pada skala Saaty 1–9', ket: 'Ditulis tetap sebagai data; a(i,j) × a(j,i) = 1' },
  { bentuk: 'proses', judul: 'Fuzzifikasi tiap sel menjadi bilangan segitiga', ket: 'TFN(v−1, v, v+1) dijepit ke [1,9]; resiprokal dibalik jadi (1/u, 1/m, 1/l)' },
  { bentuk: 'proses', judul: 'Rata-rata geometrik tiap baris', ket: 'Menghasilkan TFN baris r(i) = (l, m, u)' },
  { bentuk: 'proses', judul: 'Bobot fuzzy tiap kriteria', ket: 'w(i) = r(i) ⊗ (Σ r)^−1 — pembagian TFN' },
  { bentuk: 'proses', judul: 'Defuzzifikasi graded mean', ket: 'w = (l + 4m + u) / 6' },
  { bentuk: 'proses', judul: 'Normalisasi supaya total = 1', ket: 'C1 35,07% · C3 22,76% · C4 14,61% · C2 = C6 8,71% · C5 = C7 5,08%' },
  { bentuk: 'proses', judul: 'Uji konsistensi pada matriks tegas', ket: 'λmaks 7,062469 · CI 0,010411 · RI 1,32 · CR 0,007887' },
  { bentuk: 'keputusan', judul: 'CR < 0,10?', ya: 'Bobot sah dipakai', yaKet: 'Perbandingan pakar konsisten' },
  { bentuk: 'proses', judul: 'Matriks ditinjau ulang', ket: 'Perbandingan yang tidak konsisten harus diperbaiki sebelum dipakai' },
  { bentuk: 'terminator', judul: 'Selesai' },
];

export const ALUR_MOORA: Langkah[] = [
  { bentuk: 'terminator', judul: 'Matriks keputusan 120 × 7' },
  { bentuk: 'dokumen', judul: 'Nilai tiap balita pada tujuh kriteria', ket: 'Skala ordinal 1–5 hasil fuzzifikasi; sel kosong dibiarkan kosong' },
  { bentuk: 'proses', judul: 'Normalisasi vektor Euclidean', ket: 'x*(i,j) = x(i,j) / √( Σ x(i,j)² )' },
  { bentuk: 'proses', judul: 'Mengalikan dengan bobot terkunci', ket: 'Bobot dari Fuzzy AHP; tidak ada redistribusi untuk sel kosong' },
  { bentuk: 'proses', judul: 'Menjumlahkan tiap baris', ket: 'Semua kriteria bertipe benefit, jadi tidak ada pengurangan' },
  { bentuk: 'dokumen', judul: 'Skor akhir Y(i) tiap balita' },
  { bentuk: 'proses', judul: 'Mengurutkan skor menurun', ket: 'Skor yang seri mendapat peringkat yang sama' },
  { bentuk: 'keputusan', judul: 'Data lengkap 7 kriteria?', ya: 'Tingkat klinis ditetapkan', yaKet: 'Lewat aturan triase' },
  { bentuk: 'proses', judul: 'Ditandai perlu verifikasi', ket: 'Tingkat TIDAK diturunkan — skornya lebih rendah secara wajar, bukan dihukum dua kali' },
  { bentuk: 'terminator', judul: 'Peringkat akhir' },
];

export const ALUR_TRIASE: Langkah[] = [
  { bentuk: 'terminator', judul: 'Nilai tujuh kriteria tersedia' },
  { bentuk: 'keputusan', judul: 'C1 = 5 (severely stunted)?', ya: 'Sangat Tinggi', yaKet: 'Tindakan: rujuk dokter spesialis anak & PMT' },
  { bentuk: 'keputusan', judul: 'C1 = 4 dan ≥2 kriteria lain ≥4?', ya: 'Sangat Tinggi', yaKet: 'Tindakan: rujuk dokter spesialis anak & PMT' },
  { bentuk: 'keputusan', judul: 'C1 = 4 (stunted)?', ya: 'Tinggi', yaKet: 'Tindakan: kunjungan rumah & konseling gizi' },
  { bentuk: 'keputusan', judul: 'C1 ≤ 3 dan ≥3 kriteria lain ≥4?', ya: 'Tinggi', yaKet: 'Tindakan: kunjungan rumah & konseling gizi' },
  { bentuk: 'keputusan', judul: 'C1 = 3 (normal)?', ya: 'Sedang', yaKet: 'Tindakan: pemantauan rutin Posyandu' },
  { bentuk: 'keputusan', judul: 'C1 ≤ 2 dan ≥2 kriteria lain ≥4?', ya: 'Sedang', yaKet: 'Tindakan: pemantauan rutin Posyandu' },
  { bentuk: 'keputusan', judul: '≥3 kriteria lain bernilai 3?', ya: 'Sedang', yaKet: 'Tindakan: pemantauan rutin Posyandu' },
];
export const AKHIR_TRIASE = 'Rendah — pemantauan rutin Posyandu';

export const ALUR_ARSITEKTUR: Langkah[] = [
  { bentuk: 'terminator', judul: 'Peramban petugas gizi' },
  { bentuk: 'proses', judul: 'Nginx menyajikan React SPA', ket: 'Port 3000 · React 19 + Vite + Tailwind CSS 4, font di-host sendiri' },
  { bentuk: 'proses', judul: 'Laravel REST API', ket: 'Port 8000 · PHP 8.2 · perutean /api/spk/*' },
  { bentuk: 'simpan', judul: 'MySQL 8.4', ket: 'Port 3307 · basis data spk_stunting · tabel bobot_kriteria_versi menyimpan versi bobot aktif' },
  { bentuk: 'simpan', judul: 'Redis 7', ket: 'Port 6380 · cache dan sesi' },
  { bentuk: 'dokumen', judul: 'Dataset CSV di dalam wadah', ket: 'Dipasang hanya-baca dari ../dataset — dimuat saat permintaan, tidak diubah sistem' },
  { bentuk: 'proses', judul: 'phpMyAdmin', ket: 'Port 8081 · pemeriksaan basis data saat sidang' },
  { bentuk: 'terminator', judul: 'Semua berjalan di Docker Compose', ket: undefined },
];

export const Diagram: React.FC<{ id: keyof typeof PETA }> = ({ id }) => {
  // Hanya diagram triase yang punya simpul penutup, jadi tipenya dilonggarkan
  // di sini alih-alih memaksa setiap entri PETA menuliskan akhir: undefined.
  const d = PETA[id] as { langkah: Langkah[]; akhir?: string };
  return <DiagramAlir id={id} langkah={d.langkah} akhir={d.akhir} />;
};

export const PETA = {
  'alur-pengguna': { langkah: ALUR_PENGGUNA, judul: 'Alur pengguna', ket: 'Yang dilakukan petugas gizi, dari masuk sampai mengekspor' },
  'alur-sistem': { langkah: ALUR_SISTEM, judul: 'Alur sistem', ket: 'Perjalanan satu permintaan di dalam aplikasi' },
  'alur-ahp': { langkah: ALUR_AHP, judul: 'Alur perhitungan AHP', ket: 'Dari matriks pakar sampai bobot tersahkan' },
  'alur-moora': { langkah: ALUR_MOORA, judul: 'Alur perhitungan MOORA', ket: 'Dari nilai kriteria sampai peringkat akhir' },
  'alur-triase': { langkah: ALUR_TRIASE, akhir: AKHIR_TRIASE, judul: 'Pohon keputusan triase klinis', ket: 'Delapan aturan diperiksa berurutan; aturan pertama yang cocok menentukan tingkat' },
  'alur-arsitektur': { langkah: ALUR_ARSITEKTUR, judul: 'Arsitektur & sebaran wadah', ket: 'Lima wadah Docker dan perannya' },
} as const;

export type IdDiagram = keyof typeof PETA;
