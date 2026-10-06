import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import type {
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
  onSiapEkspor: (fn: (() => void) | null) => void;
}

export const DashboardPage: React.FC<Props> = ({ seksi, onSiapEkspor }) => {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [balitas, setBalitas] = useState<Alternative[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [ahp, setAhp] = useState<AhpMatrixResponse | null>(null);

  const [limit, setLimit] = useState(120);
  const [filter, setFilter] = useState('all');
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

  useEffect(() => {
    if (seksi !== 'triase' || !result || !result.rankings.length) {
      onSiapEkspor(null);
      return;
    }
    onSiapEkspor(() => jalankanEkspor);
  }, [seksi, result, jalankanEkspor, onSiapEkspor]);

  const maks = useMemo(
    () => Math.max(0, ...(result?.rankings.map((r) => r.score) ?? [0])),
    [result]
  );

  const baris = useMemo(() => {
    const semua = result?.rankings ?? [];
    if (!cari.trim()) return semua;
    const q = cari.trim().toLowerCase();
    return semua.filter(
      (r) => r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [result, cari]);

  /* ------------------------------------------------------------------ */
  /* SEKSI BUKTI                                                        */
  /* ------------------------------------------------------------------ */
  const jumlahParsial = result?.rankings.filter((r) => r.perlu_verifikasi).length ?? 0;

  // PENTING: hook harus dipanggil sebelum return awal mana pun. Kalau
  // diletakkan setelah cabang 'bukti' atau 'panduan', jumlah hook berubah saat
  // berpindah tab, React melempar error #300, dan seluruh halaman jadi kosong.
  const nBaris = useHitungNaik(baris.length);
  const nTotal = useHitungNaik(result?.rankings.length ?? 0);
  const nParsial = useHitungNaik(jumlahParsial);
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
        <div>
          <label htmlFor="f-sampel" className="block text-xs font-bold uppercase tracking-wider text-tinta-400">
            Jumlah balita
          </label>
          <select
            id="f-sampel"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="mt-1 rounded border border-rambut bg-kertas-100 px-2 py-1.5 text-xs font-semibold text-tinta-900"
          >
            <option value={20}>20 balita</option>
            <option value={50}>50 balita</option>
            <option value={120}>120 balita (seluruh kohort)</option>
          </select>
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
              {barisTampil.map((r, i) => {

                const b = balitas.find((x) => x.id === r.id);
                const t = TINGKAT[r.priority_level];
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-rambut align-middle last:border-0${i < 16 ? ' baris-masuk' : ''}`}
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
                      <PenandaTingkat tingkat={r.priority_level} tampilan={tampilan} />
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
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
