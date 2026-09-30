import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Criterion, Alternative, CalculationResult, PriorityLevel } from '../types';
import { Calculator, AlertTriangle, CheckCircle, RefreshCw, BarChart3, HelpCircle } from 'lucide-react';

const DEFAULT_CRITERIA: Criterion[] = [
  { code: 'C1', name: 'Kondisi Gizi & Pertumbuhan (TB/U, BB/U, BB/TB)', weight: 0.3440, type: 'benefit' },
  { code: 'C2', name: 'Riwayat Kelahiran Berisiko (BBLR, Prematur)', weight: 0.0881, type: 'benefit' },
  { code: 'C3', name: 'Riwayat Penyakit / Infeksi (Diare, ISPA)', weight: 0.2289, type: 'benefit' },
  { code: 'C4', name: 'Pola Pemberian Makan (ASI, MPASI)', weight: 0.1466, type: 'benefit' },
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

function getPriorityBadgeClass(level: PriorityLevel) {
  switch (level) {
    case 'Sangat Tinggi':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Tinggi':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Sedang':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Rendah':
    default:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
}

interface DashboardPageProps {
  method: 'saw' | 'moora';
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ method }) => {
  const [criteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  const [balitas] = useState<Alternative[]>(INITIAL_BALITA);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runCalculation = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.calculate(method, balitas, criteria);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [method, balitas, criteria]);

  useEffect(() => {
    runCalculation();
  }, [runCalculation]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Overview Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              Metode Aktif: {method === 'saw' ? 'Simple Additive Weighting (SAW)' : 'MOORA (Ratio System)'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Penetapan Prioritas Intervensi Gizi Balita
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            {method === 'saw'
              ? 'SAW mencari penjumlahan terbobot dari rating kinerja ternormalisasi skala benefit (r_ij = x_ij / max(x_j)).'
              : 'MOORA menormalisasi matriks menggunakan akar jumlah kuadrat per kriteria (r_ij = x_ij / sqrt(sum(x^2))) lalu menghitung nilai optimasi.'}
          </p>
        </div>

        <button
          onClick={runCalculation}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Kalkulasi Ulang</span>
        </button>
      </div>

      {/* 7 Kriteria Triase */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Bobot 7 Kriteria Triase (Skala 1–5, Semua Benefit terhadap Risiko)
            </h2>
          </div>
          <span className="text-xs text-slate-400">Total: 100%</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {criteria.map((c) => (
            <div key={c.code} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-blue-700 block">{c.code}</span>
                <span className="text-xs font-medium text-slate-700 line-clamp-2 mt-1" title={c.name}>
                  {c.name}
                </span>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Bobot</span>
                <span className="text-xs font-bold text-slate-900">{(c.weight * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hasil Ranking Prioritas */}
      {result && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-700" />
                <span>Hasil Perangkingan Prioritas Intervensi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Balita pada peringkat teratas merupakan balita yang paling mendesak memperoleh tindakan gizi.
              </p>
            </div>
            <div className="text-xs font-mono font-semibold bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 self-start">
              Metode: {result.method.toUpperCase()}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-center w-16">Rank</th>
                  <th className="py-3 px-4">Kode Balita</th>
                  <th className="py-3 px-4">Skor Akhir</th>
                  <th className="py-3 px-4">Tingkat Prioritas</th>
                  <th className="py-3 px-4">Rekomendasi Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.rankings.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      item.rank <= 2
                        ? 'bg-red-50/40 font-medium'
                        : 'hover:bg-slate-50/70 transition'
                    }
                  >
                    <td className="py-3 px-4 text-center">
                      {item.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black shadow-xs">
                          1
                        </span>
                      ) : (
                        <span className="font-bold text-slate-700">{item.rank}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{item.score.toFixed(4)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPriorityBadgeClass(item.priority_level)}`}>
                        {item.priority_level}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.priority_level === 'Sangat Tinggi' && (
                        <span className="text-red-700 font-semibold flex items-center gap-1.5 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Rujuk Dokter Spesialis Anak &amp; PMT Pemulihan Segera
                        </span>
                      )}
                      {item.priority_level === 'Tinggi' && (
                        <span className="text-orange-700 font-medium flex items-center gap-1.5 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Kunjungan Rumah Kader &amp; Konseling Gizi Intensif
                        </span>
                      )}
                      {item.priority_level === 'Sedang' && (
                        <span className="text-amber-700 text-xs flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          Pemantauan Rutin Posyandu &amp; Suplementasi Vitamin
                        </span>
                      )}
                      {item.priority_level === 'Rendah' && (
                        <span className="text-emerald-700 text-xs flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          Pemeliharaan Pola Asuh &amp; Penimbangan Teratur
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabel Data Penilaian Awal 10 Balita */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Matriks Penilaian Kohort Sampel (10 Balita, Skala Ordinal 1–5)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Kode Balita</th>
                {criteria.map((c) => (
                  <th key={c.code} className="py-2.5 px-2 text-center" title={c.name}>
                    {c.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balitas.map((alt) => (
                <tr key={alt.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-bold text-slate-800">{alt.name}</td>
                  {criteria.map((c) => (
                    <td key={c.code} className="py-2 px-2 text-center font-mono text-slate-700">
                      {alt.values[c.code]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
