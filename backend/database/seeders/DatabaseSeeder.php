<?php

namespace Database\Seeders;

use App\Models\User;
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

        // 4. Versi Bobot Default (AHP / Manual dari Dokumen)
        DB::table('bobot_kriteria_versi')->updateOrInsert(
            ['versi' => 'v1.0-Default-7Kriteria'],
            [
                'metode_bobot' => 'ahp',
                'is_active' => true,
                'deskripsi' => 'Bobot 7 kriteria triase balita berbasis preferensi ahli gizi',
                'weights_json' => json_encode([
                    'C1' => 0.3440,
                    'C2' => 0.0881,
                    'C3' => 0.2289,
                    'C4' => 0.1466,
                    'C5' => 0.0521,
                    'C6' => 0.0881,
                    'C7' => 0.0521,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
