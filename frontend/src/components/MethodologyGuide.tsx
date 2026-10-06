import React, { useMemo, useState } from 'react';
import type { CalculationResult, Criterion, Alternative, AhpMatrixResponse } from '../types';
import { FUZZY_SUB_CRITERIA_DATA, SPK_WORKFLOW_STEPS } from '../utils/exportExcel';
import { Tally } from './papan';
import { ArrowRight, BookOpen, Network, Ruler, Workflow } from 'lucide-react';
import { Diagram, PETA, type IdDiagram } from './Diagram';

/* ============================================================================
   PANDUAN METODOLOGI
   Dibangun ulang dalam bahasa visual papan: tabel bernomor rapat, garis rambut,
   angka tabular, tanpa cangkang kartu. Sub-tab pembobotan AHP sengaja DIHAPUS —
   isinya kini ada di seksi "Bukti Perhitungan", yang membaca angka yang sama
   dari server, sehingga tidak ada dua tempat yang bisa saling menyimpang.
   ========================================================================== */

interface Props {
  criteria: Criterion[];
  balitas: Alternative[];
  result: CalculationResult | null;
  ahpData: AhpMatrixResponse | null;
}

type SubTab = 'alur' | 'diagram' | 'subkriteria' | 'rumus';

const SUB: { id: SubTab; label: string; ket: string; Ikon: typeof Workflow }[] = [
  { id: 'alur', label: 'Alur perhitungan', ket: 'Tujuh tahap', Ikon: Workflow },
  { id: 'diagram', label: 'Diagram alir', ket: 'Enam diagram', Ikon: Network },
  { id: 'subkriteria', label: 'Sub-kriteria fuzzy', ket: 'Domain & kurva', Ikon: Ruler },
  { id: 'rumus', label: 'Rumus & aturan triase', ket: 'MOORA dan tingkat klinis', Ikon: BookOpen },
];

