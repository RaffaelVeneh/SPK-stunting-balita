import React from 'react';
import type { Criterion, PriorityLevel } from '../types';

/* ============================================================================
   PRIMITIF PAPAN BULANAN
   Signature move: skala klinis 1-5 digambar sebagai goresan tally, dan bobot
   AHP digambar sebagai lebar kolom. Semuanya SVG/CSS yang ditulis sendiri,
   bukan emoji dan bukan glyph unicode.
   ========================================================================== */

/**
 * GORESAN TALLY — satu sampai lima garis tegak, dikelompokkan lima.
 * Inilah cara papan Posyandu menghitung, dan inilah cara antarmuka ini
 * menampilkan setiap skor kriteria: satu skor = goresan yang bisa dihitung
 * dengan mata.
 */
export const Tally: React.FC<{
  skor: number;
  ukuran?: 'sm' | 'md';
  redup?: boolean;
}> = ({ skor, ukuran = 'md', redup = false }) => {
  const n = Math.max(0, Math.min(5, Math.round(skor)));
  const tinggi = ukuran === 'sm' ? '0.85em' : '1.05em';

  if (n === 0) {
    return (
      <span
        className="text-tinta-400"
        title="Belum ada data — dikeluarkan dari perhitungan"
      >
        —
      </span>
    );
  }

  const gerbang = Math.floor(n / 5);
  const sisa = n % 5;

  return (
    <span
      className="tally"
      style={{ height: tinggi, opacity: redup ? 0.45 : 1 }}
      role="img"
      aria-label={`Skor ${n} dari 5`}
    >
      {gerbang > 0 && (
        <span className="tally__gate">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="tally__stroke" />
          ))}
        </span>
      )}
      {Array.from({ length: sisa }).map((_, i) => (
        <span key={i} className="tally__stroke" />
      ))}
    </span>
  );
};

/**
 * GAYA GORESAN KELENGKAPAN — status tanpa bergantung pada warna.
 * Solid = terverifikasi, putus-putus = belum lengkap, redup = tidak dinilai.
 * Ini memenuhi kebutuhan aksesibilitas: makna utama tidak boleh hanya warna.
 */
export const GoresanKelengkapan: React.FC<{
  terisi: number;
  total: number;
  perluVerifikasi?: boolean;
}> = ({ terisi, total, perluVerifikasi }) => {
  const putus = perluVerifikasi || terisi < total;
  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-semibold"
      title={
        putus
          ? `${terisi} dari ${total} kriteria terisi — sisanya dikeluarkan dari perhitungan`
          : `Data lengkap ${terisi}/${total}`
      }
    >
      <span
        aria-hidden
        className="inline-block h-[2px] w-6"
        style={
          putus
            ? {
                backgroundImage:
                  'repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px)',
              }
            : { backgroundColor: 'currentColor' }
        }
      />
      <span className="tnum">
        {terisi}/{total}
      </span>
    </span>
  );
};

/**
 * KOLOM RAMP — maginitudo terlihat, bukan sekadar posisi.
 * Tinggi batang mengangkut skor MOORA, jadi peringkat punya kuantitas.
 */
export const RampCell: React.FC<{ nilai: number; maks: number }> = ({ nilai, maks }) => {
  const rasio = maks > 0 ? Math.max(0, Math.min(1, nilai / maks)) : 0;
  return (
    <span
      className="relative inline-block h-8 w-[3px] bg-kertas-300"
      role="img"
      aria-label={`Skor ${nilai.toFixed(4)}`}
    >
      <span
        className="absolute bottom-0 left-0 w-full bg-papan-700"
        style={{ height: `${Math.max(6, rasio * 100)}%` }}
      />
    </span>
  );
};

/** Warna dan ikon per tingkat prioritas. Warna selalu didampingi teks. */
export const TINGKAT: Record<
  PriorityLevel,
  { warna: string; teks: string; bg: string; garis: string }
> = {
  'Sangat Tinggi': {
    warna: 'text-pigmen-merah',
    // Teks memakai merah lebih gelap: pigmen terang hanya 4,29:1 di atas
    // kertas, di bawah ambang 4,5:1 untuk teks 12px. Pigmen terang tetap
    // dipakai untuk goresan, yang bukan satu-satunya pembawa makna.
    teks: 'text-red-700',
    bg: 'bg-red-50',
    garis: 'border-pigmen-merah',
  },
  Tinggi: {
    warna: 'text-pigmen-kuning',
    teks: 'text-amber-900',
    bg: 'bg-amber-50',
    garis: 'border-pigmen-kuning',
  },
  Sedang: {
    warna: 'text-pigmen-sian',
    teks: 'text-pigmen-sian',
    bg: 'bg-kertas-100',
    garis: 'border-pigmen-sian',
  },
  Rendah: {
    warna: 'text-pigmen-hijau',
    teks: 'text-pigmen-hijau',
    bg: 'bg-emerald-50',
    garis: 'border-pigmen-hijau',
  },
};

/** Penanda tingkat: warna + jumlah goresan, jadi terbaca tanpa hue. */
export const PenandaTingkat: React.FC<{ tingkat: PriorityLevel }> = ({ tingkat }) => {
  const goresan: Record<PriorityLevel, number> = {
    'Sangat Tinggi': 5,
    Tinggi: 4,
    Sedang: 3,
    Rendah: 2,
  };
  const t = TINGKAT[tingkat];
  return (
    <span className={`inline-flex items-center gap-2 font-bold text-xs ${t.teks}`}>
      <span className={t.warna}>
        <Tally skor={goresan[tingkat]} ukuran="sm" />
      </span>
      <span className="uppercase tracking-wide">{tingkat}</span>
    </span>
  );
};

/**
 * PITA BOBOT — bobot AHP digambar sebagai lebar kolom.
 * Tujuh kriteria, tujuh kolom, lebar masing-masing sebanding dengan bobotnya.
 * Inilah bukti pembobotan yang terlihat sebelum tabel dimulai: urutan daftar
 * di bawahnya berasal dari lebar kolom ini, dan bobotnya terkunci.
 */
export const PitaBobot: React.FC<{
  criteria: Criterion[];
  onPilih?: (kode: string) => void;
  terpilih?: string | null;
}> = ({ criteria, onPilih, terpilih }) => {
  const total = criteria.reduce((s, c) => s + c.weight, 0) || 1;

  return (
    <div className="papan bg-papan-700 text-kapur-50">
      <div className="flex items-stretch h-[68px]">
        {criteria.map((c, i) => {
          const persen = (c.weight / total) * 100;
          const aktif = terpilih === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => onPilih?.(c.code)}
              style={{ flexGrow: c.weight, flexBasis: 0, ['--tunda']: (i * 60) + 'ms' } as React.CSSProperties}
              className={`pita-sel group relative flex min-w-[54px] flex-col justify-center px-2.5 text-left transition-colors ${
                aktif ? 'bg-papan-500' : 'hover:bg-papan-600'
              }`}
              title={`${c.code} — ${c.name} — bobot ${persen.toFixed(2)}%${
                c.tier ? ` — Tier ${c.tier}` : ''
              }`}
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-px bg-rambut-papan"
              />
              <span className="font-display text-[13px] font-bold leading-none">
                {c.code}
              </span>
              <span className="tnum mt-1 text-[15px] font-bold leading-none text-kapur-100">
                {persen.toFixed(2)}
                <span className="text-xs font-semibold text-kapur-300">%</span>
              </span>
              <span className="mt-1 truncate text-xs leading-none text-kapur-300">
                {c.tier ? `Tier ${c.tier}` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
