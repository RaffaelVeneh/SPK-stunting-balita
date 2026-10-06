<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\SPK\FuzzyAhpService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Tiga Akun Superadmin UNY
        $superadmins = [
            [
                'email' => 'raffaelvincent.2024@student.uny.ac.id',
                'name' => 'Raffael Vincent',
            ],
            [
                'email' => 'muhammadfaizulhaq.2024@student.uny.ac.id',
                'name' => 'Muhammad Faizul Haq',
            ],
            [
                'email' => 'galantonalatif.2024@student.uny.ac.id',
                'name' => 'Galantona Latif',
            ],
        ];

        foreach ($superadmins as $adminData) {
            User::updateOrCreate(
                ['email' => $adminData['email']],
                [
                    'name' => $adminData['name'],
                    'password' => Hash::make('password123'),
                    'role' => 'superadmin',
                    'email_verified_at' => now(),
                ]
            );
        }

        // 2. Akun User Biasa (Mahasiswa & Staf UNY untuk Cek Data/Info)
        User::updateOrCreate(
            ['email' => 'mahasiswa.user@student.uny.ac.id'],
            [
                'name' => 'Mahasiswa Biasa UNY',
                'password' => Hash::make('password123'),
                'role' => 'user',
                'email_verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => 'dosen.peneliti@uny.ac.id'],
            [
                'name' => 'Dosen Peneliti UNY',
                'password' => Hash::make('password123'),
                'role' => 'user',
                'email_verified_at' => now(),
            ]
        );

        // 3. Wilayah Contoh
        DB::table('wilayah')->updateOrInsert(
            ['kode' => 'W-YOGYA-01'],
            [
                'nama' => 'Puskesmas Percontohan UNY - Sleman',
                'tingkat' => 'kecamatan',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 4. Versi Bobot Default
        //
        // Bobot TIDAK lagi diketik manual di sini. Sebelumnya seeder menuliskan
        // angka lama (0.3440, 0.0881, ...) yang tidak sesuai dengan matriks AHP
        // yang ditampilkan aplikasi. Sekarang bobotnya diturunkan dari
        // KriteriaDefinition lewat FuzzyAhpService, sehingga selalu sinkron.
        $hasilAhp = (new FuzzyAhpService())->hitungDefault();

        // Nonaktifkan SEMUA versi lain lebih dulu. Tanpa ini, baris lama
        // (v1.0-Default-7Kriteria) akan tetap is_active = true dan tabelnya
        // berisi dua versi yang sama-sama aktif, sehingga menyesatkan kalau
        // diperiksa lewat phpMyAdmin.
        DB::table('bobot_kriteria_versi')
            ->where('versi', '!=', 'v2.0-FuzzyAHP-7Kriteria')
            ->update(['is_active' => false, 'updated_at' => now()]);

        DB::table('bobot_kriteria_versi')->updateOrInsert(
            ['versi' => 'v2.0-FuzzyAHP-7Kriteria'],
            [
                'metode_bobot' => 'fuzzy_ahp',
                'is_active' => true,
                'deskripsi' => 'Bobot 7 kriteria dari Fuzzy AHP (Buckley 1985); struktur tier '
                    . 'diturunkan dari Perpres 72/2021 Pasal 1 dan bukti literatur. '
                    . 'CR = ' . $hasilAhp['consistency_ratio'],
                'weights_json' => json_encode($hasilAhp['bobot_fuzzy']),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
