<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Wilayah
        Schema::create('wilayah', function (Blueprint $table) {
            $table->id();
            $table->string('kode')->unique();
            $table->string('nama');
            $table->string('tingkat'); // desa, kecamatan, kabupaten
            $table->foreignId('parent_id')->nullable()->constrained('wilayah')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Balita
        Schema::create('balita', function (Blueprint $table) {
            $table->id();
            $table->string('kode_balita')->unique(); // Masked code untuk privasi
            $table->string('nama_lengkap');
            $table->enum('jenis_kelamin', ['L', 'P']);
            $table->date('tanggal_lahir');
            $table->foreignId('wilayah_id')->constrained('wilayah')->cascadeOnDelete();
            $table->timestamps();
        });

        // 3. Pengukuran Balita
        Schema::create('pengukuran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('balita_id')->constrained('balita')->cascadeOnDelete();
            $table->unsignedSmallInteger('periode_bulan');
            $table->unsignedSmallInteger('periode_tahun');
            
            // Antropometri & z-score
            $table->decimal('berat_badan', 5, 2);
            $table->decimal('tinggi_badan', 5, 2);
            $table->decimal('zscore_tb_u', 5, 2)->nullable();
            $table->decimal('zscore_bb_u', 5, 2)->nullable();
            $table->decimal('zscore_bb_tb', 5, 2)->nullable();

            // 7 Skor Kriteria Ordinal (1-5)
            $table->unsignedTinyInteger('skor_c1'); // Kondisi Gizi & Pertumbuhan
            $table->unsignedTinyInteger('skor_c2'); // Riwayat Lahir
            $table->unsignedTinyInteger('skor_c3'); // Riwayat Penyakit/Infeksi
            $table->unsignedTinyInteger('skor_c4'); // Pola Pemberian Makan
            $table->unsignedTinyInteger('skor_c5'); // Sanitasi
            $table->unsignedTinyInteger('skor_c6'); // Sosial-Ekonomi
            $table->unsignedTinyInteger('skor_c7'); // Akses Layanan Kesehatan

            $table->timestamps();
            $table->unique(['balita_id', 'periode_bulan', 'periode_tahun']);
        });

        // 4. Bobot Kriteria Versi
        Schema::create('bobot_kriteria_versi', function (Blueprint $table) {
            $table->id();
            $table->string('versi');
            $table->string('metode_bobot')->default('manual'); // varchar (ahp, manual, critic, dll)
            $table->boolean('is_active')->default(false);
            $table->text('deskripsi')->nullable();
            $table->json('weights_json'); // hasil Fuzzy AHP, mis. {C1: 0.29961, C2: 0.29961, ...}
            $table->unsignedBigInteger('ahp_matrix_id')->nullable();
            $table->timestamps();
        });

        // 5. AHP Pairwise Matrix
        Schema::create('ahp_pairwise_matrix', function (Blueprint $table) {
            $table->id();
            $table->json('matrix_json');
            $table->decimal('consistency_ratio', 8, 4);
            $table->boolean('is_valid')->default(false); // CR < 0.1
            $table->foreignId('pengisi_id')->constrained('users');
            $table->timestamps();
        });

        // 6. Kalkulasi Batch
        Schema::create('kalkulasi_batch', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('periode_bulan');
            $table->unsignedSmallInteger('periode_tahun');
            $table->foreignId('wilayah_id')->constrained('wilayah');
            $table->foreignId('bobot_versi_id')->constrained('bobot_kriteria_versi');
            $table->string('status')->default('completed'); // queued, processing, completed, failed
            $table->foreignId('created_by_id')->constrained('users');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        // 7. Hasil Kalkulasi
        Schema::create('hasil_kalkulasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('kalkulasi_batch')->cascadeOnDelete();
            $table->foreignId('balita_id')->constrained('balita')->cascadeOnDelete();
            $table->string('metode_skoring'); // varchar (moora)
            $table->decimal('skor', 10, 4);
            $table->unsignedInteger('rank');
            $table->string('priority_level'); // Sangat Tinggi, Tinggi, Sedang, Rendah
            $table->boolean('is_overridden')->default(false);
            $table->text('override_reason')->nullable();
            $table->json('details_json')->nullable();
            $table->timestamps();

            $table->unique(['batch_id', 'balita_id', 'metode_skoring']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hasil_kalkulasi');
        Schema::dropIfExists('kalkulasi_batch');
        Schema::dropIfExists('ahp_pairwise_matrix');
        Schema::dropIfExists('bobot_kriteria_versi');
        Schema::dropIfExists('pengukuran');
        Schema::dropIfExists('balita');
        Schema::dropIfExists('wilayah');
    }
};
