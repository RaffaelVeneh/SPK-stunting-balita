<?php

namespace App\Services;

use App\Models\BalitaSpk;
use App\Services\SPK\KriteriaDefinition;

/**
 * Pembacaan data balita untuk keperluan triase.
 *
 * SEBELUMNYA membaca berkas CSV. Sekarang seluruhnya dari basis data
 * (tabel balita_spk). Berkas CSV tidak lagi dibaca di jalur mana pun: ia hanya
 * menjadi bahan awal BalitaSpkSeeder, sekali, saat basis data masih kosong.
 *
 * Alasannya: selama ada dua sumber, data yang ditambah atau diubah lewat
 * antarmuka tidak akan terlihat, dan baris yang sudah dihapus dari basis data
 * masih bisa terbaca dari CSV. Satu sumber menghilangkan seluruh kelas
 * kesalahan itu.
 */
class DatasetService
{
    /**
     * Daftar balita, dengan bentuk respons yang sama seperti pembaca CSV dulu
     * supaya antarmuka tidak perlu berubah.
     *
     * Balita nonaktif IKUT dikembalikan di sini. Ia perlu tetap tampil di
     * daftar; yang mengeluarkannya dari perhitungan adalah SpkController.
     */
    public function getBalitaSamples(
        int $limit = 20,
        int $offset = 0,
        ?string $filterStatus = null,
        bool $includeSimulatedC2C4 = true
    ): array {
        $query = BalitaSpk::query();

        if ($filterStatus && strtolower($filterStatus) !== 'all') {
            $query->whereRaw('LOWER(status_gizi) = ?', [strtolower($filterStatus)]);
        }

        $total = (clone $query)->count();

        $baris = $query->orderBy('kode')->offset($offset)->limit($limit)->get();

        return [
            'status' => 'success',
            'dataset_source' => 'basis data: balita_spk',
            'dataset_format' => '7_kriteria',
            'is_dummy_sintetis' => true,
            'total_rows' => $total,
            'total_samples_returned' => $baris->count(),
            'offset' => $offset,
            'limit' => $limit,
            'active_criteria' => KriteriaDefinition::kode(),
            'missing_criteria' => [],
            'samples' => $baris->map(fn (BalitaSpk $b) => $b->keArray())->values()->all(),
        ];
    }

    /**
     * Ringkasan statistik, dihitung dari basis data.
     */
    public function getDatasetSummary(): array
    {
        $semua = BalitaSpk::all();

        if ($semua->isEmpty()) {
            return [
                'status' => 'success',
                'dataset_source' => 'basis data: balita_spk',
                'is_dummy_sintetis' => true,
                'total_rows' => 0,
                'distribution' => ['severely stunted' => 0, 'stunted' => 0, 'normal' => 0, 'tinggi' => 0],
                'kelengkapan_distribution' => ['7/7' => 0],
                'sebaran_kriteria' => [],
                'available_columns' => [],
                'mapped_criteria' => KriteriaDefinition::kode(),
            ];
        }

        $distribusi = ['severely stunted' => 0, 'stunted' => 0, 'normal' => 0, 'tinggi' => 0];
        $sebaran = [];
        foreach (KriteriaDefinition::kode() as $kode) {
            $sebaran[$kode] = array_fill(1, 5, 0);
        }

        foreach ($semua as $b) {
            $status = strtolower((string) $b->status_gizi);
            if (isset($distribusi[$status])) {
                $distribusi[$status]++;
            }
            foreach (KriteriaDefinition::kode() as $i => $kode) {
                $kolom = 'c' . ($i + 1);
                $nilai = (int) $b->{$kolom};
                if ($nilai >= 1 && $nilai <= 5) {
                    $sebaran[$kode][$nilai]++;
                }
            }
        }

        return [
            'status' => 'success',
            'dataset_source' => 'basis data: balita_spk',
            'dataset_format' => '7_kriteria',
            'is_dummy_sintetis' => true,
            'keterangan' => 'Data balita tersimpan di basis data. Berkas CSV hanya dipakai '
                . 'sekali oleh seeder untuk mengisi data awal.',
            'total_rows' => $semua->count(),
            'total_aktif' => $semua->where('aktif', true)->count(),
            'total_nonaktif' => $semua->where('aktif', false)->count(),
            'distribution' => $distribusi,
            // Semua baris wajib lengkap tujuh kriteria, jadi hanya ada satu nilai.
            'kelengkapan_distribution' => ['7/7' => $semua->count()],
            'sebaran_kriteria' => $sebaran,
            'available_columns' => [
                'kode', 'nama', 'usia_bulan', 'jenis_kelamin', 'tinggi_badan_cm',
                'haz', 'status_gizi', 'tren_memburuk',
                'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'aktif',
            ],
            'mapped_criteria' => KriteriaDefinition::kode(),
        ];
    }
}
