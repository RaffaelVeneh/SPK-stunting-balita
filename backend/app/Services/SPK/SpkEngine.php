<?php

namespace App\Services\SPK;

use InvalidArgumentException;

/**
 * Router perhitungan SPK.
 *
 * Sesuai keputusan metodologi, sistem ini MEMFIKSAI SATU metode skoring saja,
 * yaitu MOORA (perangkingan rasio). SAW sengaja dihapus supaya tidak ada dua
 * rumus yang berjalan bersamaan -- sebelumnya kehadiran SAW dan MOORA
 * sekaligus membuat hasil bergantung pada metode mana yang dipilih, padahal
 * keduanya menghasilkan urutan yang sama pada data yang dipakai sehingga
 * pemilihannya tidak menambah informasi apa pun, hanya menambah kemungkinan
 * tidak konsisten.
 *
 * Pembagian tugas yang jelas:
 *   - Fuzzy AHP  -> menentukan BOBOT kriteria
 *   - MOORA      -> menentukan URUTAN alternatif
 *   - Aturan klinis absolut -> menentukan TINGKAT prioritas (ada di MooraService)
 */
class SpkEngine
{
    public function __construct(
        protected MooraService $mooraService
    ) {}

    /**
     * Jalankan perhitungan SPK.
     *
     * Parameter $method tetap dipertahankan demi kompatibilitas kontrak API,
     * tetapi hanya 'moora' yang diterima.
     */
    public function calculate(?string $method, array $alternatives, array $criteria): array
    {
        $normalized = strtolower(trim((string) $method));

        if ($normalized !== '' && $normalized !== 'moora') {
            throw new InvalidArgumentException(
                "Metode '{$method}' tidak lagi didukung. Sistem ini memakai MOORA "
                . 'sebagai satu-satunya metode skoring (SAW sudah dihapus).'
            );
        }

        return $this->mooraService->calculate($alternatives, $criteria);
    }
}
