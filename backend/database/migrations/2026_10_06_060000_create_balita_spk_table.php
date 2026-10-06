<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel data balita yang dipakai aplikasi SPK.
 *
 * Sengaja terpisah dari tabel `balita` lama, yang rancangannya berbeda: tabel
 * lama memisahkan identitas dan skor ke dua tabel serta memakai tanggal lahir
 * dan wilayah, sedangkan aplikasi ini memakai usia bulan dan tujuh skor
 * kriteria langsung pada satu baris. Membengkokkan tabel lama akan memaksa
 * dua sumber kebenaran, jadi tabel ini dibuat sendiri.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('balita_spk', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 20)->unique();
            $table->string('nama', 80);
            $table->unsignedSmallInteger('usia_bulan');
            $table->string('jenis_kelamin', 20);
            $table->decimal('tinggi_badan_cm', 5, 2);
            $table->decimal('haz', 4, 2);
            $table->string('status_gizi', 30);
            $table->boolean('tren_memburuk')->default(false);

            // Tujuh skor kriteria ordinal 1-5. NOT NULL tanpa nilai bawaan,
            // dan ditegakkan lagi oleh validasi: balita dengan kriteria kosong
            // tidak boleh masuk perhitungan.
            $table->unsignedTinyInteger('c1');
            $table->unsignedTinyInteger('c2');
            $table->unsignedTinyInteger('c3');
            $table->unsignedTinyInteger('c4');
            $table->unsignedTinyInteger('c5');
            $table->unsignedTinyInteger('c6');
            $table->unsignedTinyInteger('c7');

            // Nonaktif berarti tidak ikut perhitungan, tetapi tetap tampil di
            // daftar dengan tampilan redup supaya masih bisa diaktifkan lagi.
            // Tidak ada penghapusan permanen.
            $table->boolean('aktif')->default(true);
            $table->string('sumber', 10)->default('manual');

            $table->timestamps();

            $table->index('aktif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('balita_spk');
    }
};