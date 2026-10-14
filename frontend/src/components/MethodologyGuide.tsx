import React, { useMemo, useState } from 'react';
import type { CalculationResult, Criterion, Alternative, AhpMatrixResponse } from '../types';
import { FUZZY_SUB_CRITERIA_DATA, SPK_WORKFLOW_STEPS } from '../utils/exportExcel';
import { Tally } from './papan';
import { ArrowRight, BookOpen, Network, Ruler, Workflow } from 'lucide-react';
import { Diagram, PETA, type IdDiagram } from './Diagram';

/* ============================================================================
   PANDUAN METODOLOGI & DOKUMENTASI AKADEMIK
   Dibangun dalam bahasa visual papan: tabel bernomor rapat, garis rambut,
   angka tabular, navigasi sub-tab responsif, dan dokumentasi matematis lengkap
   mencakup Fuzzy AHP Buckley, MOORA, sub-kriteria, dan diagram alir.
   ========================================================================== */

interface Props {
  criteria: Criterion[];
  balitas: Alternative[];
  result: CalculationResult | null;
  ahpData: AhpMatrixResponse | null;
}

type SubTab = 'alur' | 'diagram' | 'subkriteria' | 'rumus';

const SUB: { id: SubTab; label: string; ket: string; Ikon: typeof Workflow }[] = [
  { id: 'alur', label: 'Alur Perhitungan', ket: '7 Tahap Alur SPK', Ikon: Workflow },
  { id: 'diagram', label: 'Diagram Alir', ket: '6 Diagram Proses', Ikon: Network },
  { id: 'subkriteria', label: 'Sub-Kriteria & Kurva', ket: 'Himpunan Fuzzy 1–5', Ikon: Ruler },
  { id: 'rumus', label: 'Rumus & Aturan Triase', ket: 'Fuzzy AHP, MOORA, Klinis', Ikon: BookOpen },
];

const Judul: React.FC<{ children: React.ReactNode; ket?: string }> = ({ children, ket }) => (
  <div className="border-b border-rambut px-4 py-3.5 sm:px-6">
    <h3 className="font-display text-[15px] font-bold text-tinta-900">{children}</h3>
    {ket && <p className="mt-1 max-w-[76ch] text-xs leading-relaxed text-tinta-500">{ket}</p>}
  </div>
);

