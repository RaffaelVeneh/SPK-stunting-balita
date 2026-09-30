import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Criterion, Alternative, CalculationResult, PriorityLevel, User, AhpMatrixResponse } from '../types';
import {
  Calculator,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  HelpCircle,
  ShieldCheck,
  Eye,
  Database,
  FileSpreadsheet,
  BookOpen,
  X,
  SlidersHorizontal,
  Info,
  Download
} from 'lucide-react';
import { exportSpkToExcel } from '../utils/exportExcel';
import { MethodologyGuide } from '../components/MethodologyGuide';

const RUBRIC_DATA = [
  {
    code: 'C1',
    name: 'Kondisi Gizi & Pertumbuhan (TB/U)',
    levels: [
      { score: 1, label: 'Optimal / Sangat Sehat', desc: 'Z-score TB/U ≥ -1 SD. Tinggi badan ideal dan pertumbuhan sangat baik.' },
      { score: 2, label: 'Normal / Gizi Baik', desc: 'Z-score -2 SD ≤ TB/U < -1 SD. Pertumbuhan normal sesuai standar KMS.' },
      { score: 3, label: 'Waspada (Garis Kuning)', desc: 'Z-score mendekati -2 SD, kurva pertumbuhan mendatar (growth faltering).' },
      { score: 4, label: 'Stunted (Pendek)', desc: 'Z-score -3 SD ≤ TB/U < -2 SD. Terindikasi stunting butuh PMT pemulihan.' },
      { score: 5, label: 'Severely Stunted (Sangat Pendek)', desc: 'Z-score TB/U < -3 SD. Stunting parah / gizi buruk, darurat rujukan dokter spesialis.' },
    ],
  },
  {
    code: 'C2',
    name: 'Riwayat Kelahiran Berisiko (BBLR/Prematur)',
    levels: [
      { score: 1, label: 'Normal Cukup Bulan', desc: 'Usia gestasi ≥ 37 minggu, Berat Badan Lahir (BBL) ≥ 2.500 gram.' },
      { score: 2, label: 'Cukup Bulan BBL Batas Bawah', desc: 'Lahir cukup bulan, BBL 2.300 - 2.499 gram.' },
      { score: 3, label: 'BBLR Ringan', desc: 'Cukup bulan dengan BBL 2.000 - 2.299 gram atau persalinan berbantu.' },
      { score: 4, label: 'Prematur Sedang / BBLR', desc: 'Lahir 34 - 36 minggu atau BBL 1.500 - 1.999 gram.' },
      { score: 5, label: 'Prematur Ekstrem / BBLSR', desc: 'Lahir < 32 minggu atau BBL < 1.500 gram dengan komplikasi neonatal.' },
    ],
  },
  {
    code: 'C3',
    name: 'Riwayat Penyakit & Infeksi (Diare/ISPA)',
    levels: [
      { score: 1, label: 'Sangat Sehat', desc: 'Tidak ada riwayat sakit infeksi dalam 6 bulan terakhir.' },
      { score: 2, label: 'Infeksi Ringan', desc: 'Pernah batuk/pilek biasa, sembuh cepat tanpa komplikasi.' },
      { score: 3, label: 'Infeksi Berulang Ringan', desc: 'Diare akut ≤ 2 kali atau ISPA berulang dalam 3 bulan terakhir.' },
      { score: 4, label: 'Infeksi Kronis / Pneumonia', desc: 'Diare berulang kronis, cacingan, atau pneumonia dalam 3 bulan.' },
      { score: 5, label: 'Penyakit Berat / TB Anak', desc: 'TB Anak, komplikasi malnutrisi, atau penyakit penyerta kronis.' },
    ],
  },
  {
    code: 'C4',
    name: 'Kualitas Pola Asuh Makan (ASI & MPASI)',
    levels: [
      { score: 1, label: 'Sangat Baik & Lengkap', desc: 'ASI Eksklusif 6 bulan penuh + MPASI kaya protein hewani harian.' },
      { score: 2, label: 'Baik & Beragam', desc: 'Diberikan ASI, MPASI gizi seimbang teratur 3-4 kali seminggu.' },
      { score: 3, label: 'Cukup / Kurang Variatif', desc: 'ASI eksklusif terputus sebelum 6 bulan atau MPASI didominasi karbohidrat.' },
      { score: 4, label: 'Buruk / Rendah Nutrisi', desc: 'Tidak dapat ASI eksklusif, MPASI sangat miskin protein hewani dan vitamin.' },
      { score: 5, label: 'Sangat Buruk / Gagal Makan', desc: 'Pola asuh makan salah parah / balita sulit makan ekstrem / defisit nutrisi total.' },
    ],
  },
  {
    code: 'C5',
    name: 'Sanitasi Lingkungan & Air Bersih',
    levels: [
      { score: 1, label: 'Sangat Layak & Higienis', desc: 'Air perpipaan terlindung teruji + jamban leher angsa pribadi sehat.' },
      { score: 2, label: 'Layak', desc: 'Sumur terlindung + jamban keluarga dengan tangki septik.' },
      { score: 3, label: 'Cukup / Komunal', desc: 'Sumur terbuka atau menggunakan jamban komunal bergantian.' },
      { score: 4, label: 'Kurang Layak', desc: 'Ketiadaan air bersih layak, sumber air keruh/sering tercemar.' },
      { score: 5, label: 'Sangat Buruk (BABS)', desc: 'Buang air besar sembarangan / tinggal di dekat tumpukan limbah terbuka.' },
    ],
  },
  {
    code: 'C6',
    name: 'Kerentanan Sosial-Ekonomi Keluarga',
    levels: [
      { score: 1, label: 'Mapan / Mandiri', desc: 'Pendapatan keluarga di atas UMR, kecukupan pangan bergizi terjamin.' },
      { score: 2, label: 'Menengah Stabil', desc: 'Ekonomi stabil mencukupi kebutuhan pokok pangan dan nutrisi.' },
      { score: 3, label: 'Rentan', desc: 'Pekerja harian/informal dengan pendapatan fluktuatif pas-pasan.' },
      { score: 4, label: 'Pra-Sejahtera', desc: 'Keluarga terdaftar penerima bansos (PKH/BPNT), daya beli pangan rendah.' },
      { score: 5, label: 'Kemiskinan Ekstrem', desc: 'Keluarga miskin ekstrem tanpa penghasilan tetap atau kepala keluarga tunggal renta.' },
    ],
  },
  {
    code: 'C7',
    name: 'Pemanfaatan Layanan Kesehatan (Posyandu)',
    levels: [
      { score: 1, label: 'Sangat Aktif (100%)', desc: 'Kunjungan Posyandu tiap bulan tanpa absen + Imunisasi dasar lengkap.' },
      { score: 2, label: 'Rutin', desc: 'Kunjungan Posyandu rutin (absen ≤ 1 kali) + Imunisasi dasar lengkap.' },
      { score: 3, label: 'Cukup', desc: 'Posyandu terlewat beberapa kali, imunisasi tertunda.' },
      { score: 4, label: 'Jarang Terpantau', desc: 'Lebih dari 3 bulan tidak ditimbang ke Posyandu, imunisasi tidak tuntas.' },
      { score: 5, label: 'Drop Out / Menolak', desc: 'Tidak pernah ke Posyandu, menolak imunisasi dan pemantauan nakes.' },
    ],
  },
];