const Judul: React.FC<{ children: React.ReactNode; ket?: string }> = ({ children, ket }) => (
  <div className="border-b border-rambut px-4 py-3 sm:px-5">
    <h3 className="font-display text-[15px] font-bold text-tinta-900">{children}</h3>
    {ket && <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-tinta-500">{ket}</p>}
  </div>
);

export const MethodologyGuide: React.FC<Props> = ({ criteria, balitas, result }) => {
  const [sub, setSub] = useState<SubTab>('alur');

  const contoh = useMemo(() => balitas[0], [balitas]);

  return (
    <div className="space-y-px bg-rambut">
      {/* Pemilih sub-seksi: kontrol web standar. */}
      <div className="flex flex-wrap gap-2 bg-kertas-50 px-4 py-3 sm:px-5">
        {SUB.map((s) => {
          const aktif = sub === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSub(s.id)}
              aria-pressed={aktif}
              className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-left transition-colors ${
                aktif
                  ? 'border-papan-700 bg-papan-700 text-kapur-50'
                  : 'border-rambut bg-kertas-100 text-tinta-700 hover:border-papan-300'
              }`}
            >
              <s.Ikon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>
                <span className="block text-xs font-bold leading-tight">{s.label}</span>
                <span
                  className={`block text-xs leading-tight ${
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
      {/* ALUR                                                              */}
      {/* ---------------------------------------------------------------- */}
      {sub === 'alur' && (
        <section className="bg-kertas-50">
          <Judul ket="Tujuh tahap dari data mentah sampai tindakan klinis. Tahap 1 sampai 4 menyiapkan data, tahap 5 mengunci bobot, tahap 6 dan 7 mengubah bobot itu menjadi urutan dan tindakan.">
            Alur perhitungan
          </Judul>
          <ol className="divide-y divide-rambut">
            {SPK_WORKFLOW_STEPS.map((t) => (
              <li key={t.tahap} className="flex gap-4 px-4 py-3.5 sm:px-5">
                <span className="w-8 shrink-0 font-display text-xl font-bold leading-none text-papan-700">
                  {t.tahap}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-tinta-900">{t.proses}</p>
                  <p className="mt-1 max-w-[76ch] text-xs leading-relaxed text-tinta-500">
                    {t.desc}
                  </p>
                  <p className="mt-1.5 inline-block rounded border border-rambut bg-kertas-100 px-2 py-1 text-xs text-tinta-700">
                    {t.rumus}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* SUB-KRITERIA                                                      */}
      {/* ---------------------------------------------------------------- */}
      {sub === 'diagram' && (
        <section className="space-y-9">
          <Judul ket="Enam diagram: alur pengguna, alur sistem, dua alur perhitungan, pohon keputusan triase klinis, dan arsitektur wadah. Semua digambar dari kode yang benar-benar berjalan, bukan dari rancangan di atas kertas.">
            Diagram alir
          </Judul>

          {(Object.keys(PETA) as IdDiagram[]).map((id) => (
            <figure key={id} className="m-0">
              <figcaption>
                <h3 className="text-[13px] font-bold text-tinta-900">{PETA[id].judul}</h3>
                <p className="mt-0.5 max-w-[62ch] text-xs leading-relaxed text-tinta-500">{PETA[id].ket}</p>
              </figcaption>
              <div className="mt-3 border-y border-rambut bg-kertas-50 py-5">
                <div className="min-w-[680px]">
                  <Diagram id={id} />
                </div>
              </div>
            </figure>
          ))}

          <p className="max-w-[76ch] text-xs leading-relaxed text-tinta-500">
            Bentuk simpul mengikuti baku flowchart: kapsul untuk mulai dan selesai, persegi
            untuk proses, belah ketupat untuk keputusan, dokumen untuk keluaran, dan persegi
            bersisi ganda untuk simpanan data. Keputusan dibedakan lewat bentuk, bukan warna,
            supaya maknanya tetap terbaca tanpa warna sekalipun.
          </p>
        </section>
      )}
      {sub === 'subkriteria' && (
        <section className="bg-kertas-50">
          <Judul ket="Setiap kriteria punya lima himpunan linguistik pada skala ordinal 1–5, masing-masing dengan rentang satuan asli dan domain kurva keanggotaannya. Skala ini sudah dibalik menjadi tingkat urgensi, sehingga seluruh kriteria bersifat benefit: makin tinggi, makin mendesak.">
            Sub-kriteria dan fungsi keanggotaan fuzzy
          </Judul>

          {FUZZY_SUB_CRITERIA_DATA.map((grup) => (
            <div key={grup.variabel} className="border-b border-rambut last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-kertas-100 px-4 py-2.5 sm:px-5">
                <span className="font-display text-xs font-bold text-papan-700">
                  {grup.variabel.split(':')[0]}
                </span>
                <span className="text-xs font-semibold text-tinta-900">
                  {grup.variabel.split(':').slice(1).join(':').trim()}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-xs">
                  <thead>
                    <tr className="border-b border-rambut">
                      <th className="px-3 py-2 text-left font-bold text-tinta-500">Skor</th>
                      <th className="px-3 py-2 text-left font-bold text-tinta-500">Himpunan</th>
                      <th className="px-3 py-2 text-left font-bold text-tinta-500">
                        Rentang satuan asli
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-tinta-500">Kurva</th>
                      <th className="px-3 py-2 text-left font-bold text-tinta-500">Domain</th>
                      <th className="px-3 py-2 text-left font-bold text-tinta-500">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grup.subCriteria.map((s) => (
                      <tr key={s.skor} className="border-b border-rambut last:border-0">
                        <td className="px-3 py-2 align-top">
                          <span className="inline-flex items-center gap-2">
                            <span className="tnum w-3 font-bold text-tinta-900">{s.skor}</span>
                            <span className="text-papan-600">
                              <Tally skor={s.skor} ukuran="sm" />
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top font-semibold text-tinta-900">
                          {s.himpunan}
                        </td>
                        <td className="px-3 py-2 align-top text-tinta-700">{s.range}</td>
                        <td className="px-3 py-2 align-top text-tinta-500">{s.jenis}</td>
                        <td className="tnum px-3 py-2 align-top text-tinta-700">{s.domain}</td>
                        <td className="px-3 py-2 align-top text-tinta-500">{s.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {contoh && (
            <div className="border-t border-rambut bg-kertas-100 px-4 py-3 text-xs text-tinta-500 sm:px-5">
              Contoh penerapan pada balita pertama kohort ini:{' '}
              <span className="font-bold text-tinta-900">{contoh.id}</span> —{' '}
              {criteria
                .filter((c) => typeof contoh.values?.[c.code] === 'number')
                .map((c) => `${c.code}=${contoh.values[c.code]}`)
                .join(' · ')}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* RUMUS                                                             */}
      {/* ---------------------------------------------------------------- */}
      {sub === 'rumus' && (
        <>
          <section className="bg-kertas-50">
            <Judul ket="Semua kriteria bertipe benefit, karena fuzzifikasi sudah membalik indikator kesejahteraan menjadi skor urgensi. Karena itu suku cost pada MOORA tidak pernah terpakai.">
              Rumus MOORA
            </Judul>
            <div className="divide-y divide-rambut">
              {[
                {
                  n: 1,
                  judul: 'Normalisasi vektor Euclidean',
                  rumus: 'r_ij = x_ij / \u221a(\u03a3_i x_ij\u00b2)',
                  ket: 'Setiap nilai dibagi akar jumlah kuadrat kolomnya. Pembagi dihitung hanya dari nilai yang tersedia, supaya balita berdata belum lengkap tidak dirugikan oleh nilai yang tidak diketahui.',
                },
                {
                  n: 2,
                  judul: 'Skor akhir terbobot',
                  rumus: 'y_i = \u03a3_j w_j \u00d7 r_ij',
                  ket: 'Bobot w dipakai apa adanya dan tidak diredistribusi. Balita berdata kurang memperoleh skor lebih rendah karena bukti yang terkumpul memang lebih sedikit.',
                },
                {
                  n: 3,
                  judul: 'Urutan',
                  rumus: 'peringkat = urut menurun y_i',
                  ket: 'Skor hanya menentukan urutan. Peringkat 1 adalah yang diperiksa lebih dulu.',
                },
              ].map((b) => (
                <div key={b.n} className="flex gap-4 px-4 py-3.5 sm:px-5">
                  <span className="w-8 shrink-0 font-display text-xl font-bold leading-none text-papan-700">
                    {b.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-tinta-900">{b.judul}</p>
                    <p className="mt-1.5 inline-block rounded border border-rambut bg-kertas-100 px-2.5 py-1.5 text-xs font-semibold text-papan-700">
                      {b.rumus}
                    </p>
                    <p className="mt-1.5 max-w-[76ch] text-xs leading-relaxed text-tinta-500">
                      {b.ket}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-kertas-50">
            <Judul ket="Tingkat prioritas tidak diambil dari skor, melainkan dari kondisi klinis balita itu sendiri. Karena itu tingkat seorang anak tidak berubah hanya karena anak lain di kohort yang sama kebetulan lebih sehat atau lebih sakit. Aturan ini identik di backend dan di perhitungan cadangan sisi klien.">
              Aturan tingkat prioritas
            </Judul>
            <div className="divide-y divide-rambut">
              {[
                {
                  tingkat: 'Sangat Tinggi',
                  aturan: 'C1 = 5, atau C1 = 4 dengan \u2265 2 kriteria lain \u2265 4',
                  tindakan: 'Rujuk Dokter Spesialis Anak & PMT Pemulihan Segera',
                  goresan: 5,
                },
                {
                  tingkat: 'Tinggi',
                  aturan: 'C1 = 4, atau C1 \u2264 3 dengan \u2265 3 kriteria lain \u2265 4',
                  tindakan: 'Kunjungan Rumah Kader & Konseling Gizi Intensif',
                  goresan: 4,
                },
                {
                  tingkat: 'Sedang',
                  aturan: 'C1 = 3, atau C1 \u2264 2 dengan \u2265 2 kriteria \u2265 4, atau \u2265 3 kriteria = 3',
                  tindakan: 'Pemantauan Rutin Posyandu & Suplementasi Vitamin',
                  goresan: 3,
                },
                {
                  tingkat: 'Rendah',
                  aturan: 'selain ketentuan di atas',
                  tindakan: 'Pemantauan Rutin Posyandu',
                  goresan: 2,
                },
              ].map((t) => (
                <div key={t.tingkat} className="flex items-start gap-4 px-4 py-3.5 sm:px-5">
                  <span className="shrink-0 pt-0.5 text-papan-600">
                    <Tally skor={t.goresan} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-tinta-900">{t.tingkat}</p>
                    <p className="mt-0.5 text-xs text-tinta-700">{t.aturan}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-tinta-500">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      {t.tindakan}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="border-t border-rambut bg-kertas-100 px-4 py-3 text-xs leading-relaxed text-tinta-500 sm:px-5">
              Balita dengan data kurang dari 5 dari 7 kriteria ditandai{' '}
              <span className="font-bold text-amber-900">perlu verifikasi lapangan</span> dan
              tingkatnya tidak boleh diturunkan secara sepihak.
            </p>
          </section>

          <section className="bg-papan-800 px-4 py-4 text-kapur-100 sm:px-5">
            <p className="max-w-[76ch] text-xs leading-relaxed">
              Tujuh kriteria dipakai dengan bobot{' '}
              <strong className="font-bold text-kapur-50">terkunci hasil Fuzzy AHP</strong>. Bobot
              itu tidak dapat diubah, dinonaktifkan, maupun diredistribusi dari antarmuka mana pun.
              Rincian perhitungannya beserta uji konsistensinya ada di seksi{' '}
              <strong className="font-bold text-kapur-50">Bukti Perhitungan</strong>.
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
                  <span className="tnum">{(c.weight * 100).toFixed(2)}%</span>
                </span>
              ))}
            </div>
          </section>
        </>
      )}

      {result && (
        <div className="bg-kertas-100 px-4 py-3 text-xs text-tinta-500 sm:px-5">
          Kohort aktif:{' '}
          <span className="tnum font-bold text-tinta-900">{result.rankings.length}</span> balita
          dinilai dengan <span className="font-bold text-tinta-900">MOORA</span> dan bobot Fuzzy
          AHP yang terkunci.
        </div>
      )}
    </div>
  );
};
