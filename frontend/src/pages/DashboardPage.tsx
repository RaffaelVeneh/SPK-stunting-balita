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
  const [loading, setLoading] = useState(true);
  const [rincian, setRincian] = useState<RankingItem | null>(null);

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
    const gulirBodyLama = document.body.style.overflow;
    const padLama = document.body.style.paddingRight;
    akar.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (lebar > 0) document.body.style.paddingRight = (lebar + 'px');
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRincian(null);
    };
    window.addEventListener('keydown', tekan);
    return () => {
      akar.style.overflow = gulirAkarLama;
      document.body.style.overflow = gulirBodyLama;
      document.body.style.paddingRight = padLama;
      window.removeEventListener('keydown', tekan);
    };
  }, [rincian]);
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
        onPilih={() => {
          /* kriteria terkunci: menekan kolom hanya menyorot, tidak mengubah apa pun */
        }}
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
                <th className="px-3 py-2.5 text-right font-bold text-tinta-400">#</th>
                <th className="px-2 py-2.5 text-left font-bold text-tinta-400">Skor</th>
                <th className="px-3 py-2.5 text-left font-bold text-tinta-400">Kode</th>
                <th className="px-3 py-2.5 text-left font-bold text-tinta-400">Balita</th>
                {criteria.map((c) => (
                  <th
                    key={c.code}
                    className="px-2.5 py-2.5 text-left font-bold text-tinta-400"
                    title={`${c.name} — bobot ${(c.weight * 100).toFixed(2)}%`}
                  >
                    {c.code}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-left font-bold text-tinta-400">Data</th>
                <th className="px-3 py-2.5 text-left font-bold text-tinta-400">Tingkat</th>
                <th className="px-3 py-2.5 text-left font-bold text-tinta-400">Tindakan</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {baris.map((r) => {
                const b = balitas.find((x) => x.id === r.id);
                const t = TINGKAT[r.priority_level];
                return (
                  <tr
                    key={r.id}
                    className="baris-masuk border-b border-rambut align-middle last:border-0"
                    style={{ '--tunda': `${Math.min(baris.indexOf(r), 14) * 26}ms` } as React.CSSProperties}
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
                            <Tally skor={ada ? v : 0} ukuran="sm" />
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
                      <PenandaTingkat tingkat={r.priority_level} />
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
              <PenandaTingkat tingkat={rincian.priority_level} />
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
                      <Tally skor={ada ? v : 0} />
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
