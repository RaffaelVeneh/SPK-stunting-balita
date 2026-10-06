import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Alternative, Criterion } from '../types';

/* ============================================================================
   FORM TAMBAH / EDIT DATA BALITA
   Ketujuh kriteria WAJIB diisi 1-5. Server menolak data yang tidak lengkap,
   dan form ini mencegahnya lebih dulu supaya pengguna tidak menunggu
   perjalanan bolak-balik hanya untuk mendapat galat.
   ========================================================================== */

type NilaiForm = {
  kode: string;
  nama: string;
  usia_bulan: number;
  jenis_kelamin: string;
  tinggi_badan_cm: number;
  haz: number;
  status_gizi: string;
  tren_memburuk: boolean;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  c6: number;
  c7: number;
};

const KOSONG: NilaiForm = {
  kode: '',
  nama: '',
  usia_bulan: 24,
  jenis_kelamin: 'Laki-Laki',
  tinggi_badan_cm: 80,
  haz: -1,
  status_gizi: 'normal',
  tren_memburuk: false,
  c1: 3,
  c2: 3,
  c3: 3,
  c4: 3,
  c5: 3,
  c6: 3,
  c7: 3,
};

const STATUS = ['tinggi', 'normal', 'stunted', 'severely stunted'];

interface Props {
  mode: 'tambah' | 'edit';
  awal?: Alternative | null;
  criteria: Criterion[];
  onTutup: () => void;
  onSimpan: (nilai: NilaiForm) => Promise<void>;
}

