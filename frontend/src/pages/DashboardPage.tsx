import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Criterion, Alternative, CalculationResult, PriorityLevel, User } from '../types';
import { Calculator, AlertTriangle, CheckCircle, RefreshCw, BarChart3, HelpCircle, ShieldCheck, Eye } from 'lucide-react';

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
  user: User;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ method, user }) => {
  const [criteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  const [balitas] = useState<Alternative[]>(INITIAL_BALITA);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAhpDetail, setShowAhpDetail] = useState(false);

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
      
      {/* Role Notice Banner */}
      {user.is_superadmin ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Akses Superadmin:</strong> Selamat datang, {user.name}. Anda memiliki izin penuh untuk mengelola kriteria, melakukan kalkulasi ulang kohort, dan menetapkan tindakan intervensi gizi.
            </span>
          </div>
          <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded shrink-0">
            Akses Penuh
          </span>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong>Mode Pengguna Biasa:</strong> Anda masuk sebagai civitas UNY ({user.name}). Anda dapat memeriksa data balita, mengecek informasi kriteria gizi, dan melihat peringkat prioritas intervensi.
            </span>
          </div>
          <span className="font-bold uppercase tracking-wider text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded shrink-0">
            Lihat Data &amp; Info
          </span>
        </div>
      )}

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

        {/* Toggle AHP Detail Button */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Metode Pembobotan:</span>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
              AHP (Analytic Hierarchy Process)
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-700 font-medium">Consistency Ratio (CR): 0.011 &lt; 0.10 (Konsisten)</span>
          </div>
          <button
            onClick={() => setShowAhpDetail(!showAhpDetail)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            {showAhpDetail ? 'Sembunyikan Matriks AHP ▲' : 'Lihat Matriks Perbandingan Berpasangan AHP ▼'}
          </button>
        </div>

        {/* Collapsible AHP Matrix */}
        {showAhpDetail && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                Matriks Perbandingan Berpasangan (Skala Saaty 1–9) oleh Ahli Gizi
              </span>
              <span className="bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded text-[11px] self-start sm:self-auto">
                CR = 0.011 (Valid &amp; Lolos Uji Konsistensi)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border border-slate-200 bg-white rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 border border-slate-200 text-left">Kriteria</th>
                    <th className="p-2 border border-slate-200">C1</th>
                    <th className="p-2 border border-slate-200">C2</th>
                    <th className="p-2 border border-slate-200">C3</th>
                    <th className="p-2 border border-slate-200">C4</th>
                    <th className="p-2 border border-slate-200">C5</th>
                    <th className="p-2 border border-slate-200">C6</th>
                    <th className="p-2 border border-slate-200">C7</th>
                    <th className="p-2 border border-slate-200 bg-blue-50 text-blue-900">Bobot Akhir (w_j)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: 'C1 (Gizi)', vals: ['1.00', '4.00', '2.00', '3.00', '6.00', '4.00', '6.00'], w: '34.40%' },
                    { code: 'C2 (Lahir)', vals: ['0.25', '1.00', '0.33', '0.50', '2.00', '1.00', '2.00'], w: '8.81%' },
                    { code: 'C3 (Infeksi)', vals: ['0.50', '3.00', '1.00', '2.00', '4.00', '3.00', '4.00'], w: '22.89%' },
                    { code: 'C4 (Pola Makan)', vals: ['0.33', '2.00', '0.50', '1.00', '3.00', '2.00', '3.00'], w: '14.66%' },
                    { code: 'C5 (Sanitasi)', vals: ['0.17', '0.50', '0.25', '0.33', '1.00', '0.50', '1.00'], w: '5.21%' },
                    { code: 'C6 (Ekonomi)', vals: ['0.25', '1.00', '0.33', '0.50', '2.00', '1.00', '2.00'], w: '8.81%' },
                    { code: 'C7 (Layanan)', vals: ['0.17', '0.50', '0.25', '0.33', '1.00', '0.50', '1.00'], w: '5.21%' },
                  ].map((row) => (
                    <tr key={row.code} className="hover:bg-slate-50 font-mono">
                      <td className="p-2 border border-slate-200 font-sans font-bold text-left bg-slate-50/50">{row.code}</td>
                      {row.vals.map((v, i) => (
                        <td key={i} className="p-2 border border-slate-200">{v}</td>
                      ))}
                      <td className="p-2 border border-slate-200 bg-blue-50/60 text-blue-900 font-bold">{row.w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-600">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-slate-400">Lambda Max (&lambda;<sub>max</sub>):</span>
                <span className="font-bold text-slate-900 font-mono">7.0910</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-slate-400">Consistency Index (CI):</span>
                <span className="font-bold text-slate-900 font-mono">0.0152</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-slate-400">Random Index (RI n=7):</span>
                <span className="font-bold text-slate-900 font-mono">1.3200</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-900">
                <span className="block text-emerald-600 font-semibold">Consistency Ratio (CR):</span>
                <span className="font-bold font-mono">0.0115 &lt; 0.10</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              *Catatan Sistem: Sesuai dokumentasi, bobot AHP ini dikunci pada tabel <code>bobot_kriteria_versi</code> agar seluruh batch penilaian balita konsisten dan komparabel antar waktu dan antar wilayah puskesmas.
            </p>
          </div>
        )}
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
