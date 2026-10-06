import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Criterion } from '../types';

/* ============================================================================
   MODAL DETAIL KRITERIA
   Dibuka dari pita bobot. Isinya seluruh yang diketahui sistem tentang satu
   kriteria: kelompok, jalur, tingkat, bobot terkunci, bilangan fuzzy-nya, dan
   dasar yang mendukungnya. Dirender lewat portal ke <body> supaya transform
   leluhur tidak bisa memengaruhi position: fixed.
   ========================================================================== */

const LABEL_KELOMPOK: Record<string, string> = {
  Biologis: 'Biologis',
  Perilaku: 'Perilaku',
  Lingkungan: 'Lingkungan',
  Ekonomi: 'Ekonomi',
  Layanan: 'Layanan',
};

interface Props {
  kriteria: Criterion;
  /** TFN bobot fuzzy (l, m, u) dari Fuzzy AHP, bila tersedia. */
  tfn?: number[];
  /** Nilai tegas (crisp) pada matriks yang sama, sebagai pembanding. */
  tegas?: number;
  onTutup: () => void;
}

export const KriteriaDetail: React.FC<Props> = ({ kriteria, tfn, tegas, onTutup }) => {
  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup();
    };
    window.addEventListener('keydown', tekan);
    return () => window.removeEventListener('keydown', tekan);
  }, [onTutup]);

  const persen = (v: number) => `${(v * 100).toFixed(3)}%`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tinta-900/55 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail kriteria ${kriteria.code}`}
      onClick={onTutup}
    >
      <div
        className="anim anim-masuk w-full max-w-[620px] bg-kertas-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kepala */}
        <div className="flex items-start gap-4 bg-papan-700 px-5 py-4 text-kapur-50">
          <div className="min-w-0">
            <p className="font-display text-2xl font-bold leading-none">{kriteria.code}</p>
            <p className="mt-1.5 text-sm leading-snug text-kapur-100">{kriteria.name}</p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup detail kriteria"
            className="ml-auto rounded p-1 text-kapur-200 transition-colors hover:bg-papan-600 hover:text-kapur-50"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Baris angka pokok */}
        <div className="grid grid-cols-2 border-b border-rambut sm:grid-cols-4">
          {[
            ['Bobot terkunci', persen(kriteria.weight)],
            ['Tingkat', kriteria.tier ? `Tier ${kriteria.tier}` : '—'],
            ['Jalur', kriteria.jalur ?? '—'],
            ['Kelompok', kriteria.kelompok ? LABEL_KELOMPOK[kriteria.kelompok] ?? kriteria.kelompok : '—'],
          ].map(([label, nilai], i) => (
            <div key={label} className={`px-4 py-3 ${i > 0 ? 'border-l border-rambut' : ''}`}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-tinta-400">{label}</p>
              <p className="tnum mt-0.5 text-sm font-bold text-tinta-900">{nilai}</p>
            </div>
          ))}
        </div>

        {/* Bilangan fuzzy */}
        {tfn && tfn.length === 3 && (
          <div className="border-b border-rambut bg-kertas-100 px-5 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-tinta-400">
              Bilangan fuzzy bobot (l · m · u)
            </p>
            <p className="tnum mt-1 text-sm text-tinta-900">
              {tfn.map((v) => v.toFixed(4)).join('  ·  ')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-tinta-500">
              Lebar sebaran {(tfn[2] - tfn[0]).toFixed(4)}. Semakin lebar, semakin besar
              ketidakpastian pertimbangan pakar pada kriteria ini.
              {tegas !== undefined && (
                <>
                  {' '}Sebagai pembanding, perhitungan tegas pada matriks yang sama
                  menghasilkan <span className="tnum font-semibold">{persen(tegas)}</span>.
                </>
              )}
            </p>
          </div>
        )}

        {/* Apa yang diukur */}
        {kriteria.description && (
          <div className="border-b border-rambut px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-tinta-400">
              Yang dinilai
            </p>
            <p className="mt-1 max-w-[68ch] text-xs leading-relaxed text-tinta-700">
              {kriteria.description}
            </p>
          </div>
        )}

        {/* Dasar */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-tinta-400">
            Dasar dan bukti
          </p>
          <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-tinta-700">
            {kriteria.dasar ?? 'Belum ada catatan dasar untuk kriteria ini.'}
          </p>
        </div>

        <div className="border-t border-rambut bg-kertas-100 px-5 py-3">
          <p className="text-xs leading-relaxed text-tinta-500">
            Bobot ini terkunci pada hasil AHP dan tidak dapat diubah dari antarmuka.
            Tingkat di atas adalah urutan hasil perhitungan, bukan masukan.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};