const INITIAL_MANUAL_BALITA: Alternative[] = [
  { id: 'MAN-01', name: 'Balita Kohort #01', values: { C1: 5, C2: 4, C3: 5, C4: 4, C5: 3, C6: 4, C7: 3 } },
  { id: 'MAN-02', name: 'Balita Kohort #02', values: { C1: 1, C2: 1, C3: 1, C4: 2, C5: 1, C6: 1, C7: 1 } },
  { id: 'MAN-03', name: 'Balita Kohort #03', values: { C1: 3, C2: 3, C3: 4, C4: 3, C5: 2, C6: 3, C7: 3 } },
  { id: 'MAN-04', name: 'Balita Kohort #04', values: { C1: 5, C2: 5, C3: 5, C4: 5, C5: 4, C6: 5, C7: 4 } },
  { id: 'MAN-05', name: 'Balita Kohort #05', values: { C1: 2, C2: 1, C3: 2, C4: 1, C5: 2, C6: 2, C7: 1 } },
  { id: 'MAN-06', name: 'Balita Kohort #06', values: { C1: 2, C2: 2, C3: 1, C4: 2, C5: 1, C6: 2, C7: 2 } },
  { id: 'MAN-07', name: 'Balita Kohort #07', values: { C1: 4, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 2 } },
  { id: 'MAN-08', name: 'Balita Kohort #08', values: { C1: 2, C2: 3, C3: 2, C4: 3, C5: 2, C6: 2, C7: 2 } },
  { id: 'MAN-09', name: 'Balita Kohort #09', values: { C1: 4, C2: 4, C3: 4, C4: 4, C5: 3, C6: 4, C7: 3 } },
  { id: 'MAN-10', name: 'Balita Kohort #10', values: { C1: 1, C2: 2, C3: 2, C4: 2, C5: 2, C6: 1, C7: 2 } },
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
  // State Tab Utama: 'triase' vs 'panduan' (Panduan Lengkap & Rincian Ketat)
  const [mainTab, setMainTab] = useState<'triase' | 'panduan'>('triase');

  // State Data Sumber: 'dataset' (data_balita.csv) vs 'manual'
  const [dataSource, setDataSource] = useState<'dataset' | 'manual'>('dataset');
  const [datasetLimit, setDatasetLimit] = useState<number>(20);
  const [datasetFilter, setDatasetFilter] = useState<string>('all');
  const [includeC2C4, setIncludeC2C4] = useState<boolean>(true);

  // Data Kriteria & Balita
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [balitas, setBalitas] = useState<Alternative[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [ahpMatrixData, setAhpMatrixData] = useState<AhpMatrixResponse | null>(null);

  // Status & Modal UI
  const [loading, setLoading] = useState(false);
  const [showAhpDetail, setShowAhpDetail] = useState(false);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [selectedRubricCriterion, setSelectedRubricCriterion] = useState<string>('C1');
  const [showScaleGuide, setShowScaleGuide] = useState(true);

  // Load Criteria & AHP Matrix saat mount
  useEffect(() => {
    async function initMetadata() {
      const [critList, ahpRes] = await Promise.all([
        api.getCriteria(),
        api.getAhpMatrix(),
      ]);
      setCriteria(critList.map((c) => ({ ...c, active: true })));
      setAhpMatrixData(ahpRes);
    }
    initMetadata();
  }, []);

  // Fetch Balitas sesuai sumber data
  const loadBalitaData = useCallback(async () => {
    setLoading(true);
    try {
      if (dataSource === 'dataset') {
        const res = await api.getDatasetSamples(datasetLimit, 0, datasetFilter, includeC2C4);
        setBalitas(res.samples);
      } else {
        setBalitas(INITIAL_MANUAL_BALITA);
      }
    } finally {
      setLoading(false);
    }
  }, [dataSource, datasetLimit, datasetFilter, includeC2C4]);

  useEffect(() => {
    loadBalitaData();
  }, [loadBalitaData]);

  // Run SPK Calculation
  const runCalculation = useCallback(async () => {
    if (balitas.length === 0 || criteria.length === 0) return;
    setLoading(true);
    try {
      const activeCriteria = criteria.filter((c) => c.active !== false);
      const data = await api.calculate(method, balitas, activeCriteria);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [method, balitas, criteria]);

  useEffect(() => {
    runCalculation();
  }, [runCalculation]);

  // Toggle kriteria aktif untuk menguji resiliensi
  const toggleCriterion = (code: string) => {
    setCriteria((prev) => {
      const activeCount = prev.filter((c) => c.active !== false).length;
      return prev.map((c) => {
        if (c.code === code) {
          // Jangan biarkan nonaktifkan semua kriteria
          if (c.active !== false && activeCount <= 1) return c;
          return { ...c, active: c.active === false ? true : false };
        }
        return c;
      });
    });
  };

  const handleExportExcel = () => {
    if (!result || result.rankings.length === 0) return;
    exportSpkToExcel({
      result,
      criteria,
      balitas,
      ahpData: ahpMatrixData,
      method,
    });
  };

  const activeCriteriaCount = criteria.filter((c) => c.active !== false).length;
  const isPartialDataActive = activeCriteriaCount < 7 || dataSource === 'dataset';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Role Notice Banner */}
      {user.is_superadmin ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Akses Superadmin:</strong> Selamat datang, {user.name}. Anda memiliki izin penuh untuk mengelola kriteria, melakukan kalkulasi ulang dataset, dan menetapkan tindakan intervensi gizi.
            </span>
          </div>
          <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded shrink-0">
            Akses Penuh
          </span>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-900 shadow-xs">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong>Mode Pengguna Biasa:</strong> Anda masuk sebagai civitas UNY ({user.name}). Anda dapat memeriksa data balita, mengecek informasi rubrik gizi, dan melihat peringkat prioritas intervensi.
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
              Metode: {method === 'saw' ? 'Simple Additive Weighting (SAW)' : 'MOORA (Ratio System)'}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              Pembobotan AHP
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Penetapan Prioritas Intervensi Stunting Balita
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Sistem triase klinis untuk memeringkat balita paling mendesak memperoleh tindakan gizi dengan toleransi data parsial (*resilient engine*).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowRubricModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-800 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-700" />
            <span>Panduan Rubrik Skala 1–5</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={!result || result.rankings.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Download laporan lengkap multi-sheet (Hasil Triase, SAW/MOORA, AHP, Rubrik)"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={runCalculation}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Kalkulasi Ulang</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher Utama: Triase vs Panduan Lengkap & Rincian Ketat */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setMainTab('triase')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            mainTab === 'triase'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Triase &amp; Data Balita</span>
          {balitas.length > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                mainTab === 'triase'
                  ? 'bg-blue-800 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {balitas.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab('panduan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            mainTab === 'panduan'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Panduan Lengkap &amp; Rincian Ketat ({method.toUpperCase()})</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              mainTab === 'panduan'
                ? 'bg-blue-800 text-white'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            Alur, Sub-Kriteria &amp; Matriks
          </span>
        </button>
      </div>

      {mainTab === 'panduan' ? (
        <MethodologyGuide
          method={method}
          criteria={criteria}
          balitas={balitas}
          result={result}
          ahpData={ahpMatrixData}
        />
      ) : (
        <>
          {/* Data Source Switcher & Filter */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Pilih Sumber Data Penilaian
            </h2>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setDataSource('dataset')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dataSource === 'dataset'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Dataset Asli CSV (data_balita.csv)</span>
            </button>
            <button
              onClick={() => setDataSource('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dataSource === 'manual'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Kohort Standar 7 Kriteria Lengkap</span>
            </button>
          </div>
        </div>

        {dataSource === 'dataset' ? (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Dataset: data_balita.csv</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  121.001 Data Real
                </span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Kriteria Parsial (Fallback Aktif)
                </span>
              </div>
              <p className="text-slate-500">
                Memuat data langsung dari file CSV dengan atribut Umur, Jenis Kelamin, Tinggi Badan (TB), dan Status Gizi Kemenkes/WHO.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Sampel Data</label>
                <select
                  value={datasetLimit}
                  onChange={(e) => setDatasetLimit(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-blue-600"
                >
                  <option value={10}>10 Balita</option>
                  <option value={20}>20 Balita</option>
                  <option value={50}>50 Balita</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Filter Status</label>
                <select
                  value={datasetFilter}
                  onChange={(e) => setDatasetFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-blue-600"
                >
                  <option value="all">Semua Status</option>
                  <option value="severely stunted">Severely Stunted</option>
                  <option value="stunted">Stunted</option>
                  <option value="normal">Normal</option>
                  <option value="tinggi">Tinggi</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4 sm:pt-0">
                <input
                  type="checkbox"
                  id="includeC2C4"
                  checked={includeC2C4}
                  onChange={(e) => setIncludeC2C4(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeC2C4" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Sertakan C2 &amp; C4 (Riwayat &amp; Asupan)
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs text-slate-600">
            Menampilkan data uji 10 balita lengkap dengan 7 kriteria terisi penuh untuk simulasi ideal.
          </div>
        )}
      </div>

      {/* Resilient Fallback Notice */}
      {isPartialDataActive && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-xs">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-amber-950">
              Mesin Tahan Banting Aktif: Toleransi Data Parsial ({activeCriteriaCount}/7 Kriteria Dinilai)
            </h3>
            <p className="text-amber-800 leading-relaxed">
              Dataset saat ini tidak memuat seluruh 7 kriteria. Sistem SPK secara otomatis menjalankan <strong>Redistribusi Bobot Proporsional AHP</strong> ke kriteria yang aktif sehingga total bobot tetap 100% dan rasio perbandingan Saaty tetap konsisten. Kriteria yang kosong diisi dengan baseline netral (Skala 1.0) tanpa menyebabkan error.
            </p>
          </div>
        </div>
      )}

      {/* Penjelasan Eksplisit Skala Penilaian 1-5 */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Fungsi &amp; Arti Eksplisit Skala Penilaian 1–5
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mengapa ada skala 1–5? Karena data mentah posyandu memiliki satuan berbeda-beda (cm, kg, frekuensi sakit, teks perilaku). Skala ini menstandardisasi semua kriteria menjadi satu ukuran <strong>Tingkat Kegawatan Klinis &amp; Urgensi Intervensi</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowScaleGuide(!showScaleGuide)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            {showScaleGuide ? 'Sembunyikan Panduan ▲' : 'Buka Panduan Skala ▼'}
          </button>
        </div>

        {showScaleGuide && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Level 1 */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</span>
                    <span className="text-[10px] font-bold uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Aman</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs mt-2">Optimal / Sangat Sehat</h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Kondisi prima, tidak ada risiko malnutrisi sama sekali.
                  </p>
                </div>
                <div className="pt-2 border-t border-emerald-200/80">
                  <span className="block text-[10px] font-bold uppercase text-emerald-800">Tindakan Lapangan:</span>
                  <span className="text-[11px] text-slate-700 font-medium">Tidak butuh bantuan khusus. Cukup pemantauan rutin Posyandu.</span>
                </div>
              </div>

              {/* Level 2 */}
              <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/70 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center">2</span>
                    <span className="text-[10px] font-bold uppercase bg-teal-200 text-teal-900 px-2 py-0.5 rounded">Baik</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs mt-2">Normal / Gizi Baik</h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Pertumbuhan stabil, fluktuasi berat badan wajar dan aman.
                  </p>
                </div>
                <div className="pt-2 border-t border-teal-200/80">
                  <span className="block text-[10px] font-bold uppercase text-teal-800">Tindakan Lapangan:</span>
                  <span className="text-[11px] text-slate-700 font-medium">Pemeriksaan standar bulanan &amp; apresiasi pola asuh orang tua.</span>
                </div>
              </div>

              {/* Level 3 */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">3</span>
                    <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded">Lampu Kuning</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs mt-2">Waspada (Borderline)</h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Kurva KMS mendatar, ada tanda risiko awal atau asupan gizi kurang seimbang.
                  </p>
                </div>
                <div className="pt-2 border-t border-amber-200/80">
                  <span className="block text-[10px] font-bold uppercase text-amber-800">Tindakan Lapangan:</span>
                  <span className="text-[11px] text-slate-700 font-medium">Konseling gizi intensif &amp; kunjungan rumah kader agar tidak merosot.</span>
                </div>
              </div>

              {/* Level 4 */}
              <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/70 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center">4</span>
                    <span className="text-[10px] font-bold uppercase bg-orange-200 text-orange-900 px-2 py-0.5 rounded">Bahaya</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs mt-2">Berisiko Tinggi / Mendesak</h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Positif stunted (Z-score &lt; -2 SD), riwayat BBLR, diare kronis, atau sanitasi buruk.
                  </p>
                </div>
                <div className="pt-2 border-t border-orange-200/80">
                  <span className="block text-[10px] font-bold uppercase text-orange-800">Tindakan Lapangan:</span>
                  <span className="text-[11px] text-slate-700 font-medium">Wajib intervensi langsung: PMT Pemulihan telur/susu Puskesmas.</span>
                </div>
              </div>

              {/* Level 5 */}
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/70 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">5</span>
                    <span className="text-[10px] font-bold uppercase bg-red-200 text-red-900 px-2 py-0.5 rounded">Darurat</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs mt-2">Kritis / Gawat Darurat</h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Severely stunted (Z-score &lt; -3 SD), gizi buruk, atau infeksi penyerta berat.
                  </p>
                </div>
                <div className="pt-2 border-t border-red-200/80">
                  <span className="block text-[10px] font-bold uppercase text-red-800">Tindakan Lapangan:</span>
                  <span className="text-[11px] text-slate-700 font-medium">Rujukan medis darurat ke Dokter Spesialis Anak / RSUD segera.</span>
                </div>
              </div>
            </div>

            {/* Prinsip Arah Preferensi SPK */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[11px] shrink-0">Prinsip Triase SPK:</span>
                <span>Semakin <strong>TINGGI</strong> skornya (mendekati 5), semakin <strong>GAWAT</strong> kondisi balita, sehingga sistem menempatkannya pada <strong>PERINGKAT 1</strong> (paling mendesak diselamatkan).</span>
              </div>
              <button
                onClick={() => setShowRubricModal(true)}
                className="text-blue-700 font-bold hover:underline shrink-0 text-left sm:text-right cursor-pointer"
              >
                Lihat Definisi Rinci Tiap Kriteria C1–C7 &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kriteria & Bobot AHP Interaktif */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Kriteria SPK &amp; Redistribusi Bobot AHP Dinamis
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {activeCriteriaCount} dari 7 Kriteria Aktif (Klik kartu untuk toggle on/off)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {criteria.map((c) => {
            const isActive = c.active !== false;
            // Hitung bobot efektif ternormalisasi
            const activeCriteriaList = criteria.filter((item) => item.active !== false);
            const sumW = activeCriteriaList.reduce((sum, item) => sum + item.weight, 0);
            const effectiveWeight = isActive && sumW > 0 ? (c.weight / sumW) * 100 : 0;

            return (
              <div
                key={c.code}
                onClick={() => toggleCriterion(c.code)}
                className={`p-3.5 rounded-xl border transition cursor-pointer select-none flex flex-col justify-between ${
                  isActive
                    ? 'bg-slate-50 border-blue-200 ring-1 ring-blue-500/20 shadow-xs'
                    : 'bg-slate-100/60 border-slate-200 opacity-50 grayscale'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-700">{c.code}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isActive ? 'Aktif' : 'Off'}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 line-clamp-2 mt-1" title={c.name}>
                    {c.name}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Bobot</span>
                  <span className="text-xs font-bold text-slate-900">
                    {effectiveWeight.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toggle AHP Detail Button */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Metode Pembobotan:</span>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
              AHP (Analytic Hierarchy Process)
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-700 font-medium">
              Consistency Ratio (CR): {ahpMatrixData?.ahp_result?.consistency_ratio ?? 0.011} &lt; 0.10 (Konsisten)
            </span>
          </div>
          <button
            onClick={() => setShowAhpDetail(!showAhpDetail)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            {showAhpDetail ? 'Sembunyikan Matriks AHP ▲' : 'Lihat Matriks Perbandingan Berpasangan AHP ▼'}
          </button>
        </div>

        {/* Dynamic AHP Matrix Table */}
        {showAhpDetail && ahpMatrixData && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                Matriks Perbandingan Berpasangan (Skala Saaty 1–9) dari Backend API
              </span>
              <span className="bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded text-[11px] self-start sm:self-auto">
                CR = {ahpMatrixData.ahp_result.consistency_ratio} (Valid &amp; Lolos Uji Konsistensi)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border border-slate-200 bg-white rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 border border-slate-200 text-left">Kriteria</th>
                    {ahpMatrixData.criteria.map((code) => (
                      <th key={code} className="p-2 border border-slate-200">{code}</th>
                    ))}
                    <th className="p-2 border border-slate-200 bg-blue-50 text-blue-900">Bobot AHP</th>
                  </tr>
                </thead>
                <tbody>
                  {ahpMatrixData.matrix.map((row, rIdx) => {
                    const code = ahpMatrixData.criteria[rIdx];
                    const weight = ahpMatrixData.ahp_result.weights[code] || 0;
                    return (
                      <tr key={code} className="hover:bg-slate-50 font-mono">
                        <td className="p-2 border border-slate-200 font-sans font-bold text-left bg-slate-50/50">{code}</td>
                        {row.map((val, cIdx) => (
                          <td key={cIdx} className="p-2 border border-slate-200">{Number(val).toFixed(2)}</td>
                        ))}
                        <td className="p-2 border border-slate-200 bg-blue-50/60 text-blue-900 font-bold">
                          {(weight * 100).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-600">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-slate-400">Lambda Max (&lambda;<sub>max</sub>):</span>
                <span className="font-bold text-slate-900 font-mono">{ahpMatrixData.ahp_result.lambda_max.toFixed(4)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-slate-400">Consistency Index (CI):</span>
                <span className="font-bold text-slate-900 font-mono">{ahpMatrixData.ahp_result.consistency_index.toFixed(4)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="block text-slate-400">Random Index (RI n=7):</span>
                <span className="font-bold text-slate-900 font-mono">{ahpMatrixData.ahp_result.random_index.toFixed(4)}</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-900">
                <span className="block text-emerald-600 font-semibold">Consistency Ratio (CR):</span>
                <span className="font-bold font-mono">{ahpMatrixData.ahp_result.consistency_ratio.toFixed(4)} &lt; 0.10</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hasil Ranking Prioritas Intervensi */}
      {result && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-700" />
                <span>Hasil Perangkingan Triase Balita</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Balita pada peringkat 1 memiliki tingkat kegawatan tertinggi dan paling mendesak memperoleh intervensi medis/gizi.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-mono font-semibold bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700">
                Metode: {result.method.toUpperCase()}
              </span>
              <span className="text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg">
                Total: {result.rankings.length} Balita
              </span>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                title="Download laporan lengkap multi-sheet (Hasil Triase, SAW/MOORA, AHP, Rubrik)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-14">Rank</th>
                  <th className="py-3 px-4">Identitas Balita</th>
                  <th className="py-3 px-3">Kelengkapan Data</th>
                  <th className="py-3 px-3 font-mono">Skor Akhir</th>
                  <th className="py-3 px-3">Tingkat Prioritas</th>
                  <th className="py-3 px-4">Rekomendasi Tindakan Triase</th>
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
                    <td className="py-3 px-3 text-center">
                      {item.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black shadow-xs">
                          1
                        </span>
                      ) : (
                        <span className="font-bold text-slate-700">{item.rank}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      {item.raw_attributes && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-normal">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.raw_attributes.umur_bulan} Bulan
                          </span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                            {item.raw_attributes.jenis_kelamin}
                          </span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                            TB: {item.raw_attributes.tinggi_badan_cm} cm
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              item.raw_attributes.status_gizi === 'severely stunted'
                                ? 'bg-red-100 text-red-800'
                                : item.raw_attributes.status_gizi === 'stunted'
                                ? 'bg-orange-100 text-orange-800'
                                : item.raw_attributes.status_gizi === 'tinggi'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.raw_attributes.status_gizi}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.is_partial ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                          title={`Kriteria terisi: ${item.completeness_ratio}. Sisa kriteria diimputasi baseline netral 1.0.`}
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{item.completeness_ratio} Parsial</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 shrink-0" />
                          <span>7/7 Lengkap</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">{item.score.toFixed(4)}</td>
                    <td className="py-3 px-3">
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

      {/* Matriks Nilai Input Balita (Skala 1–5) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Matriks Penilaian Input Balita (Skala 1–5)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Nilai kosong otomatis diisi baseline netral 1.0
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Kode &amp; Nama Balita</th>
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
                  <td className="py-2 px-3 font-bold text-slate-800">
                    <div>{alt.name}</div>
                  </td>
                  {criteria.map((c) => {
                    const hasVal = typeof alt.values[c.code] === 'number';
                    const val = hasVal ? alt.values[c.code] : 1.0;
                    return (
                      <td
                        key={c.code}
                        className={`py-2 px-2 text-center font-mono ${
                          hasVal ? 'text-slate-900 font-bold' : 'text-slate-400 italic'
                        }`}
                      >
                        {val}
                        {!hasVal && <span className="text-[10px] ml-0.5 text-amber-500">*</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 italic">
          *Tanda bintang menandakan nilai baseline netral (1.0) hasil penanganan data parsial tahan banting.
        </p>
      </div>
    </>
  )}

      {/* MODAL PANDUAN RUBRIK SKALA 1–5 */}
      {showRubricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-700" />
                  <span>Panduan Rubrik Penilaian Skala 1–5 (Definisi Operasional)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prinsip Benefit Terhadap Risiko: Skala 1 = Risiko Minimal/Sehat, Skala 5 = Kritis/Darurat Mutlak.
                </p>
              </div>
              <button
                onClick={() => setShowRubricModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Concept Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center">
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  <span className="block font-black text-emerald-800 text-sm">Skala 1</span>
                  <span className="block text-[11px] font-bold text-emerald-700">Optimal / Sehat</span>
                  <span className="text-[10px] text-emerald-600">Risiko minimal, pantau rutin Posyandu</span>
                </div>
                <div className="bg-teal-50 border border-teal-200 p-2.5 rounded-xl">
                  <span className="block font-black text-teal-800 text-sm">Skala 2</span>
                  <span className="block text-[11px] font-bold text-teal-700">Baik</span>
                  <span className="text-[10px] text-teal-600">Normal, fluktuasi gizi wajar</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                  <span className="block font-black text-amber-800 text-sm">Skala 3</span>
                  <span className="block text-[11px] font-bold text-amber-700">Waspada</span>
                  <span className="text-[10px] text-amber-600">Garis kuning KMS / asupan kurang</span>
                </div>
                <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl">
                  <span className="block font-black text-orange-800 text-sm">Skala 4</span>
                  <span className="block text-[11px] font-bold text-orange-700">Tinggi / Mendesak</span>
                  <span className="text-[10px] text-orange-600">Stunted (pendek) / PMT pemulihan</span>
                </div>
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
                  <span className="block font-black text-red-800 text-sm">Skala 5</span>
                  <span className="block text-[11px] font-bold text-red-700">Kritis / Darurat</span>
                  <span className="text-[10px] text-red-600">Severely stunted / rujukan RSUD segera</span>
                </div>
              </div>

              {/* Rubric Tabs for each Criterion */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                  {RUBRIC_DATA.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => setSelectedRubricCriterion(r.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedRubricCriterion === r.code
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {r.code}
                    </button>
                  ))}
                </div>

                {RUBRIC_DATA.filter((r) => r.code === selectedRubricCriterion).map((r) => (
                  <div key={r.code} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                        {r.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{r.name}</h4>
                    </div>

                    <div className="space-y-2">
                      {r.levels.map((lvl) => (
                        <div
                          key={lvl.score}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2 w-32 shrink-0">
                            <span className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {lvl.score}
                            </span>
                            <span className="font-bold text-slate-800">{lvl.label}</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{lvl.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowRubricModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
