import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import type {
  PilihanEkspor,
  AhpMatrixResponse,
  Alternative,
  CalculationResult,
  Criterion,
  RankingItem,
  User,
} from '../types';
import { exportSpkToExcel } from '../utils/exportExcel';
import { MethodologyGuide } from '../components/MethodologyGuide';
import { ProofPanel } from '../components/ProofPanel';
import { KriteriaDetail } from '../components/KriteriaDetail';
import { FormBalita } from '../components/FormBalita';
import { susunCSV, unduhCSV } from '../utils/ekspor';
import {
  GoresanKelengkapan,
  PenandaTingkat,
  PitaBobot,
  RampCell,
  Tally,
  TINGKAT,
} from '../components/papan';
import { AlertTriangle, X, ShieldAlert, Search } from 'lucide-react';
import { useHitungNaik } from '../hooks/useHitungNaik';

/** Judul kolom yang bisa diklik untuk menyortir. */
const ThSortir: React.FC<{
  kolom: string;
  aktif: boolean;
  arah: 'naik' | 'turun';
  rata?: 'kiri' | 'kanan';
  judul?: string;
  onClick: (kolom: string) => void;
  children: React.ReactNode;
}> = ({ kolom, aktif, arah, rata = 'kiri', judul, onClick, children }) => (
  <th className={`px-3 py-2.5 ${rata === 'kanan' ? 'text-right' : 'text-left'}`}>
    <button
      type="button"
      onClick={() => onClick(kolom)}
      title={`Urutkan menurut ${judul ?? kolom}`}
      aria-label={`Urutkan menurut ${judul ?? kolom}`}
      className={`inline-flex items-center gap-1 font-bold transition-colors ${
        aktif ? 'text-tinta-900' : 'text-tinta-400 hover:text-tinta-700'
      }`}
    >
      {children}
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden className={aktif ? '' : 'opacity-25'}>
        <path
          d={aktif && arah === 'turun' ? 'M4 7 L1 2 L7 2 Z' : 'M4 1 L7 6 L1 6 Z'}
          fill="currentColor"
        />
      </svg>
    </button>
  </th>
);
export type Seksi = 'triase' | 'bukti' | 'panduan';

interface Props {
  user: User;
  seksi: Seksi;
  onSiapEkspor: (pilihan: PilihanEkspor[] | null) => void;
}

