/* ============================================================================
   EKSPOR CSV
   Ditulis tanpa pustaka tambahan: CSV cukup untuk dibuka di Excel, dan tidak
   perlu menambah ketergantungan hanya untuk ini.
   ========================================================================== */

/**
 * Bungkus satu sel bila perlu.
 *
 * Excel memecah baris pada koma, tanda kutip, dan ganti baris. Sel yang memuat
 * salah satunya harus dikurung tanda kutip, dan tanda kutip di dalamnya
 * digandakan. Tanpa ini, nama bertanda koma akan menggeser seluruh kolom.
 */
function sel(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return '';
  const teks = String(nilai);
  if (/[",\n\r;]/.test(teks)) {
    return '"' + teks.replace(/"/g, '""') + '"';
  }
  return teks;
}

/**
 * Susun isi CSV.
 *
 * Dipisah dengan titik koma, bukan koma. Excel pada komputer dengan pengaturan
 * wilayah Indonesia memakai titik koma sebagai pemisah daftar, sehingga berkas
 * berkoma akan tampak menumpuk di satu kolom.
 */
export function susunCSV(kolom: string[], baris: (string | number | null | undefined)[][]): string {
  const garis = [kolom.map(sel).join(';')];
  for (const b of baris) {
    garis.push(b.map(sel).join(';'));
  }
  return garis.join('\r\n');
}

/**
 * Unduh sebagai berkas CSV.
 *
 * BOM ditambahkan di depan supaya Excel membaca huruf beraksen dan karakter
 * Indonesia dengan benar. Tanpa BOM, Excel sering menampilkannya sebagai
 * karakter rusak.
 */
export function unduhCSV(namaBerkas: string, isi: string): void {
  const blob = new Blob(['\uFEFF' + isi], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.download = namaBerkas;
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  // Dilepas setelah jeda singkat; melepas terlalu cepat membatalkan unduhan di
  // sebagian peramban.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
