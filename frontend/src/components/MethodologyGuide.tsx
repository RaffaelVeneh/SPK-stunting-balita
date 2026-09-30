import React, { useState } from 'react';
import type { CalculationResult, Criterion, Alternative, AhpMatrixResponse } from '../types';
import { FUZZY_SUB_CRITERIA_DATA, SPK_WORKFLOW_STEPS } from '../utils/exportExcel';
import {
  Layers,
  GitBranch,
  Calculator,
  CheckCircle2,
  Table,
  HelpCircle
} from 'lucide-react';

interface MethodologyGuideProps {
  method: 'saw' | 'moora';
  criteria: Criterion[];
  balitas: Alternative[];
  result: CalculationResult | null;
  ahpData: AhpMatrixResponse | null;
}

export const MethodologyGuide: React.FC<MethodologyGuideProps> = ({
  method,
  criteria,
  balitas,
  result,
  ahpData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tahapan' | 'subkriteria' | 'metode' | 'ahp'>('tahapan');
  const activeCriteria = criteria.filter((c) => c.active !== false);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              Metodologi &amp; Rincian Ketat
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              Metode Aktif: {method.toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Panduan Lengkap Metodologi SPK Stunting Balita
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            {method === 'saw'
              ? 'Rincian ketat alur proses, himpunan fuzzy sub-kriteria (range & domain), pembobotan AHP, serta formulasi normalisasi Simple Additive Weighting (SAW).'
              : 'Rincian ketat alur proses, himpunan fuzzy sub-kriteria (range & domain), pembobotan AHP, serta normalisasi vektor Euclidean pada sistem rasio MOORA.'}
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('tahapan')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'tahapan'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>1. Alur &amp; Tahapan</span>
          </button>

          <button
            onClick={() => setActiveSubTab('subkriteria')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'subkriteria'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Sub-Kriteria &amp; Fuzzy</span>
          </button>

          <button
            onClick={() => setActiveSubTab('metode')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'metode'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>3. Rincian {method.toUpperCase()}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ahp')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'ahp'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>4. Pembobotan AHP</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TAHAPAN ALUR PROSES SPK */}
      {activeSubTab === 'tahapan' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-700" />
              <span>Tahapan Alur Proses SPK (Kombinasi Fuzzy Sub-Kriteria + AHP + {method.toUpperCase()})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Urutan sistematis dari data mentah lapangan hingga penentuan urutan intervensi balita.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-16">Tahap</th>
                  <th className="py-3 px-4 w-64">Proses</th>
                  <th className="py-3 px-4">Yang Dilakukan</th>
                  <th className="py-3 px-4 w-72">Rumus / Referensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SPK_WORKFLOW_STEPS.map((step) => (
                  <tr key={step.tahap} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-center font-black">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-900 text-xs">
                        {step.tahap}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{step.proses}</td>
                    <td className="py-3 px-4 text-slate-600 leading-relaxed">{step.desc}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-blue-800 bg-slate-50/50">
                      {step.rumus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SUB-KRITERIA & HIMPUNAN FUZZY */}
      {activeSubTab === 'subkriteria' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700" />
                <span>Tabel Himpunan Input Sub-Kriteria &amp; Fungsi Keanggotaan Fuzzy</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemetaan data mentah (cm, kg, frekuensi sakit, teks perilaku) ke skala ordinal 1–5 melalui kurva keanggotaan.
              </p>
            </div>
            <span className="text-[11px] font-bold bg-blue-100 text-blue-900 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              7 Kriteria Terdefinisi
            </span>
          </div>

          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <strong>Mengapa batas domain beririsan (overlap)?</strong>
              <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                Untuk menghindari kondisi di mana perubahan kategori terjadi secara mendadak hanya karena selisih 1 angka kecil. Kurva <strong>Segitiga</strong> digunakan saat ada satu titik tengah yang paling mewakili kategori, sedangkan kurva <strong>Trapesium</strong> digunakan untuk rentang nilai ekstrim yang memiliki derajat keanggotaan maksimum (saturasi 1.0).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Fungsi</th>
                  <th className="py-3 px-3">Variabel (Kriteria)</th>
                  <th className="py-3 px-3">Fungsi Keanggotaan</th>
                  <th className="py-3 px-2 text-center">Skor SPK</th>
                  <th className="py-3 px-3">Range Satuan Asli</th>
                  <th className="py-3 px-2 text-center">Bentuk Kurva</th>
                  <th className="py-3 px-3 font-mono">Domain Kurva</th>
                  <th className="py-3 px-3">Penjelasan Bentuk Kurva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FUZZY_SUB_CRITERIA_DATA.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {item.subCriteria.map((sub, sIdx) => (
                      <tr
                        key={sIdx}
                        className={`hover:bg-slate-50/80 transition ${sIdx === 0 ? 'border-t-2 border-slate-200' : ''}`}
                      >
                        {sIdx === 0 ? (
                          <td rowSpan={item.subCriteria.length} className="py-3 px-3 font-bold text-slate-500 bg-slate-50/60 align-top">
                            {item.fungsi}
                          </td>
                        ) : null}

                        {sIdx === 0 ? (
                          <td rowSpan={item.subCriteria.length} className="py-3 px-3 font-bold text-blue-900 bg-slate-50/60 align-top">
                            {item.variabel}
                          </td>
                        ) : null}

                        <td className="py-2.5 px-3 font-semibold text-slate-800">{sub.himpunan}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-blue-700">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 inline-flex items-center justify-center font-black text-xs">
                            {sub.skor}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{sub.range}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sub.jenis === 'Trapesium'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {sub.jenis}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800 bg-slate-50/50">
                          {sub.domain}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] leading-snug">
                          {sub.note}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RINCIAN KETAT METODE (SAW VS MOORA) */}
      {activeSubTab === 'metode' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-700" />
              <span>Formulasi Matematis Ketat: {method === 'saw' ? 'Simple Additive Weighting (SAW)' : 'MOORA (Ratio System)'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Penjelasan rumus baku dan langkah perhitungan terstruktur yang dijalankan oleh mesin SPK.
            </p>
          </div>

          {method === 'saw' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                    1. Rumus Normalisasi Kinerja (R)
                  </span>
                  <div className="bg-white p-3 rounded-lg border border-blue-100 font-mono text-xs text-slate-900">
                    r_ij = x_ij / max_i(x_ij) &nbsp;&nbsp;(untuk atribut Benefit)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Karena seluruh kriteria pada triase stunting dikonfigurasi sebagai <strong>Benefit terhadap Tingkat Urgensi</strong> (skala 5 = paling mendesak), maka setiap nilai elemen dibagi dengan nilai maksimum kolom tersebut.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                    2. Rumus Nilai Preferensi / Skor Akhir (V)
                  </span>
                  <div className="bg-white p-3 rounded-lg border border-blue-100 font-mono text-xs text-slate-900">
                    V_i = &Sigma; (w_j &times; r_ij) &nbsp;&nbsp;(dari j=1 sampai n)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nilai preferensi balita (V_i) merupakan penjumlahan terbobot dari matriks ternormalisasi (r_ij) dikalikan dengan bobot prioritas AHP masing-masing kriteria (w_j).
                  </p>
                </div>
              </div>

              {/* Threshold Prioritas SAW */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  3. Ambang Batas Klasifikasi Tingkat Prioritas SAW
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-red-200 text-red-900">
                    <span className="font-bold block">Sangat Tinggi</span>
                    <span className="font-mono text-[11px]">V_i &ge; 0.80</span>
                    <p className="text-[10px] text-slate-500 mt-1">Rujukan Dokter Spesialis Anak &amp; PMT</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-orange-200 text-orange-900">
                    <span className="font-bold block">Tinggi</span>
                    <span className="font-mono text-[11px]">0.60 &le; V_i &lt; 0.80</span>
                    <p className="text-[10px] text-slate-500 mt-1">Kunjungan Rumah Kader &amp; Konseling</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-amber-900">
                    <span className="font-bold block">Sedang</span>
                    <span className="font-mono text-[11px]">0.40 &le; V_i &lt; 0.60</span>
                    <p className="text-[10px] text-slate-500 mt-1">Pemantauan Rutin Posyandu</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-emerald-900">
                    <span className="font-bold block">Rendah</span>
                    <span className="font-mono text-[11px]">V_i &lt; 0.40</span>
                    <p className="text-[10px] text-slate-500 mt-1">Pemeliharaan Pola Asuh</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                    1. Rumus Normalisasi Vektor Euclidean (R)
                  </span>
                  <div className="bg-white p-3 rounded-lg border border-blue-100 font-mono text-xs text-slate-900">
                    r_ij = x_ij / &radic;(&Sigma; x_kj&sup2;) &nbsp;&nbsp;(dari k=1 sampai m)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Setiap elemen dibagi dengan akar dari jumlah kuadrat seluruh alternatif pada kriteria tersebut, sehingga menghasilkan matriks tak bersatuan yang dinormalisasi pada ruang vektor.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                    2. Rumus Nilai Optimasi Multi-Objektif (y_i)
                  </span>
                  <div className="bg-white p-3 rounded-lg border border-blue-100 font-mono text-xs text-slate-900">
                    y_i = &Sigma; (w_j &times; r_ij) [Benefit] - &Sigma; (w_j &times; r_ij) [Cost]
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nilai akhir optimasi diperoleh dari selisih total bobot benefit terhadap total bobot cost. Pada triase stunting balita, seluruh kriteria merupakan benefit terhadap tingkat risiko.
                  </p>
                </div>
              </div>

              {/* Threshold Prioritas MOORA */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  3. Penentuan Derajat Relatif &amp; Tingkat Prioritas MOORA
                </span>
                <p className="text-xs text-slate-600">
                  Karena skor MOORA berada dalam rentang skala dinamis (berdasarkan jumlah alternatif), sistem menghitung rasio posisi relatif: <code>y_rel = (y_i - y_min) / (y_max - y_min)</code>.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-red-200 text-red-900">
                    <span className="font-bold block">Sangat Tinggi</span>
                    <span className="font-mono text-[11px]">y_rel &ge; 0.75</span>
                    <p className="text-[10px] text-slate-500 mt-1">Kuartil teratas paling gawat</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-orange-200 text-orange-900">
                    <span className="font-bold block">Tinggi</span>
                    <span className="font-mono text-[11px]">0.50 &le; y_rel &lt; 0.75</span>
                    <p className="text-[10px] text-slate-500 mt-1">Prioritas intervensi aktif</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-amber-900">
                    <span className="font-bold block">Sedang</span>
                    <span className="font-mono text-[11px]">0.25 &le; y_rel &lt; 0.50</span>
                    <p className="text-[10px] text-slate-500 mt-1">Pemantauan berkala</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-emerald-900">
                    <span className="font-bold block">Rendah</span>
                    <span className="font-mono text-[11px]">y_rel &lt; 0.25</span>
                    <p className="text-[10px] text-slate-500 mt-1">Kondisi paling aman</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabel Perhitungan Nyata dari Data Aktif */}
          {result && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Matriks Ternormalisasi (R) Riil — {balitas.length} Balita Aktif
                </span>
                <span className="text-[11px] text-slate-400">4 Desimal Terhitung</span>
              </div>

              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-center text-xs border border-slate-200 bg-white rounded-lg">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="p-2 border border-slate-200 text-left">Kode Balita</th>
                      {activeCriteria.map((c) => (
                        <th key={c.code} className="p-2 border border-slate-200">{c.code}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {balitas.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 font-mono text-[11px]">
                        <td className="p-2 border border-slate-200 text-left font-sans font-semibold text-slate-800 bg-slate-50/50">
                          {b.id}
                        </td>
                        {activeCriteria.map((c) => {
                          const val = result.normalized_matrix[b.id]?.[c.code] ?? 0;
                          return (
                            <td key={c.code} className="p-2 border border-slate-200">
                              {Number(val).toFixed(4)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: PEMBOBOTAN AHP & KONSISTENSI */}
      {activeSubTab === 'ahp' && ahpData && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-700" />
                <span>Pembobotan Analytic Hierarchy Process (AHP) &amp; Uji Konsistensi Saaty</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Penetapan bobot prioritas kriteria berdasarkan perbandingan berpasangan pakar gizi.
              </p>
            </div>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg self-start sm:self-auto flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>CR = {ahpData.ahp_result.consistency_ratio} &lt; 0.10 (Konsisten)</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border border-slate-200 bg-white rounded-lg">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2.5 border border-slate-200 text-left">Kriteria</th>
                  {ahpData.criteria.map((code) => (
                    <th key={code} className="p-2.5 border border-slate-200">{code}</th>
                  ))}
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-blue-900 font-bold">
                    Bobot Prioritas (w_j)
                  </th>
                </tr>
              </thead>
              <tbody>
                {ahpData.matrix.map((row, rIdx) => {
                  const code = ahpData.criteria[rIdx];
                  const weight = ahpData.ahp_result.weights[code] || 0;
                  return (
                    <tr key={code} className="hover:bg-slate-50 font-mono">
                      <td className="p-2.5 border border-slate-200 font-sans font-bold text-left bg-slate-50/60">
                        {code}
                      </td>
                      {row.map((val, cIdx) => (
                        <td key={cIdx} className="p-2.5 border border-slate-200">
                          {Number(val).toFixed(2)}
                        </td>
                      ))}
                      <td className="p-2.5 border border-slate-200 bg-blue-50/60 text-blue-900 font-bold">
                        {(weight * 100).toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="block text-slate-500 text-[11px]">Lambda Max (&lambda;<sub>max</sub>):</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{ahpData.ahp_result.lambda_max.toFixed(4)}</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Nilai Eigen Terbesar</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="block text-slate-500 text-[11px]">Consistency Index (CI):</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{ahpData.ahp_result.consistency_index.toFixed(4)}</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">(&lambda;<sub>max</sub> - n) / (n - 1)</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="block text-slate-500 text-[11px]">Random Index (RI n=7):</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{ahpData.ahp_result.random_index.toFixed(4)}</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Konstanta Saaty n=7</span>
            </div>

            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-950">
              <span className="block text-emerald-700 text-[11px] font-semibold">Consistency Ratio (CR):</span>
              <span className="font-bold font-mono text-sm">{ahpData.ahp_result.consistency_ratio.toFixed(4)} &lt; 0.10</span>
              <span className="block text-[10px] text-emerald-800 mt-0.5">Matriks Teruji Konsisten</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
