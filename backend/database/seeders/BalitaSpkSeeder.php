<?php

namespace Database\Seeders;

use App\Models\BalitaSpk;
use Illuminate\Database\Seeder;

/**
 * Mengisi tabel balita_spk dari dataset CSV sekali saja.
 *
 * Kalau tabel sudah berisi data, seeder berhenti: menjalankan ulang
 * `migrate --seed` di produksi tidak boleh menimpa data yang sudah diedit
 * pengguna.
 */
class BalitaSpkSeeder extends Seeder
{
    public function run(): void
    {
        if (BalitaSpk::count() > 0) {
            $this->command?->info('balita_spk sudah berisi data; seeder dilewati.');

            return;
        }

        $path = null;
        foreach ([
            storage_path('dataset/dummy_balita_7kriteria.csv'),
            '/var/www/dataset/dummy_balita_7kriteria.csv',
            base_path('../dataset/dummy_balita_7kriteria.csv'),
        ] as $kandidat) {
            if (is_file($kandidat)) {
                $path = $kandidat;
                break;
            }
        }

        if ($path === null) {
            $this->command?->warn('Dataset CSV tidak ditemukan; balita_spk dibiarkan kosong.');

            return;
        }

        $handle = fopen($path, 'r');
        if ($handle === false) {
            return;
        }

        $header = fgetcsv($handle);
        // Buang penanda BOM di awal berkas, kalau tidak kolom pertama tidak cocok.
        $header[0] = preg_replace('/^\x{FEFF}/u', '', (string) $header[0]);

        $jumlah = 0;
        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) !== count($header)) {
                continue;
            }
            $r = array_combine($header, $row);

            BalitaSpk::create([
                'kode' => $r['kode_balita'],
                'nama' => $r['nama_samar'],
                'usia_bulan' => (int) $r['usia_bulan'],
                'jenis_kelamin' => $r['jenis_kelamin'],
                'tinggi_badan_cm' => (float) $r['tinggi_badan_cm'],
                'haz' => (float) $r['haz'],
                'status_gizi' => $r['status_gizi'],
                'tren_memburuk' => strtolower((string) $r['tren_memburuk']) === 'ya',
                'c1' => (int) $r['c1'], 'c2' => (int) $r['c2'], 'c3' => (int) $r['c3'],
                'c4' => (int) $r['c4'], 'c5' => (int) $r['c5'], 'c6' => (int) $r['c6'],
                'c7' => (int) $r['c7'],
                'aktif' => true,
                'sumber' => 'dummy',
            ]);
            $jumlah++;
        }
        fclose($handle);

        $this->command?->info("balita_spk diisi {$jumlah} balita dari " . basename($path));
    }
}