export const MethodologyGuide: React.FC<Props> = ({ criteria, balitas, result, ahpData }) => {
  const [sub, setSub] = useState<SubTab>('alur');
  const [diagramTerpilih, setDiagramTerpilih] = useState<IdDiagram>('alur-pengguna');

  const contoh = useMemo(() => balitas[0], [balitas]);

  const daftarDiagram = useMemo(() => Object.keys(PETA) as IdDiagram[], []);

  return (
    <div className="space-y-px bg-rambut">
      {/* ---------------------------------------------------------------- */}
      {/* PEMILIH SUB-SEKSI (TOP TAB BAR)                                  */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-wrap gap-2 border-b border-rambut bg-kertas-50 px-4 py-3 sm:px-6">
        {SUB.map((s) => {
          const aktif = sub === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSub(s.id)}
              aria-pressed={aktif}
              className={`inline-flex items-center gap-2.5 rounded border px-3.5 py-2 text-left transition-all ${
                aktif
                  ? 'border-papan-700 bg-papan-700 text-kapur-50 shadow-sm'
                  : 'border-rambut bg-kertas-100 text-tinta-700 hover:border-papan-400 hover:bg-kertas-50'
              }`}
            >
              <s.Ikon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>
                <span className="block text-xs font-bold leading-tight">{s.label}</span>
                <span
                  className={`block text-[11px] leading-tight ${
                    aktif ? 'text-kapur-300' : 'text-tinta-400'
                  }`}
                >
                  {s.ket}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 1. SUB-TAB: ALUR PERHITUNGAN                                      */}
      {/* ---------------------------------------------------------------- */}
      {sub === 'alur' && (
        <section className="bg-kertas-50">
          <Judul ket="Tujuh tahap sistematis dari pengumpulan data mentah balita hingga penentuan tindakan klinis triase. Tahap 1 sampai 4 menyiapkan dan memfuzzifikasi data, tahap 5 mengunci bobot pakar lewat Fuzzy AHP, sedangkan tahap 6 dan 7 menghitung skor MOORA dan tindakan rujukan klinis.">
            Tujuh Tahap Alur Proses SPK Triase Balita
          </Judul>

          <ol className="divide-y divide-rambut">
            {SPK_WORKFLOW_STEPS.map((t) => {
              // Tentukan kelompok fase
              let fase = 'Persiapan & Fuzzifikasi';
              let warnaFase = 'bg-slate-100 text-slate-700 border-slate-300';
              if (t.tahap === 5) {
                fase = 'Pembobotan Pakar (Fuzzy AHP)';
                warnaFase = 'bg-emerald-50 text-emerald-800 border-emerald-300';
              } else if (t.tahap >= 6) {
                fase = 'Skoring & Triase (MOORA)';
                warnaFase = 'bg-amber-50 text-amber-800 border-amber-300';
              }

              return (
                <li key={t.tahap} className="flex gap-4 px-4 py-4 sm:px-6">
                  <div className="flex w-9 shrink-0 flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-papan-100 font-display text-sm font-bold text-papan-800">
                      {t.tahap}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-bold text-tinta-900">{t.proses}</p>
                      <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${warnaFase}`}>
                        {fase}
                      </span>
                    </div>
                    <p className="mt-1 max-w-[80ch] text-xs leading-relaxed text-tinta-600">
                      {t.desc}
                    </p>
                    <div className="mt-2">
                      <span className="inline-block rounded border border-rambut bg-kertas-100 px-2.5 py-1 font-mono text-[11px] text-tinta-800">
                        {t.rumus}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 2. SUB-TAB: DIAGRAM ALIR                                          */}
      {/* ---------------------------------------------------------------- */}
      {sub === 'diagram' && (
        <section className="bg-kertas-50">
          <Judul ket="Enam diagram alir standar sistem: alur pengguna, alur proses sistem di server, alur perhitungan Fuzzy AHP, alur skoring MOORA, pohon keputusan triase klinis, dan arsitektur deployment Docker. Pilih diagram di bawah untuk menampilkan rinciannya.">
            Diagram Alir Proses & Arsitektur Sistem
          </Judul>

          {/* Diagram Selector Pills */}
          <div className="border-b border-rambut bg-kertas-100/60 px-4 py-2.5 sm:px-6">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-bold uppercase tracking-wider text-tinta-400">
                Pilih Diagram:
              </span>
              {daftarDiagram.map((id) => {
                const aktif = diagramTerpilih === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDiagramTerpilih(id)}
                    className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                      aktif
                        ? 'bg-papan-700 text-kapur-50 shadow-sm'
                        : 'border border-rambut bg-kertas-50 text-tinta-700 hover:border-papan-300 hover:bg-kertas-100'
                    }`}
                  >
                    {PETA[id].judul}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Diagram Viewer */}
          <div className="px-4 py-5 sm:px-6">
            <div className="border-b border-rambut pb-3">
              <h4 className="font-display text-[14px] font-bold text-tinta-900">
                {PETA[diagramTerpilih].judul}
              </h4>
              <p className="mt-0.5 text-xs text-tinta-500">
                {PETA[diagramTerpilih].ket}
              </p>
            </div>

            <div className="mt-4 overflow-x-auto rounded border border-rambut bg-kertas-50 p-4 sm:p-6">
              <div className="min-w-[720px] max-w-[920px] mx-auto">
                <Diagram id={diagramTerpilih} />
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-tinta-400">
              Keterangan bentuk flowchart: Kapsul (Mulai/Selesai) · Persegi panjang (Proses Komputasi) · Belah ketupat (Evaluasi Keputusan) · Dokumen (Masukan/Keluaran Berkas) · Silinder bersisi ganda (Penyimpanan Data).
            </p>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 3. SUB-TAB: SUB-KRITERIA FUZZY                                    */}
      {/* ---------------------------------------------------------------- */}
      {sub === 'subkriteria' && (
        <section className="bg-kertas-50">
          <Judul ket="Setiap kriteria memiliki lima himpunan linguistik pada skala ordinal 1–5 (1 = Optimal / Risiko Rendah, 5 = Kritis / Risiko Sangat Tinggi). Skala telah diselaraskan bertipe benefit terhadap urgensi intervensi klinis: semakin tinggi nilai, semakin mendesak untuk ditangani.">
            Himpunan Linguistik Sub-Kriteria & Fungsi Keanggotaan Fuzzy
          </Judul>

          {FUZZY_SUB_CRITERIA_DATA.map((grup) => {
            const kode = grup.variabel.split(':')[0].trim();
            const nama = grup.variabel.split(':').slice(1).join(':').trim();
            const infoKriteria = criteria.find((c) => c.code === kode);

            return (
              <div key={grup.variabel} className="border-b border-rambut last:border-0">
                {/* Header Kriteria */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rambut bg-kertas-100 px-4 py-2.5 sm:px-6">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-8 items-center justify-center rounded bg-papan-700 font-display text-xs font-bold text-kapur-50">
                      {kode}
                    </span>
                    <span className="text-xs font-bold text-tinta-900">{nama}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    {infoKriteria?.tier && (
                      <span className="rounded bg-papan-100 px-2 py-0.5 font-bold text-papan-800">
                        Tier {infoKriteria.tier}
                      </span>
                    )}
                    {infoKriteria?.jalur && (
                      <span className="rounded border border-rambut bg-kertas-50 px-2 py-0.5 text-tinta-600">
                        Jalur {infoKriteria.jalur}
                      </span>
                    )}
                    {infoKriteria?.weight && (
                      <span className="tnum font-bold text-papan-700">
                        Bobot {(infoKriteria.weight * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabel Sub-Kriteria */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-xs">
                    <thead>
                      <tr className="border-b border-rambut bg-kertas-50 text-[11px] text-tinta-500">
                        <th className="px-4 py-2 text-left font-bold w-16">Skor</th>
                        <th className="px-3 py-2 text-left font-bold w-48">Himpunan Linguistik</th>
                        <th className="px-3 py-2 text-left font-bold w-56">Rentang Klinis Asli</th>
                        <th className="px-3 py-2 text-left font-bold w-36">Kurva Fuzzy</th>
                        <th className="px-3 py-2 text-left font-bold w-36">Domain [a,b,c,d]</th>
                        <th className="px-4 py-2 text-left font-bold">Penjelasan Operasional</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rambut">
                      {grup.subCriteria.map((s) => (
                        <tr key={s.skor} className="hover:bg-kertas-100/50">
                          <td className="px-4 py-2.5 align-top">
                            <span className="inline-flex items-center gap-2">
                              <span className="tnum font-bold text-tinta-900">{s.skor}</span>
                              <span className="text-papan-600">
                                <Tally skor={s.skor} ukuran="sm" />
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-top font-semibold text-tinta-900">
                            {s.himpunan}
                          </td>
                          <td className="px-3 py-2.5 align-top text-tinta-700 font-medium">
                            {s.range}
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className="inline-block rounded border border-rambut bg-kertas-100 px-2 py-0.5 text-[11px] text-tinta-700">
                              {s.jenis}
                            </span>
                          </td>
                          <td className="tnum px-3 py-2.5 align-top font-mono text-[11px] text-papan-700">
                            {s.domain}
                          </td>
                          <td className="px-4 py-2.5 align-top text-xs text-tinta-500 leading-relaxed">
                            {s.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {contoh && (
            <div className="border-t border-rambut bg-kertas-100 px-4 py-3 text-xs text-tinta-600 sm:px-6">
              Contoh nilai balita pertama pada kohort ini:{' '}
              <span className="font-bold text-tinta-900">{contoh.name || contoh.id}</span> &rarr;{' '}
              {criteria
                .filter((c) => typeof contoh.values?.[c.code] === 'number')
                .map((c) => `${c.code}=${contoh.values[c.code]}`)
                .join(' · ')}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 4. SUB-TAB: RUMUS MATEMATIKA & ATURAN TRIASE                     */}
      {/* ---------------------------------------------------------------- */}
      {sub === 'rumus' && (
        <div className="space-y-px bg-rambut">
          {/* BAGIAN A: FUZZY AHP BUCKLEY (1985) */}
          <section className="bg-kertas-50">
            <Judul ket="Tahapan matematis lengkap Fuzzy AHP Buckley (1985) yang digunakan untuk menentukan bobot kepentingan kriteria berdasarkan matriks perbandingan berpasangan pakar gizi.">
              Metode Pembobotan Kriteria: Fuzzy AHP (Buckley 1985)
            </Judul>
            <div className="divide-y divide-rambut">
              {[
                {
                  no: '1',
                  nama: 'Fuzzifikasi Matriks Saaty ke Bilangan Fuzzy Segitiga (TFN)',
                  rumus: 'a_ij = (l_ij, m_ij, u_ij) = (v - 1, v, v + 1);  a_ji = (1/u_ij, 1/m_ij, 1/l_ij)',
                  ket: 'Nilai perbandingan berpasangan tegas v dikonversi menjadi Triangular Fuzzy Number (TFN) untuk mengakomodasi ketidakpastian persepsi pakar.',
                },
                {
                  no: '2',
                  nama: 'Perhitungan Rata-Rata Geometrik Fuzzy (Fuzzy Geometric Mean)',
                  rumus: 'r_i = (Π_j=1..n a_ij)^(1/n) = ( (Π l)^(1/n), (Π m)^(1/n), (Π u)^(1/n) )',
                  ket: 'Dihitung untuk setiap baris kriteria menggunakan akar pangkat n (n = 7).',
                },
                {
                  no: '3',
                  nama: 'Penjumlahan Vektor r_i dan Invers Penjumlahan',
                  rumus: '(Σ r_i)^(-1) = ( 1 / Σ u_i, 1 / Σ m_i, 1 / Σ l_i )',
                  ket: 'Batas bawah dan atas dibalik saat melakukan operasi invers matematis bilangan fuzzy.',
                },
                {
                  no: '4',
                  nama: 'Perhitungan Bobot Fuzzy Setiap Kriteria',
                  rumus: 'w_i = r_i ⊗ (Σ r_i)^(-1) = ( r_i,l × inv_l, r_i,m × inv_m, r_i,u × inv_u )',
                  ket: 'Menghasilkan bobot fuzzy segitiga relatif untuk setiap kriteria C1 s.d. C7.',
                },
                {
                  no: '5',
                  nama: 'Defuzzifikasi Centroid (Rata-Rata Segitiga)',
                  rumus: 'M_i = ( l_i + m_i + u_i ) / 3',
                  ket: 'Mengubah bobot fuzzy menjadi nilai tegas (crisp) menggunakan metode titik tengah rata-rata segitiga yang baku.',
                },
                {
                  no: '6',
                  nama: 'Normalisasi Bobot Akhir',
                  rumus: 'W_i = M_i / ( Σ_k=1..n M_k )   ->   Σ W_i = 1,0000 (100%)',
                  ket: 'Menghasilkan bobot akhir: C1=34,49%, C3=22,82%, C4=14,79%, C2=8,77%, C6=8,77%, C5=5,17%, C7=5,17%.',
                },
                {
                  no: '7',
                  nama: 'Uji Rasio Konsistensi Matriks Tegas (Saaty)',
                  rumus: 'CI = (λmaks - n) / (n - 1);   CR = CI / RI < 0,10',
                  ket: ahpData
                    ? `Pada matriks pakar n=7: λmaks = ${ahpData.ahp_result.lambda_max.toFixed(4)}, CI = ${ahpData.ahp_result.consistency_index.toFixed(4)}, RI = ${ahpData.ahp_result.random_index} -> CR = ${ahpData.ahp_result.consistency_ratio.toFixed(4)} < 0,10 (${ahpData.ahp_result.is_valid ? 'KONSISTEN & VALID' : 'TIDAK KONSISTEN'}).`
                    : 'Pada matriks pakar n=7: λmaks = 7,0625, CI = 0,0104, RI = 1,32 -> CR = 0,0079 < 0,10 (KONSISTEN & VALID).',
                },
              ].map((item) => (
                <div key={item.no} className="flex gap-4 px-4 py-3.5 sm:px-6">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-papan-100 font-display text-xs font-bold text-papan-800">
                    {item.no}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-tinta-900">{item.nama}</p>
                    <p className="mt-1 inline-block rounded border border-rambut bg-kertas-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-papan-700">
                      {item.rumus}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-tinta-500">{item.ket}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* BAGIAN B: METODE SKORING MOORA */}
          <section className="bg-kertas-50">
            <Judul ket="Multi-Objective Optimization on the basis of Ratio Analysis (MOORA). Seluruh kriteria bertipe benefit karena fuzzifikasi telah membalik indikator menjadi skor urgensi intervensi.">
              Metode Perangkingan: MOORA (Ratio System)
            </Judul>
            <div className="divide-y divide-rambut">
              {[
                {
                  n: 1,
                  judul: 'Normalisasi Matriks Rasio (Vektor Euclidean)',
                  rumus: 'r_ij = x_ij / √( Σ_i=1..m x_ij² )',
                  ket: 'Setiap nilai alternatif dibagi akar jumlah kuadrat kriteria tersebut pada seluruh populasi aktif.',
                },
                {
                  no: 2,
                  judul: 'Perhitungan Nilai Optimasi / Skor Akhir Terbobot',
                  rumus: 'y_i = Σ_j=1..n ( w_j × r_ij )',
                  ket: 'Bobot W_j dari Fuzzy AHP dikalikan dengan matriks ternormalisasi r_ij. Karena seluruh kriteria bertipe benefit, tidak ada pengurangan suku cost.',
                },
                {
                  no: 3,
                  judul: 'Perangkingan Prioritas (Ranking)',
                  rumus: 'Rank = Urut Menurun (Descending) y_i',
                  ket: 'Balita dengan skor tertinggi y_i berada pada Peringkat 1 (paling mendesak untuk ditindaklanjuti).',
                },
              ].map((b) => (
                <div key={b.judul} className="flex gap-4 px-4 py-3.5 sm:px-6">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 font-display text-xs font-bold text-amber-900">
                    {b.no || 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-tinta-900">{b.judul}</p>
                    <p className="mt-1 inline-block rounded border border-rambut bg-kertas-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-papan-700">
                      {b.rumus}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-tinta-500">{b.ket}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* BAGIAN C: ATURAN TRIASE KLINIS */}
          <section className="bg-kertas-50">
            <Judul ket="Tingkat prioritas klinis ditetapkan berdasarkan kondisi absolut anak itu sendiri, BUKAN dari persentil atau posisi di dalam kohort. Hal ini mencegah terjadinya vonis salah jika kohort mayoritas sehat.">
              Aturan Triase Klinis & Rekomendasi Tindakan
            </Judul>
            <div className="divide-y divide-rambut">
              {[
                {
                  tingkat: 'Sangat Tinggi',
                  warna: 'text-red-700 bg-red-50 border-red-200',
                  aturan: 'C1 = 5 (Severely Stunted) ATAU (C1 = 4 dan ≥ 2 kriteria lain ≥ 4)',
                  tindakan: 'Rujuk Dokter Spesialis Anak & PMT Pemulihan Segera',
                  goresan: 5,
                },
                {
                  tingkat: 'Tinggi',
                  warna: 'text-orange-700 bg-orange-50 border-orange-200',
                  aturan: 'C1 = 4 (Stunted) ATAU (C1 ≤ 3 dan ≥ 3 kriteria lain ≥ 4)',
                  tindakan: 'Kunjungan Rumah Kader & Konseling Gizi Intensif',
                  goresan: 4,
                },
                {
                  tingkat: 'Sedang',
                  warna: 'text-yellow-700 bg-yellow-50 border-yellow-200',
                  aturan: 'C1 = 3 (Waspada KMS) ATAU (C1 ≤ 2 dan ≥ 2 kriteria ≥ 4) ATAU (≥ 3 kriteria = 3)',
                  tindakan: 'Pemantauan Rutin Posyandu & Suplementasi Vitamin',
                  goresan: 3,
                },
                {
                  tingkat: 'Rendah',
                  warna: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                  aturan: 'Selain kondisi di atas (Kondisi Gizi Baik / Optimal)',
                  tindakan: 'Pemeliharaan Pola Asuh & Penimbangan Teratur Posyandu',
                  goresan: 2,
                },
              ].map((t) => (
                <div key={t.tingkat} className="flex items-start gap-4 px-4 py-3.5 sm:px-6 hover:bg-kertas-100/40">
                  <span className="shrink-0 pt-0.5 text-papan-600">
                    <Tally skor={t.goresan} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-tinta-900">{t.tingkat}</p>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${t.warna}`}>
                        Skor Tally {t.goresan}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-tinta-700 font-medium">{t.aturan}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-tinta-500">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-papan-600" strokeWidth={1.75} />
                      <span className="font-semibold text-papan-800">{t.tindakan}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="border-t border-rambut bg-kertas-100 px-4 py-3 text-xs leading-relaxed text-tinta-500 sm:px-6">
              Balita dengan data kelengkapan &lt; 5 dari 7 kriteria diberi penanda{' '}
              <span className="font-bold text-amber-900">Perlu Verifikasi Lapangan</span> agar kader melakukan validasi KMS langsung tanpa menurunkan tingkat risiko anak secara sepihak.
            </p>
          </section>

          {/* BAGIAN D: BOBOT TERKUNCI */}
          <section className="bg-papan-800 px-4 py-4 text-kapur-100 sm:px-6">
            <p className="max-w-[78ch] text-xs leading-relaxed text-kapur-200">
              Tujuh kriteria beroperasi dengan <strong className="font-bold text-kapur-50">bobot terkunci hasil Fuzzy AHP</strong>. Bobot tidak diredistribusi saat ada data kosong demi menjaga objektivitas dan konsistensi perhitungan perankingan MOORA.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              {criteria.map((c) => (
                <span
                  key={c.code}
                  className="inline-flex items-center gap-2 text-xs text-kapur-200"
                >
                  <span className="text-kapur-50">
                    <Tally skor={Math.max(1, Math.round(c.weight * 20))} ukuran="sm" />
                  </span>
                  <span className="font-bold text-kapur-50">{c.code}</span>
                  <span className="tnum font-semibold">{(c.weight * 100).toFixed(2)}%</span>
                </span>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* FOOTER INFORMASI STATUS KOHORT */}
      {result && (
        <div className="bg-kertas-100 px-4 py-3 text-xs text-tinta-500 sm:px-6 flex flex-wrap items-center justify-between gap-2 border-t border-rambut">
          <div>
            Kohort aktif:{' '}
            <span className="tnum font-bold text-tinta-900">{result.rankings.length}</span> balita
            sedang dinilai dengan metode <span className="font-bold text-papan-700">MOORA</span> dan
            pembobotan <span className="font-bold text-papan-700">Fuzzy AHP (Buckley 1985)</span>.
          </div>
          <div className="text-[11px] text-tinta-400">
            Sumber Kebenaran Tunggal: KriteriaDefinition.php
          </div>
        </div>
      )}
    </div>
  );
};
