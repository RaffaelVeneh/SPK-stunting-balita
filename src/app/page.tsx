'use client';

import { useState } from 'react';
import { runSpkCalculation, Alternative, Criterion, CalculationResult, PriorityLevel } from '@/lib/algorithms';

const DEFAULT_CRITERIA: Criterion[] = [
  { code: 'C1', name: 'Kondisi Gizi & Pertumbuhan', weight: 0.3440, type: 'benefit' },
  { code: 'C2', name: 'Riwayat Kelahiran Berisiko', weight: 0.0881, type: 'benefit' },
  { code: 'C3', name: 'Riwayat Penyakit / Infeksi', weight: 0.2289, type: 'benefit' },
  { code: 'C4', name: 'Pola Pemberian Makan', weight: 0.1466, type: 'benefit' },
  { code: 'C5', name: 'Sanitasi & Air Bersih', weight: 0.0521, type: 'benefit' },
  { code: 'C6', name: 'Kerentanan Sosial-Ekonomi', weight: 0.0881, type: 'benefit' },
  { code: 'C7', name: 'Akses Layanan Kesehatan', weight: 0.0521, type: 'benefit' },
];

const INITIAL_BALITA: Alternative[] = [
  { id: 'A01', name: 'Balita #01', values: { C1: 5, C2: 4, C3: 5, C4: 4, C5: 3, C6: 4, C7: 3 } },
  { id: 'A02', name: 'Balita #02', values: { C1: 1, C2: 1, C3: 1, C4: 2, C5: 1, C6: 1, C7: 1 } },
  { id: 'A03', name: 'Balita #03', values: { C1: 3, C2: 3, C3: 4, C4: 3, C5: 2, C6: 3, C7: 3 } },
  { id: 'A04', name: 'Balita #04', values: { C1: 5, C2: 5, C3: 5, C4: 5, C5: 4, C6: 5, C7: 4 } },
  { id: 'A05', name: 'Balita #05', values: { C1: 2, C2: 1, C3: 2, C4: 1, C5: 2, C6: 2, C7: 1 } },
  { id: 'A06', name: 'Balita #06', values: { C1: 2, C2: 2, C3: 1, C4: 2, C5: 1, C6: 2, C7: 2 } },
  { id: 'A07', name: 'Balita #07', values: { C1: 4, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 2 } },
  { id: 'A08', name: 'Balita #08', values: { C1: 2, C2: 3, C3: 2, C4: 3, C5: 2, C6: 2, C7: 2 } },
  { id: 'A09', name: 'Balita #09', values: { C1: 4, C2: 4, C3: 4, C4: 4, C5: 3, C6: 4, C7: 3 } },
  { id: 'A10', name: 'Balita #10', values: { C1: 1, C2: 2, C3: 2, C4: 2, C5: 2, C6: 1, C7: 2 } },
];

function getBadgeColor(level: PriorityLevel) {
  switch (level) {
    case 'Sangat Tinggi':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
    case 'Tinggi':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800';
    case 'Sedang':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    case 'Rendah':
    default:
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
  }
}

export default function Home() {
  const [method, setMethod] = useState<'saw' | 'moora'>('saw');
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  const [balitaList, setBalitaList] = useState<Alternative[]>(INITIAL_BALITA);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(() =>
    runSpkCalculation('saw', INITIAL_BALITA, DEFAULT_CRITERIA)
  );

  const handleCalculate = (selectedMethod: 'saw' | 'moora') => {
    setMethod(selectedMethod);
    const res = runSpkCalculation(selectedMethod, balitaList, criteria);
    setCalculationResult(res);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                SPK Prioritas Intervensi Gizi
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                Fase Awal: SAW &amp; MOORA
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Sistem Penentu Prioritas Balita Berisiko Stunting
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Menentukan urgensi triase intervensi gizi berbasis skor kontinu dengan metode MCDM.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 p-1.5 rounded-lg self-start">
            <button
              onClick={() => handleCalculate('saw')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                method === 'saw'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Metode SAW
            </button>
            <button
              onClick={() => handleCalculate('moora')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                method === 'moora'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Metode MOORA
            </button>
          </div>
        </header>

        {/* Info Metode */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
            <span>Metode Aktif:</span>
            <span className="text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              {method === 'saw' ? 'Simple Additive Weighting (SAW)' : 'MOORA (Ratio System)'}
            </span>
          </h2>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
            {method === 'saw'
              ? 'SAW mencari penjumlahan terbobot dari rating kinerja pada setiap alternatif di semua kriteria ternormalisasi terhadap skor maksimum.'
              : 'MOORA menormalisasi matriks menggunakan akar jumlah kuadrat per kriteria (vektor rasio) lalu menghitung selisih nilai manfaat dan biaya.'}
          </p>
        </section>

        {/* Kriteria & Bobot */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Bobot 7 Kriteria Triase (Skala 1–5, Semua Benefit terhadap Risiko)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {criteria.map((c) => (
              <div
                key={c.code}
                className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">{c.code}</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2 mt-0.5">
                    {c.name}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-xs text-slate-500 block">Bobot</span>
                  <span className="text-sm font-semibold">{(c.weight * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hasil Ranking */}
        {calculationResult && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold">Hasil Ranking Prioritas Intervensi</h3>
                <p className="text-xs text-slate-500">
                  Diurutkan dari prioritas paling mendesak (peringkat 1) hingga terendah.
                </p>
              </div>
              <button
                onClick={() => handleCalculate(method)}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Kalkulasi Ulang
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-16">Rank</th>
                    <th className="py-2.5 px-3">Kode Balita</th>
                    <th className="py-2.5 px-3">Skor Akhir ({method.toUpperCase()})</th>
                    <th className="py-2.5 px-3">Tingkat Prioritas</th>
                    <th className="py-2.5 px-3 text-center">Tindakan Rekomendasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calculationResult.rankings.map((item) => (
                    <tr
                      key={item.id}
                      className={
                        item.rank <= 2
                          ? 'bg-red-50/40 dark:bg-red-950/20 font-medium'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-2.5 px-3 text-center font-bold">
                        {item.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs">
                            1
                          </span>
                        ) : (
                          item.rank
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{item.name}</td>
                      <td className="py-2.5 px-3 font-mono font-medium">{item.score.toFixed(4)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeColor(
                            item.priorityLevel
                          )}`}
                        >
                          {item.priorityLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.priorityLevel === 'Sangat Tinggi' && (
                          <span className="text-red-600 dark:text-red-400 font-semibold text-xs">
                            Intervensi Medis &amp; PMT Segera
                          </span>
                        )}
                        {item.priorityLevel === 'Tinggi' && (
                          <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">
                            Kunjungan Rumah &amp; Edukasi
                          </span>
                        )}
                        {item.priorityLevel === 'Sedang' && (
                          <span className="text-amber-600 dark:text-amber-400 text-xs">
                            Pemantauan Rutin Posyandu
                          </span>
                        )}
                        {item.priorityLevel === 'Rendah' && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                            Pemeliharaan Standar
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Matriks Skor Awal Balita */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Data Penilaian Balita Sampel (10 Balita)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3">Balita</th>
                  {criteria.map((c) => (
                    <th key={c.code} className="py-2 px-2 text-center" title={c.name}>
                      {c.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {balitaList.map((alt) => (
                  <tr key={alt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-medium">{alt.name}</td>
                    {criteria.map((c) => (
                      <td key={c.code} className="py-2 px-2 text-center font-mono">
                        {alt.values[c.code]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