export const DashboardPage: React.FC<Props> = ({ seksi, onSiapEkspor }) => {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [balitas, setBalitas] = useState<Alternative[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [ahp, setAhp] = useState<AhpMatrixResponse | null>(null);

  // Penyaring jumlah dihapus karena sudah ada pagination. Seluruh data tetap
  // dimuat sekaligus (dibatasi 500, batas atas API), lalu dipotong per halaman.
  const limit = 500;
  const [filter, setFilter] = useState('all');

  // Penyaring status keaktifan. Bawaannya "semua" supaya tidak ada baris yang
  // tersembunyi tanpa disadari — penyaring yang menyembunyikan data sejak awal
  // membuat orang mengira datanya hilang.
  const [filterAktif, setFilterAktif] = useState<'semua' | 'aktif' | 'nonaktif'>('semua');
  const [cari, setCari] = useState('');

  // Goresan tally atau angka mentah. Angka berguna saat pengguna perlu membaca
  // nilai dengan cepat atau menyalinnya; goresan lebih cepat dipindai sekilas.
  // Pilihannya diingat supaya tidak perlu diulang tiap kali halaman dibuka.
  const [tampilan, setTampilan] = useState<'goresan' | 'angka'>(() => {
    if (typeof window === 'undefined') return 'goresan';
    return window.localStorage.getItem('spk_tampilan') === 'angka' ? 'angka' : 'goresan';
  });
  useEffect(() => {
    window.localStorage.setItem('spk_tampilan', tampilan);
  }, [tampilan]);
  const [loading, setLoading] = useState(true);
  const [rincian, setRincian] = useState<RankingItem | null>(null);
  const [kriteriaTerbuka, setKriteriaTerbuka] = useState<string | null>(null);

  // --- CRUD data balita ---
  const [form, setForm] = useState<{ mode: 'tambah' | 'edit'; data?: Alternative } | null>(null);

  // Galat aksi ditampilkan di halaman, bukan lewat window.alert. Alert
  // memblokir seluruh halaman sampai ditekan, sehingga satu permintaan gagal
  // bisa membuat antarmuka tampak macet.
  const [galatAksi, setGalatAksi] = useState<string | null>(null);
  const [diperbarui, setDiperbarui] = useState<Record<string, string | null>>({});

  const muatStatus = useCallback(async () => {
    try {
      const r = await api.daftarBalita();

      const waktu: Record<string, string | null> = {};
      r.data.forEach((b) => {
        waktu[b.id] = b.diperbarui_pada ?? null;
      });
      setDiperbarui(waktu);
    } catch {
      // Daftar tetap tampil walau status gagal dimuat.
    }
  }, []);

  useEffect(() => {
    void muatStatus();
  }, [muatStatus]);

  /* --- muat metadata sekali --- */
  useEffect(() => {
    (async () => {
      const [c, a] = await Promise.all([api.getCriteria(), api.getAhpMatrix()]);
      setCriteria(c ?? []);
      setAhp(a);
    })();
  }, []);

  /* --- muat sampel --- */
  useEffect(() => {
    (async () => {
      const s = await api.getDatasetSamples(limit, 0, filter, false);
      setBalitas(s?.samples ?? []);
    })();
  }, [limit, filter]);

  /* --- hitung --- */
  const hitung = useCallback(async () => {
    if (!balitas.length || !criteria.length) return;
    setLoading(true);
    try {
      const data = await api.calculate(balitas, criteria);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [balitas, criteria]);

  useEffect(() => {
    hitung();
  }, [hitung]);

  /* --- aksi ekspor dipasang ke pita kepala --- */
  // PENTING: setAksiEkspor adalah setter useState. Memberinya sebuah fungsi
  // membuat React memperlakukannya sebagai updater dan memanggilnya, sehingga
  // handler-nya tidak pernah tersimpan dan tombol Ekspor tidak muncul.
  // Handler karena itu dibungkus updater yang MENGEMBALIKAN handler.
  const jalankanEkspor = useCallback(() => {
    if (!result || !criteria.length) return;
    exportSpkToExcel({ result, criteria, balitas, ahpData: ahp });
  }, [result, criteria, balitas, ahp]);


  const maks = useMemo(
    () => Math.max(0, ...(result?.rankings.map((r) => r.score) ?? [0])),
    [result]
  );

  // Hasil resmi (balita aktif) digabung dengan daftar rujukan (balita nonaktif)
  // lalu diurutkan menurut skor, supaya baris nonaktif berada di POSISINYA,
  // bukan di paling bawah. Skor keduanya berasal dari basis normalisasi yang
  // sedikit berbeda — resmi atas yang aktif, rujukan atas seluruhnya — dengan
  // selisih sekitar 1,45 persen. Urutannya karena itu perkiraan posisi, bukan
  // peringkat resmi.
  const gabungan = useMemo(() => {
    const resmi = result?.rankings ?? [];
    const rujukan = result?.nonaktif ?? [];
    if (rujukan.length === 0) return resmi;
    return [...resmi, ...rujukan].sort((a, b) => b.score - a.score);
  }, [result]);

  const baris = useMemo(() => {
    let semua = gabungan;

    if (filterAktif !== 'semua') {
      semua = semua.filter((r) =>
        filterAktif === 'aktif' ? r.aktif !== false : r.aktif === false,
      );
    }

    if (!cari.trim()) return semua;
    const q = cari.trim().toLowerCase();
    return semua.filter(
      (r) => r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [gabungan, cari, filterAktif]);

  /* ------------------------------------------------------------------ */
  /* SEKSI BUKTI                                                        */
  /* ------------------------------------------------------------------ */
  const jumlahParsial = result?.rankings.filter((r) => r.perlu_verifikasi).length ?? 0;

  // PENTING: hook harus dipanggil sebelum return awal mana pun. Kalau
  // diletakkan setelah cabang 'bukti' atau 'panduan', jumlah hook berubah saat
  // berpindah tab, React melempar error #300, dan seluruh halaman jadi kosong.

  // Kunci gulir halaman selama rincian terbuka, supaya latar tidak ikut
  // bergulir di belakang panel. Lebar bilah gulir dikompensasi sebagai padding
  // kanan supaya tata letak tidak melompat saat bilahnya menghilang.
  // Efek ini WAJIB berada sebelum return awal mana pun — ia juga sebuah hook.
  useEffect(() => {
    if (!rincian) return;
    // Yang benar-benar menggulir halaman ini adalah <html>, bukan <body>.
    // Mengunci overflow hanya di <body> tidak menghentikan gulir sama sekali —
    // sudah diuji: window.scrollTo tetap bergerak 600px. Karena itu keduanya
    // dikunci, dan kompensasi lebar bilah dipasang di <body>.
    const akar = document.documentElement;
    const lebar = window.innerWidth - akar.clientWidth;
    const gulirAkarLama = akar.style.overflow;
    const padLama = document.body.style.paddingRight;
    // HANYA <html> yang dikunci, dan itu disengaja. Memasang overflow hidden
    // pada <html> DAN <body> sekaligus menjadikan <body> scrollport tersendiri;
    // elemen sticky di dalamnya lalu mengikat ke scrollport itu, sehingga rel
    // dan pita kepala melompat keluar layar begitu rincian dibuka. Diuji:
    // html+body -> nav top -1000; html saja -> nav top 0, gulir tetap terkunci.
    akar.style.overflow = 'hidden';
    if (lebar > 0) document.body.style.paddingRight = (lebar + 'px');
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRincian(null);
    };
    window.addEventListener('keydown', tekan);
    return () => {
      akar.style.overflow = gulirAkarLama;
      document.body.style.paddingRight = padLama;
      window.removeEventListener('keydown', tekan);
    };
  }, [rincian]);
  // --- Sortir tabel ---
  const [urut, setUrut] = useState<{ kolom: string; arah: 'naik' | 'turun' }>({
    kolom: 'rank',
    arah: 'naik',
  });

  const klikSortir = useCallback((kolom: string) => {
    setUrut((s) =>
      s.kolom === kolom
        ? { kolom, arah: s.arah === 'naik' ? 'turun' : 'naik' }
        : {
            kolom,
            // Kolom teks mulai dari A–Z, kolom angka mulai dari yang terbesar.
            arah: kolom === 'id' || kolom === 'name' ? 'naik' : 'turun',
          },
    );
  }, []);

  // --- Pagination: maksimal 100 baris per halaman ---
  const PER_HALAMAN = 100;
  const [halaman, setHalaman] = useState(1);

  const barisTampil = useMemo(() => {
    const URUT_TINGKAT: Record<string, number> = {
      'Sangat Tinggi': 0,
      Tinggi: 1,
      Sedang: 2,
      Rendah: 3,
    };
    const nilai = (r: RankingItem): number | string => {
      if (urut.kolom === 'rank') return r.rank;
      if (urut.kolom === 'score') return r.score;
      if (urut.kolom === 'id') return r.id;
      if (urut.kolom === 'name') return r.name;
      if (urut.kolom === 'tingkat') return URUT_TINGKAT[r.priority_level] ?? 9;
      const nilaiBalita = balitas.find((x) => x.id === r.id)?.values ?? {};
      if (urut.kolom === 'data') {
        return Object.values(nilaiBalita).filter((v) => typeof v === 'number' && v > 0)
          .length;
      }
      const v = nilaiBalita[urut.kolom];
      // Sel kosong selalu di bawah, ke arah mana pun diurutkan.
      return typeof v === 'number' ? v : -1;
    };
    const tanda = urut.arah === 'naik' ? 1 : -1;
    return [...baris].sort((a, b) => {
      const va = nilai(a);
      const vb = nilai(b);
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb, 'id') * tanda;
      }
      return ((va as number) - (vb as number)) * tanda;
    });
  }, [baris, urut, balitas]);

  /**
   * Ekspor CSV dari daftar yang SEDANG tampil setelah disaring dan disortir —
   * bukan hanya halaman yang terlihat. Yang diunduh adalah seluruh hasil
   * penyaringan, karena itulah yang diharapkan orang ketika menekan Ekspor.
   *
   * Balita nonaktif ikut bila penyaringnya memuat mereka. Kolom Status
   * membedakannya, dan kolom Peringkat dibiarkan kosong untuk mereka karena
   * peringkat resmi hanya berlaku bagi balita aktif. Posisi mereka dari
   * perhitungan rujukan ditaruh di kolom terpisah supaya tidak tertukar dengan
   * peringkat resmi.
   */
  const eksporCSV = useCallback(() => {
    const peta = new Map(balitas.map((b) => [b.id, b]));

    const kolom = [
      'Peringkat resmi', 'Kode', 'Nama', 'Usia (bulan)', 'Jenis kelamin',
      'Tinggi (cm)', 'HAZ', 'Status gizi', 'Tren memburuk',
      'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7',
      'Skor MOORA', 'Tingkat prioritas', 'Tindakan', 'Status',
      'Peringkat bila diaktifkan',
    ];

    const isi = barisTampil.map((r) => {
      const b = peta.get(r.id);
      const v = (b?.values ?? {}) as Record<string, number>;
      const ra = (b?.raw_attributes ?? {}) as Record<string, unknown>;
      const nonaktif = r.aktif === false;

      return [
        nonaktif ? '' : r.rank,
        r.id,
        r.name,
        ra.umur_bulan as number,
        ra.jenis_kelamin as string,
        ra.tinggi_badan_cm as number,
        ra.haz as number,
        ra.status_gizi as string,
        ra.tren_memburuk ? 'Ya' : 'Tidak',
        v.C1, v.C2, v.C3, v.C4, v.C5, v.C6, v.C7,
        Number(r.score).toFixed(6),
        nonaktif ? 'Nonaktif' : r.priority_level,
        nonaktif ? 'Tidak ikut perhitungan' : (r.tindakan ?? ''),
        nonaktif ? 'Nonaktif' : 'Aktif',
        nonaktif ? r.rank : '',
      ];
    });

    const tanggal = new Date().toISOString().slice(0, 10);
    unduhCSV(`spk-stunting-prioritas-${tanggal}.csv`, susunCSV(kolom, isi));
  }, [balitas, barisTampil]);
  // Diletakkan SETELAH eksporCSV karena ia memakainya, dan masih SEBELUM
  // return awal mana pun sesuai aturan hook. Menaruhnya di atas akan memakai
  // eksporCSV sebelum dideklarasikan.
  useEffect(() => {
    if (seksi !== 'triase' || !result || !result.rankings.length) {
      onSiapEkspor(null);
      return;
    }

    onSiapEkspor([
      {
        label: 'Excel (.xlsx)',
        ket: 'Empat lembar: hasil triase, perhitungan MOORA, pembobotan AHP, dan tahapan fuzzy.',
        jalankan: jalankanEkspor,
      },
      {
        label: 'CSV (.csv)',
        ket: 'Satu tabel datar berisi daftar yang sedang tampil setelah disaring dan disortir.',
        jalankan: eksporCSV,
      },
    ]);
  }, [seksi, result, jalankanEkspor, eksporCSV, onSiapEkspor]);


  const totalHalaman = Math.max(1, Math.ceil(barisTampil.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const barisHalaman = barisTampil.slice(
    (halamanAman - 1) * PER_HALAMAN,
    halamanAman * PER_HALAMAN,
  );
  // Angka yang bergulir naik. Angka pertama adalah yang BENAR-BENAR tampil di
  // halaman ini, bukan seluruh hasil penyaringan, supaya penghitungnya sesuai
  // dengan yang terlihat: "100 dari 120" saat halaman berisi 100 baris.
  // Angka kedua tetap total seluruh balita, supaya penyaringan tidak
  // menghilangkan gambaran besarnya.
  const nBaris = useHitungNaik(barisHalaman.length);
  const nTotal = useHitungNaik(result?.rankings.length ?? 0);
  const nParsial = useHitungNaik(jumlahParsial);

  if (seksi === 'bukti') {
    return (
      <div className="masuk">
        <ProofPanel ahp={ahp} criteria={criteria} />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* SEKSI PANDUAN                                                      */
  /* ------------------------------------------------------------------ */
  if (seksi === 'panduan') {
    return (
      <div className="masuk px-4 py-5 sm:px-6">
        <MethodologyGuide criteria={criteria} balitas={balitas} result={result} ahpData={ahp} />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* SEKSI TRIASE                                                       */
  /* ------------------------------------------------------------------ */
  // Wadah tabel TIDAK dijadikan kontainer gulir. Sebelumnya hanya overflow-x-auto,
  // sehingga position: sticky pada kepala tabel menempel ke kontainer itu yang tidak
  // menggulir vertikal — kepala tabel tidak pernah menempel. Kalau dijadikan
  // kontainer gulir ber-max-height, halaman jadi tidak memuat seluruh baris dan
  // gulir bersarang menyulitkan layar sentuh. Jalan tengahnya: di layar lebar
  // (tempat tabel 1120px muat) overflow dilepas supaya sticky menempel ke layar,
  // dan di layar sempit tetap bisa digulir mendatar.

  // (dipindah ke atas, sebelum return awal)

  return (
    <div className="masuk">
      {/* Pita bobot: urutan di bawah ini berasal dari lebar kolom ini. */}
      <PitaBobot
        criteria={criteria}
        terpilih={kriteriaTerbuka}
        onPilih={(kode) => setKriteriaTerbuka(kode)}
      />

      {/* Kendali: standar web, bukan kostum dunia. */}
      <div className="flex flex-wrap items-end gap-3 border-b border-rambut bg-kertas-50 px-4 py-3 sm:px-6">
        {/* Pagination menggantikan penyaring jumlah balita: dengan halaman,
            mengatur berapa baris dimuat sudah tidak diperlukan lagi. */}
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-tinta-400">
            Halaman
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHalaman((h) => Math.max(1, h - 1))}
              disabled={halamanAman <= 1}
              className="rounded border border-rambut bg-kertas-100 px-2 py-1.5 text-xs font-bold text-tinta-700 transition-colors hover:bg-kertas-200 disabled:text-tinta-400"
            >
              Sebelumnya
            </button>
            <span className="tnum px-1 text-xs font-bold text-tinta-900">
              {halamanAman} / {totalHalaman}
            </span>
            <button
              type="button"
              onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
              disabled={halamanAman >= totalHalaman}
              className="rounded border border-rambut bg-kertas-100 px-2 py-1.5 text-xs font-bold text-tinta-700 transition-colors hover:bg-kertas-200 disabled:text-tinta-400"
            >
              Berikutnya
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="f-status" className="block text-xs font-bold uppercase tracking-wider text-tinta-400">
            Status gizi
          </label>
          <select
            id="f-status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-1 rounded border border-rambut bg-kertas-100 px-2 py-1.5 text-xs font-semibold text-tinta-900"
          >
            <option value="all">Semua status</option>
            <option value="severely stunted">Severely stunted</option>
            <option value="stunted">Stunted</option>
            <option value="normal">Normal</option>
            <option value="tinggi">Tinggi</option>
          </select>
        </div>

        <div>
          <label htmlFor="f-aktif" className="block text-xs font-bold uppercase tracking-wider text-tinta-400">
            Status data
          </label>
          <select
            id="f-aktif"
            value={filterAktif}
            onChange={(e) => setFilterAktif(e.target.value as 'semua' | 'aktif' | 'nonaktif')}
            className="mt-1 rounded border border-rambut bg-kertas-100 px-2 py-1.5 text-xs font-semibold text-tinta-900"
          >
            <option value="semua">Semua</option>
            <option value="aktif">Aktif saja</option>
            <option value="nonaktif">Nonaktif saja</option>
          </select>
        </div>

        <div className="min-w-[180px] flex-1">
          <label htmlFor="f-cari" className="block text-xs font-bold uppercase tracking-wider text-tinta-400">
            Cari kode atau nama
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tinta-400" strokeWidth={2} />
            <input
              id="f-cari"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="mis. BAL-0047"
              className="w-full rounded border border-rambut bg-kertas-100 py-1.5 pl-7 pr-2 text-xs text-tinta-900"
            />
          </div>
        </div>

        <div className="inline-flex border border-rambut" role="group" aria-label="Bentuk tampilan skor kriteria">
          {([
            ['goresan', 'Goresan'],
            ['angka', 'Angka'],
          ] as const).map(([nilai, label]) => (
            <button
              key={nilai}
              type="button"
              onClick={() => setTampilan(nilai)}
              aria-pressed={tampilan === nilai}
              className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${
                tampilan === nilai
                  ? 'bg-papan-700 text-kapur-50'
                  : 'bg-kertas-50 text-tinta-500 hover:bg-kertas-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {galatAksi && (
          <p className="flex items-center gap-2 border border-pigmen-merah/40 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
            {galatAksi}
            <button
              type="button"
              onClick={() => setGalatAksi(null)}
              className="ml-2 underline"
            >
              tutup
            </button>
          </p>
        )}
        <button
          type="button"
          onClick={() => setForm({ mode: 'tambah' })}
          className="rounded bg-papan-700 px-3 py-1.5 text-xs font-bold text-kapur-50 transition-colors hover:bg-papan-600"
        >
          Tambah balita
        </button>

        <p className="ml-auto text-xs text-tinta-500">
          <span className="tnum font-bold text-tinta-900">{Math.round(nBaris)}</span> dari{' '}
          <span className="tnum">{Math.round(nTotal)}</span> balita
          {jumlahParsial > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-amber-900">
                {Math.round(nParsial)} balita dengan data &lt;5/7
              </span>
            </>
          )}
        </p>
      </div>

      {jumlahParsial > 0 && (
        <div className="flex items-start gap-3 border-b border-rambut bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900 sm:px-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-900" strokeWidth={2} />
          <p className="max-w-[92ch]">
            Sebagian balita belum lengkap tujuh kriteria. Bobot tetap terkunci &mdash; kriteria
            yang kosong <strong className="font-bold">dikeluarkan</strong> dari penjumlahan, bukan
            diisi angka rekaan, sehingga skornya lebih rendah karena buktinya memang lebih sedikit.
            Tingkat prioritas tidak diambil dari skor, jadi tingkatnya tidak ikut turun.
          </p>
        </div>
      )}

      {loading && !result ? (
        <p className="px-4 py-16 text-center text-sm text-tinta-500 sm:px-6">
          Menghitung peringkat&hellip;
        </p>
      ) : (
        <div className="overflow-x-auto lg:overflow-visible">
          <table className="w-full min-w-[1120px] text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-rambut">
                <ThSortir kolom="rank" aktif={urut.kolom === 'rank'} arah={urut.arah} rata="kanan" judul="peringkat" onClick={klikSortir}>#</ThSortir>
                <ThSortir kolom="score" aktif={urut.kolom === 'score'} arah={urut.arah} judul="skor" onClick={klikSortir}>Skor</ThSortir>
                <ThSortir kolom="id" aktif={urut.kolom === 'id'} arah={urut.arah} judul="kode balita" onClick={klikSortir}>Kode</ThSortir>
                <ThSortir kolom="name" aktif={urut.kolom === 'name'} arah={urut.arah} judul="nama balita" onClick={klikSortir}>Balita</ThSortir>
                {criteria.map((c) => (
                  <ThSortir
                    key={c.code}
                    kolom={c.code}
                    aktif={urut.kolom === c.code}
                    arah={urut.arah}
                    judul={`${c.name} (bobot ${(c.weight * 100).toFixed(2)}%)`}
                    onClick={klikSortir}
                  >
                    {c.code}
                  </ThSortir>
                ))}
                <ThSortir kolom="data" aktif={urut.kolom === 'data'} arah={urut.arah} judul="kelengkapan data" onClick={klikSortir}>Data</ThSortir>
                <ThSortir kolom="tingkat" aktif={urut.kolom === 'tingkat'} arah={urut.arah} judul="tingkat prioritas" onClick={klikSortir}>Tingkat</ThSortir>
                <th className="px-3 py-2.5 text-left font-bold text-tinta-400">Tindakan</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {barisHalaman.map((r, i) => {

                const b = balitas.find((x) => x.id === r.id);
                const t = TINGKAT[r.priority_level];
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-rambut align-middle last:border-0${i < 16 && r.aktif !== false ? ' baris-masuk' : ''}${r.aktif === false ? ' bg-kertas-200 opacity-50' : ' bg-kertas-50'}`}
                    style={i < 16 ? ({ '--tunda': `${i * 26}ms` } as React.CSSProperties) : undefined}
                  >
                    <td className="tnum px-3 py-2 text-right font-display text-base font-bold text-tinta-900">
                      <span className="tanda-baris mr-1.5" aria-hidden />
                      {r.rank}
                    </td>
                    <td className="px-2 py-2">
                      <RampCell nilai={r.score} maks={maks} />
                    </td>
                    <td className="px-3 py-2 font-bold text-papan-700">{r.id}</td>
                    <td className="px-3 py-2 text-tinta-700">
                      <span className="block max-w-[26ch] truncate" title={r.name}>
                        {r.name}
                      </span>
                      <span className="text-xs text-tinta-400">
                        {b?.raw_attributes?.status_gizi ?? '—'}
                        {b?.raw_attributes?.umur_bulan != null
                          ? ` · ${b.raw_attributes.umur_bulan} bln`
                          : ''}
                      </span>
                    </td>
                    {criteria.map((c) => {
                      const v = b?.values?.[c.code];
                      const ada = typeof v === 'number';
                      return (
                        <td key={c.code} className="px-2.5 py-2">
                          <span className={ada ? t.warna : 'text-tinta-400'}>
                            {tampilan === 'angka' ? (
                              ada ? (
                                <span className="tnum text-xs font-bold">{v}</span>
                              ) : (
                                <span className="text-xs text-tinta-400">&mdash;</span>
                              )
                            ) : (
                              <Tally skor={ada ? v : 0} ukuran="sm" />
                            )}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">
                      <span
                        className={
                          r.perlu_verifikasi ? 'text-amber-900' : 'text-pigmen-hijau'
                        }
                      >
                        <GoresanKelengkapan
                          terisi={Number((r.completeness_ratio ?? '0/7').split('/')[0])}
                          total={Number((r.completeness_ratio ?? '0/7').split('/')[1])}
                          perluVerifikasi={r.perlu_verifikasi}
                        />
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.aktif === false ? (
                        <span className="bg-tinta-500 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-kapur-50">
                          Nonaktif
                        </span>
                      ) : (
                        <PenandaTingkat tingkat={r.priority_level} tampilan={tampilan} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-tinta-500">
                      <span className="block max-w-[30ch]">{r.tindakan ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setRincian(r)}
                        className="whitespace-nowrap rounded border border-rambut px-2 py-1 text-xs font-bold text-papan-700 transition-colors hover:bg-papan-700 hover:text-kapur-50"
                      >
                        Rincian
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ mode: 'edit', data: balitas.find((x) => x.id === r.id) ?? undefined })}
                        className="ml-1.5 whitespace-nowrap rounded border border-rambut px-2 py-1 text-xs font-bold text-tinta-700 transition-colors hover:bg-kertas-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setGalatAksi(null);
                            // Ubah tampilannya di layar LEBIH DULU. Tanpa ini
                            // pengguna harus menunggu satu perjalanan ke server
                            // ditambah satu perhitungan penuh sebelum melihat
                            // apa pun berubah, dan di VPS itu terasa seperti
                            // tombolnya tidak bekerja.
                            setResult((lama) =>
                              lama
                                ? {
                                    ...lama,
                                    rankings: lama.rankings.map((x) =>
                                      x.id === r.id ? { ...x, aktif: x.aktif === false } : x,
                                    ),
                                  }
                                : lama,
                            );
                            await api.ubahStatusAktif(r.id);
                            await muatStatus();
                            // WAJIB: tanpa menghitung ulang, tabel masih merender
                            // hasil perhitungan lama sehingga barisnya tidak
                            // bergerak dan tombolnya tidak terlihat berubah.
                            await hitung();
                          } catch (e) {
                            setGalatAksi(e instanceof Error ? e.message : 'Status gagal diubah.');
                          }
                        }}
                        className={`ml-1.5 whitespace-nowrap rounded border border-rambut px-2 py-1 text-xs font-bold transition-colors ${
                          r.aktif === false
                            ? 'text-papan-700 hover:bg-kertas-200'
                            : 'text-amber-900 hover:bg-amber-50'
                        }`}
                      >
                        {r.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* FORM TAMBAH / EDIT DATA BALITA */}
      {form && (
        <FormBalita
          mode={form.mode}
          awal={form.data ?? null}
          criteria={criteria}
          onTutup={() => setForm(null)}
          onSimpan={async (nilai) => {
            if (form.mode === 'tambah') {
              await api.tambahBalita(nilai as unknown as Record<string, unknown>);
            } else {
              await api.ubahBalita(form.data!.id, nilai as unknown as Record<string, unknown>);
            }
            setForm(null);
            await muatStatus();
            await hitung();
          }}
        />
      )}
      {/* DETAIL KRITERIA — dibuka dari pita bobot. */}
      {kriteriaTerbuka &&
        (() => {
          const c = criteria.find((x) => x.code === kriteriaTerbuka);
          if (!c) return null;
          return (
            <KriteriaDetail
              kriteria={c}
              tfn={ahp?.ahp_result?.tfn?.[kriteriaTerbuka]}
              tegas={ahp?.ahp_result?.weights?.[kriteriaTerbuka]}
              onTutup={() => setKriteriaTerbuka(null)}
            />
          );
        })()}
      {/* PAGINATION — maksimal 100 baris per halaman. */}
      {totalHalaman > 1 && (
        <div className="flex items-center gap-3 px-1 py-3">
          <p className="text-xs text-tinta-500">
            Halaman <span className="tnum font-bold text-tinta-900">{halamanAman}</span> dari{' '}
            <span className="tnum">{totalHalaman}</span> ·{' '}
            <span className="tnum">{barisTampil.length}</span> balita
          </p>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHalaman((h) => Math.max(1, h - 1))}
              disabled={halamanAman <= 1}
              className="rounded border border-rambut px-2.5 py-1 text-xs font-bold text-tinta-700 transition-colors hover:bg-kertas-200 disabled:text-tinta-400"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
              disabled={halamanAman >= totalHalaman}
              className="rounded border border-rambut px-2.5 py-1 text-xs font-bold text-tinta-700 transition-colors hover:bg-kertas-200 disabled:text-tinta-400"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

            {/* RINCIAN PER BALITA                                                */}
      {/* ------------------------------------------------------------------ */}
      {/* Panel rincian dirender lewat portal ke <body>. Alasannya bukan gaya:
          pembungkus halaman memakai kelas `masuk` yang meninggalkan
          transform dan filter permanen, dan keduanya menjadikan elemen itu
          patokan position: fixed. Tanpa portal, inset-0 panel mengacu ke
          pembungkus setinggi seluruh halaman, bukan ke layar, sehingga isinya
          tidak terjangkau. */}
      {rincian &&
        createPortal(
        <div
          className="anim anim-geser fixed inset-0 z-40 flex justify-end bg-tinta-900/45"
          role="dialog"
          aria-modal="true"
          aria-label={`Rincian ${rincian.id}`}
          onClick={() => setRincian(null)}
        >
          <div
            className="masuk h-full max-h-full w-full max-w-[560px] overflow-y-auto overscroll-contain bg-kertas-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="papan sticky top-0 z-10 flex items-start gap-3 bg-papan-700 px-5 py-4 text-kapur-50">
              <div className="min-w-0">
                <p className="font-display text-lg font-bold leading-none">{rincian.id}</p>
                <p className="mt-1 truncate text-xs text-kapur-300">{rincian.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setRincian(null)}
                aria-label="Tutup rincian"
                className="ml-auto rounded p-1 text-kapur-200 transition-colors hover:bg-papan-600 hover:text-kapur-50"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-rambut px-5 py-3">
              <p className="text-xs text-tinta-500">
                Peringkat{' '}
                <span className="tnum font-display text-base font-bold text-tinta-900">
                  {rincian.rank}
                </span>
              </p>
              <p className="text-xs text-tinta-500">
                Skor MOORA{' '}
                <span className="tnum font-bold text-tinta-900">{rincian.score.toFixed(4)}</span>
              </p>
              <PenandaTingkat tingkat={rincian.priority_level} tampilan={tampilan} />
            </div>

            {/* Alasan tingkat: dibaca dari aturan klinis, bukan dari skor. */}
            <div className="border-b border-rambut bg-kertas-50 px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-tinta-400">
                Dasar tingkat prioritas
              </p>
              <p className="mt-1 max-w-[68ch] text-xs leading-relaxed text-tinta-700">
                {rincian.details?.tingkat_dasar ?? '—'}
              </p>
              <p className="mt-1.5 text-xs text-tinta-400">
                Tingkat diambil dari aturan klinis atas profil balita ini, bukan dari skornya.
                Skor hanya menentukan urutan.
              </p>
            </div>

            <div className="divide-y divide-rambut">
              {criteria.map((c) => {
                const b = balitas.find((x) => x.id === rincian.id);
                const v = b?.values?.[c.code];
                const ada = typeof v === 'number';
                const t = TINGKAT[rincian.priority_level];
                return (
                  <div key={c.code} className="flex items-start gap-4 px-5 py-3">
                    <span className="font-display text-sm font-bold text-papan-700">
                      {c.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-tinta-900">{c.name}</p>
                      <p className="mt-0.5 text-xs text-tinta-500">
                        Bobot terkunci {(c.weight * 100).toFixed(2)}%
                        {c.tier ? ` · Tier ${c.tier}` : ''}
                        {c.jalur ? ` · ${c.jalur}` : ''}
                      </p>
                      {!ada && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                          <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />
                          Belum ada data &mdash; dikeluarkan dari perhitungan
                        </p>
                      )}
                    </div>
                    <span className={ada ? t.warna : 'text-tinta-400'}>
                      {tampilan === 'angka' ? (
                        ada ? (
                          <span className="tnum text-sm font-bold">{v}</span>
                        ) : (
                          <span className="text-sm text-tinta-400">&mdash;</span>
                        )
                      ) : (
                        <Tally skor={ada ? v : 0} />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-rambut px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-tinta-400">
                Terakhir diubah
              </p>
              <p className="tnum mt-1 text-xs text-tinta-700">
                {diperbarui[rincian.id]
                  ? new Date(diperbarui[rincian.id] as string).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Belum pernah diubah sejak dimuat sistem'}
              </p>
            </div>
            <div className="border-t border-rambut px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-tinta-400">
                Tindakan
              </p>
              <p className="mt-1 text-xs font-semibold text-tinta-900">
                {rincian.tindakan ?? '—'}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};