export const FormBalita: React.FC<Props> = ({ mode, awal, criteria, onTutup, onSimpan }) => {
  const [nilai, setNilai] = useState<NilaiForm>({ ...KOSONG });
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && awal) {
      const v = (awal.values ?? {}) as Record<string, number>;
      const r = (awal.raw_attributes ?? {}) as Record<string, unknown>;
      setNilai({
        kode: awal.id,
        nama: awal.name,
        usia_bulan: Number(r.umur_bulan ?? 24),
        jenis_kelamin: String(r.jenis_kelamin ?? 'Laki-Laki'),
        tinggi_badan_cm: Number(r.tinggi_badan_cm ?? 80),
        haz: Number(r.haz ?? -1),
        status_gizi: String(r.status_gizi ?? 'normal'),
        tren_memburuk: Boolean(r.tren_memburuk),
        c1: Number(v.C1 ?? 3), c2: Number(v.C2 ?? 3), c3: Number(v.C3 ?? 3),
        c4: Number(v.C4 ?? 3), c5: Number(v.C5 ?? 3), c6: Number(v.C6 ?? 3),
        c7: Number(v.C7 ?? 3),
      });
    }
  }, [mode, awal]);

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup();
    };
    window.addEventListener('keydown', tekan);
    return () => window.removeEventListener('keydown', tekan);
  }, [onTutup]);

  const ubah = <K extends keyof NilaiForm>(k: K, v: NilaiForm[K]) =>
    setNilai((s) => ({ ...s, [k]: v }));

  const simpan = async () => {
    setGalat(null);
    if (!nilai.nama.trim()) return setGalat('Nama tidak boleh kosong.');
    if (mode === 'tambah' && !/^[A-Za-z0-9-]{2,20}$/.test(nilai.kode.trim())) {
      return setGalat('Kode wajib 2-20 karakter, hanya huruf, angka, dan tanda hubung.');
    }
    setMenyimpan(true);
    try {
      await onSimpan(mode === 'tambah' ? { ...nilai, kode: nilai.kode.trim().toUpperCase() } : nilai);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Data gagal disimpan.');
    } finally {
      setMenyimpan(false);
    }
  };

  const kelasInput =
    'w-full rounded border border-rambut bg-kertas-50 px-2.5 py-1.5 text-xs text-tinta-900 focus:border-papan-500';
  const kelasLabel = 'text-[11px] font-bold uppercase tracking-wide text-tinta-400';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tinta-900/55 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'tambah' ? 'Tambah data balita' : `Edit data ${awal?.id ?? ''}`}
      onClick={onTutup}
    >
      <div
        className="anim anim-masuk w-full max-w-[720px] bg-kertas-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 bg-papan-700 px-5 py-3.5 text-kapur-50">
          <p className="font-display text-lg font-bold leading-none">
            {mode === 'tambah' ? 'Tambah balita' : `Edit ${awal?.id}`}
          </p>
          <p className="text-xs text-kapur-300">
            {mode === 'tambah'
              ? 'Ketujuh kriteria wajib diisi.'
              : 'Perubahan langsung dipakai perhitungan berikutnya.'}
          </p>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup form"
            className="ml-auto rounded p-1 text-kapur-200 transition-colors hover:bg-papan-600 hover:text-kapur-50"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* --- Identitas --- */}
        <div className="grid grid-cols-2 gap-3 border-b border-rambut px-5 py-4 sm:grid-cols-4">
          <label className="block">
            <span className={kelasLabel}>Kode</span>
            <input
              className={`${kelasInput} mt-1 disabled:bg-kertas-200 disabled:text-tinta-500`}
              value={nilai.kode}
              disabled={mode === 'edit'}
              onChange={(e) => ubah('kode', e.target.value)}
              placeholder="BAL-0121"
            />
          </label>
          <label className="col-span-1 block sm:col-span-2">
            <span className={kelasLabel}>Nama (boleh disamarkan)</span>
            <input className={`${kelasInput} mt-1`} value={nilai.nama} onChange={(e) => ubah('nama', e.target.value)} />
          </label>
          <label className="block">
            <span className={kelasLabel}>Usia (bulan)</span>
            <input type="number" min={0} max={72} className={`${kelasInput} mt-1 tnum`} value={nilai.usia_bulan} onChange={(e) => ubah('usia_bulan', Number(e.target.value))} />
          </label>

          <label className="block">
            <span className={kelasLabel}>Jenis kelamin</span>
            <select className={`${kelasInput} mt-1`} value={nilai.jenis_kelamin} onChange={(e) => ubah('jenis_kelamin', e.target.value)}>
              <option value="Laki-Laki">Laki-Laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </label>
          <label className="block">
            <span className={kelasLabel}>Tinggi (cm)</span>
            <input type="number" step="0.1" className={`${kelasInput} mt-1 tnum`} value={nilai.tinggi_badan_cm} onChange={(e) => ubah('tinggi_badan_cm', Number(e.target.value))} />
          </label>
          <label className="block">
            <span className={kelasLabel}>HAZ</span>
            <input type="number" step="0.01" className={`${kelasInput} mt-1 tnum`} value={nilai.haz} onChange={(e) => ubah('haz', Number(e.target.value))} />
          </label>
          <label className="block">
            <span className={kelasLabel}>Status gizi</span>
            <select className={`${kelasInput} mt-1`} value={nilai.status_gizi} onChange={(e) => ubah('status_gizi', e.target.value)}>
              {STATUS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="col-span-2 flex items-center gap-2 sm:col-span-4">
            <input
              type="checkbox"
              checked={nilai.tren_memburuk}
              onChange={(e) => ubah('tren_memburuk', e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-tinta-700">
              Tren pertumbuhan memburuk dalam beberapa pengukuran terakhir
            </span>
          </label>
        </div>

        {/* --- Tujuh kriteria --- */}
        <div className="px-5 py-4">
          <p className={kelasLabel}>Tujuh kriteria &mdash; wajib 1 sampai 5</p>
          <div className="mt-2 divide-y divide-rambut border-y border-rambut">
            {criteria.map((c, i) => {
              const kunci = `c${i + 1}` as keyof NilaiForm;
              const angka = Number(nilai[kunci]);
              return (
                <div key={c.code} className="flex items-center gap-3 py-2">
                  <span className="w-8 shrink-0 font-display text-sm font-bold text-tinta-900">{c.code}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-tinta-700" title={c.name}>{c.name}</span>
                  <div className="flex shrink-0 border border-rambut" role="group" aria-label={`Nilai ${c.code}`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => ubah(kunci, n as NilaiForm[typeof kunci])}
                        aria-pressed={angka === n}
                        className={`tnum h-7 w-7 text-xs font-bold transition-colors ${
                          angka === n
                            ? 'bg-papan-700 text-kapur-50'
                            : 'bg-kertas-50 text-tinta-500 hover:bg-kertas-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {galat && (
          <p className="border-t border-rambut bg-amber-50 px-5 py-2.5 text-xs font-semibold text-amber-900">
            {galat}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-rambut bg-kertas-50 px-5 py-3">
          <p className="text-xs text-tinta-400">
            Nonaktifkan, bukan hapus, kalau datanya salah atau sudah tidak terpakai.
          </p>
          <button
            type="button"
            onClick={onTutup}
            className="ml-auto rounded border border-rambut px-3 py-1.5 text-xs font-bold text-tinta-700 transition-colors hover:bg-kertas-200"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={simpan}
            disabled={menyimpan}
            className="rounded bg-papan-700 px-3.5 py-1.5 text-xs font-bold text-kapur-50 transition-colors hover:bg-papan-600 disabled:bg-kertas-300 disabled:text-tinta-500"
          >
            {menyimpan ? 'Menyimpan…' : mode === 'tambah' ? 'Simpan balita' : 'Simpan perubahan'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
