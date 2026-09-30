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
        // 1. Superadmin (Akun Mahasiswa UNY)
        $superadmin = User::updateOrCreate(
            ['email' => 'raffaelvincent.2024@student.uny.ac.id'],
            [
                'name' => 'Raffael Vincent',
                'password' => Hash::make('password123'),
                'role' => 'superadmin',
                'email_verified_at' => now(),
            ]
        );

        // 2. Admin Tambahan (Akun Dosen / Staf UNY)
        User::updateOrCreate(
            ['email' => 'admin.gizi@uny.ac.id'],
            [
                'name' => 'Administrator Gizi UNY',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        // 3. Wilayah Contoh
        $wilayahId = DB::table('wilayah')->insertGetId([
            'kode' => 'W-YOGYA-01',
            'nama' => 'Puskesmas Percontohan UNY - Sleman',
            'tingkat' => 'kecamatan',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Hubungkan superadmin ke wilayah
        $superadmin->update(['wilayah_id' => $wilayahId]);

        // 4. Versi Bobot Default (AHP / Manual dari Dokumen)
        $bobotId = DB::table('bobot_kriteria_versi')->insertGetId([
            'versi' => 'v1.0-Default-7Kriteria',
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
        ]);
    }
}
