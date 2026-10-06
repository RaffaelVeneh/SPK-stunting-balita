import { useEffect, useRef, useState } from 'react';

/**
 * Menghitung naik ke nilai sasaran dengan peluruhan kubik.
 *
 * Dipakai hanya untuk angka yang memang bermakna dilihat berubah — jumlah
 * balita dan persentase bobot. Bukan untuk setiap angka di layar: angka yang
 * terus bergerak justru menyulitkan pembacaan tabel.
 *
 * Saat gerak diminta dikurangi, nilainya dipasang langsung tanpa animasi,
 * bukan dipercepat.
 */
export function useHitungNaik(sasaran: number, durasi = 820): number {
  const [nilai, setNilai] = useState(0);
  const sekarang = useRef(0);

  useEffect(() => {
    const kurangiGerak =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (kurangiGerak) {
      sekarang.current = sasaran;
      setNilai(sasaran);
      return;
    }

    const dari = sekarang.current;
    let raf = 0;
    const mulai = performance.now();

    const langkah = (t: number) => {
      const p = Math.min(1, (t - mulai) / durasi);
      const e = 1 - Math.pow(1 - p, 3);
      const v = dari + (sasaran - dari) * e;
      sekarang.current = v;
      setNilai(v);
      if (p < 1) {
        raf = requestAnimationFrame(langkah);
      } else {
        sekarang.current = sasaran;
        setNilai(sasaran);
      }
    };

    raf = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(raf);
  }, [sasaran, durasi]);

  return nilai;
}
