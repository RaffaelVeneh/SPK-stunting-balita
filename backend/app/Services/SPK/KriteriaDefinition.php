<?php

namespace App\Services\SPK;

/**
 * SUMBER KEBENARAN TUNGGAL — 7 kriteria SPK prioritas intervensi gizi balita.
 *
 * ============================================================================
 * BOBOT RESMI (sudah disetujui dosen pembimbing)
 * ============================================================================
 *   C1 35,068%   C2 8,708%   C3 22,755%   C4 14,609%
 *   C5 5,076%    C6 8,708%   C7 5,076%
 *
 * Diperoleh dari MATRIKS PERBANDINGAN BERPASANGAN tetap di bawah, memakai
 * Fuzzy AHP (Buckley 1985) atas matriks yang sama. Uji konsistensi pada
 * matriks tegas: lambda_max 7,062469 · CI 0,010411 · RI 1,32 ·
 * CR 0,007887  ->  KONSISTEN (CR < 0,10).
 *
 * Angka ini cocok dengan hasil perhitungan tegas (crisp) sampai 0,1 poin
 * persentase, sehingga kesimpulan bobotnya stabil terhadap pemodelan
 * ketidakpastian. Berkas beku angkanya: analisis/bobot_resmi.json
 *
 * ============================================================================
 * DUA LAPIS YANG HARUS DIBEDAKAN
 * ============================================================================
 * LAPIS 1 — MATRIKS = MASUKAN. Matriks di bawah adalah penilaian berpasangan
 *   pakar gizi pada skala Saaty 1–9. Ia adalah DATA, bukan hasil turunan.
 *   Karena itu ia ditulis tetap di sini dan tidak dihitung dari apa pun.
 *
 * LAPIS 2 — TINGKAT (tier) = KELUARAN. Urutan kepentingan di bawah ini adalah
 *   HASIL perhitungan bobot, bukan penyebabnya. Jadi kalau ada yang bertanya
 *   "mengapa C2 di tingkat 4?", jawabannya: karena bobotnya 8,708%, setara C6.
 *
 * Dasar tiap penempatan tetap disertakan sebagai alasan mengapa perbandingan
 * pakar bernilai demikian, dengan rujukan Perpres 72/2021 Pasal 1 dan bukti
 * kuantitatif (Danaei 2016, Checkley 2008, RCT SHINE, Torlesse 2016, dll).
 */
class KriteriaDefinition
{
    /** Nilai tengah skala Saaty dan label linguistiknya. */
    public const LABEL_SAATY = [
        1 => 'Sama penting (Equal)',
        2 => 'Antara sama dan sedikit lebih penting',
        3 => 'Sedikit lebih penting (Moderate)',
        4 => 'Antara sedikit dan lebih penting',
        5 => 'Lebih penting (Strong)',
        6 => 'Antara lebih dan sangat penting',
        7 => 'Sangat penting (Very strong)',
        8 => 'Antara sangat dan mutlak penting',
        9 => 'Mutlak lebih penting (Extreme)',
    ];

    /** Batas atas skala Saaty: 9 = mutlak lebih penting. */
    public const SAATY_MAKS = 9;
    /** Urutan kanonik kriteria pada matriks dan dataset. */
    public const URUTAN = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];

    /**
     * MATRIKS PERBANDINGAN BERPASANGAN — masukan pakar, skala Saaty 1–9.
     * Baris = kriteria yang dinilai, kolom = pembandingnya.
     * a(i,j) x a(j,i) = 1 pada seluruh matriks (aksioma resiprokal).
     */
    public const MATRIKS = [
        //  C1     C2     C3     C4     C5     C6     C7
        [1.0,   4.0,   2.0,   3.0,   6.0,   4.0,   6.0],   // C1
        [0.25,  1.0,   1 / 3, 0.5,   2.0,   1.0,   2.0],   // C2
        [0.5,   3.0,   1.0,   2.0,   4.0,   3.0,   4.0],   // C3
        [1 / 3, 2.0,   0.5,   1.0,   3.0,   2.0,   3.0],   // C4
        [1 / 6, 0.5,   0.25,  1 / 3, 1.0,   0.5,   1.0],   // C5
        [0.25,  1.0,   1 / 3, 0.5,   2.0,   1.0,   2.0],   // C6
        [1 / 6, 0.5,   0.25,  1 / 3, 1.0,   0.5,   1.0],   // C7
    ];

    /**
     * Definisi 7 kriteria. `tier` adalah urutan HASIL perhitungan bobot
     * (1 = paling penting), bukan masukan.
     */
    public const KRITERIA = [
        [
            'code' => 'C1',
            'name' => 'Kondisi Gizi & Pertumbuhan (TB/U, BB/U, BB/TB)',
            'kelompok' => 'Biologis',
            'tier' => 1,
            'jalur' => 'Langsung',
            'type' => 'benefit',
            'description' => 'Evaluasi antropometri stunting (TB/U z-score). 1=Optimal/Tinggi, 4=Stunted, 5=Severely Stunted.',
            'dasar' => 'Bobot 35,07%, tertinggi. Matriks menilai C1 4x lebih penting daripada C2, 2x daripada C3, dan 6x daripada C5 maupun C7. Prevalensi stunting Indonesia pooled 30,9% (642.596 subjek); growth faltering terbesar terjadi sebelum 24 bulan (Victora 2010) dan merupakan pergeseran seluruh distribusi populasi, bukan sekelompok kecil berisiko tinggi (Roth 2017). C1 adalah MANIFESTASI stunting, bukan penyebabnya; ia diberi bobot tertinggi atas dasar logika TRIASE — sistem ini alat penapisan prioritas, dan status gizi terukur saat ini adalah sinyal paling langsung bahwa anak butuh intervensi sekarang.',
        ],
        [
            'code' => 'C2',
            'name' => 'Riwayat Kelahiran Berisiko (BBLR, Prematur)',
            'kelompok' => 'Biologis',
            'tier' => 4,
            'jalur' => 'Langsung',
            'type' => 'benefit',
            'description' => 'Berat badan lahir dan usia gestasi. 1=Cukup Bulan & BB Normal, 5=BBLSR (<1500g) / Prematur ekstrem.',
            'dasar' => 'Bobot 8,71%, setara C6 dan berada di bawah C1, C3, dan C4. Perbandingan pakar menilai C1 4x lebih penting, C3 3x, dan C4 2x daripada C2. Bukti kuantitatifnya sendiri kuat — Danaei et al. 2016 (PLoS Med, 44,1 juta anak, 137 negara) menempatkan gangguan pertumbuhan janin/prematur sebagai klaster faktor risiko terdepan (10,8 juta kasus), dengan BBLR pooled OR 2,92 (2,56-3,33) dan PAR SGA 20%; konteks Indonesia POR BBLR 2,39 (Gusnedi 2023). Bobotnya tidak setinggi itu karena riwayat lahir bersifat IRREVERSIBLE: ia menjelaskan mengapa seorang anak berisiko, tetapi tidak dapat diintervensi lagi, sehingga nilainya lebih rendah sebagai penentu PRIORITAS tindakan.',
        ],
        [
            'code' => 'C3',
            'name' => 'Riwayat Penyakit / Infeksi (Diare, ISPA)',
            'kelompok' => 'Biologis',
            'tier' => 2,
            'jalur' => 'Langsung',
            'type' => 'benefit',
            'description' => 'Frekuensi dan keparahan infeksi 6 bulan terakhir. 1=Tidak pernah sakit, 5=Infeksi kronis / TB Anak.',
            'dasar' => 'Bobot 22,76%, tertinggi kedua. Perbandingan pakar menilai C3 3x lebih penting daripada C2, 2x daripada C4, dan 4x daripada C5 maupun C7. Perpres 72/2021 Pasal 1 menyebut "infeksi berulang" sebagai penyebab langsung stunting, setara kekurangan gizi kronis. Dikuatkan Danaei 2016 (diare 5,8 juta kasus atribusional) dan Checkley 2008: odds stunting naik 1,13 (1,07-1,19) per 5 episode diare, dengan 25% (8-38%) stunting diatribusikan pada >=5 episode sebelum usia 24 bulan. Ia dapat diintervensi dan sedang berlangsung, sehingga berbobot tinggi.',
        ],
        [
            'code' => 'C4',
            'name' => 'Kualitas Pola Pemberian Makan (ASI, MPASI)',
            'kelompok' => 'Perilaku',
            'tier' => 3,
            'jalur' => 'Langsung',
            'type' => 'benefit',
            'description' => 'Praktik ASI eksklusif 6 bulan dan kecukupan protein hewani MPASI. 1=ASI & MPASI adekuat, 5=Gagal makan parah.',
            'dasar' => 'Bobot 14,61%, di bawah C3 tetapi di atas C2. Perbandingan pakar menilai C1 3x dan C3 2x lebih penting daripada C4, sementara C4 dinilai 2x lebih penting daripada C2 dan 3x daripada C5. Determinan langsung asupan (Perpres 72/2021 Pasal 1: "kekurangan gizi kronis"). Bukti intervensinya TERKUAT di antara kriteria yang dapat diubah: RCT SHINE menunjukkan lengan IYCF menaikkan LAZ +0,16 (0,08-0,23) dan menurunkan stunting 35%->27%. Namun bukti observasional Indonesia lebih lemah — sintesis terbaik (Gusnedi 2023) tidak melaporkan pooled estimate untuk ASI eksklusif maupun keragaman pangan — sehingga bobotnya tidak diletakkan setinggi C3.',
        ],
        [
            'code' => 'C5',
            'name' => 'Sanitasi & Akses Air Bersih',
            'kelompok' => 'Lingkungan',
            'tier' => 5,
            'jalur' => 'Tidak langsung',
            'type' => 'benefit',
            'description' => 'Ketersediaan jamban sehat dan sumber air minum keluarga. 1=Air perpipaan & jamban sendiri, 5=BABS / limbah terbuka.',
            'dasar' => 'Bobot 5,08%, terendah bersama C7. Perpres 72/2021 dan Roadmap Bappenas menggolongkannya Intervensi Sensitif (penyebab tidak langsung). Beban atribusionalnya justru besar — Danaei 2016 mencatat sanitasi tidak layak 7,2 juta kasus, dan di Indonesia jamban tidak layak + air tidak diolah aOR 3,47 (1,73-7,28) (Torlesse 2016) serta air tidak layak POR 1,42 (Gusnedi 2023). Bobotnya tetap rendah karena dua alasan: pengaruhnya bekerja melalui jalur infeksi yang sudah terwakili C3, dan dalam tiga RCT faktorial besar (WASH-Benefits, SHINE) lengan WASH tidak berpengaruh pada pertumbuhan linear. Catatan penting: uji tersebut hanya menguji WASH dasar tingkat rumah tangga di wilayah dengan cakupan jamban cukup tinggi, sementara akses sanitasi layak di Indonesia hanya 11,5%, sehingga hasil null itu belum tentu berlaku di sini.',
        ],
        [
            'code' => 'C6',
            'name' => 'Kerentanan Sosial-Ekonomi',
            'kelompok' => 'Ekonomi',
            'tier' => 4,
            'jalur' => 'Tidak langsung',
            'type' => 'benefit',
            'description' => 'Kondisi ekonomi keluarga dan daya beli pangan bergizi. 1=Mapan (>UMR), 5=Kemiskinan ekstrem.',
            'dasar' => 'Bobot 8,71%, setara C2. Perbandingan pakar menilai C6 2x lebih penting daripada C5 dan C7, tetapi dinilai lebih rendah daripada C1, C3, dan C4. Perpres 72/2021 dan Roadmap Bappenas menggolongkan ketahanan pangan dan ekonomi keluarga sebagai Intervensi Sensitif. Asosiasinya kuat — kerawanan pangan POR 2,00 (1,37-2,92), POR terbesar di tingkat rumah tangga — tetapi bukti intervensinya lemah: bantuan tunai hanya menggeser stunting -1,35% dan HAZ +0,024. Karena itu bobotnya moderat, bukan tinggi.',
        ],
        [
            'code' => 'C7',
            'name' => 'Akses & Pemanfaatan Layanan Kesehatan',
            'kelompok' => 'Layanan',
            'tier' => 5,
            'jalur' => 'Tidak langsung',
            'type' => 'benefit',
            'description' => 'Keaktifan kunjungan Posyandu bulanan dan kelengkapan imunisasi dasar. 1=100% Rutin & Tuntas, 5=Drop out / Tidak pernah.',
            'dasar' => 'Bobot 5,08%, terendah bersama C5. Dinilai 6x lebih rendah daripada C1 dan 4x lebih rendah daripada C3. Kriteria dengan bukti TERLEMAH: tidak ada satu pun systematic review atau meta-analisis yang menghubungkan kehadiran Posyandu maupun kelengkapan penimbangan dengan stunting. Kaitan imunisasi hanya bertumpu pada satu studi kasus-kontrol 60 kasus (OR 4,96) yang papernya sendiri mengutip hasil bertentangan, termasuk satu hasil null (p=0,056). Proksi terkuat yang tersedia hanyalah ANC <4 kali kunjungan, POR 1,25 (1,11-1,41). Ini kriteria yang paling mungkin dipersoalkan penguji.',
        ],
    ];

    /** Daftar kode kriteria, urut kanonik. */
    public static function kode(): array
    {
        return self::URUTAN;
    }

    /**
     * Peta kode -> tingkat. Tingkat adalah HASIL perhitungan bobot,
     * sehingga diturunkan dari KriteriaDefinition, bukan diketik ulang.
     */
    public static function tier(): array
    {
        $out = [];
        foreach (self::KRITERIA as $k) {
            $out[$k['code']] = $k['tier'];
        }
        return $out;
    }

    /**
     * Matriks perbandingan berpasangan 7x7.
     *
     * Matriks ini adalah MASUKAN pakar dan ditulis tetap. Ia tidak lagi
     * diturunkan dari tingkat, karena tingkat justru hasil dari matriks ini.
     */
    public static function matriksPasangan(?array $abaikan = null): array
    {
        return self::MATRIKS;
    }

    /** Label linguistik untuk sebuah nilai Saaty (bulat 1..9). */
    public static function labelSaaty(float $nilai): string
    {
        $bulat = (int) round($nilai);
        return self::LABEL_SAATY[$bulat] ?? 'Nilai antara';
    }

    /**
     * Jejak audit: 21 perbandingan unik, dibaca LANGSUNG dari matriks
     * sehingga tidak mungkin menyimpang dari angka yang dipakai menghitung.
     */
    public static function jejakAudit(?array $abaikan = null): array
    {
        $A = self::MATRIKS;
        $tier = self::tier();
        $kode = self::URUTAN;
        $baris = [];

        for ($i = 0; $i < count($kode); $i++) {
            for ($j = $i + 1; $j < count($kode); $j++) {
                $ki = $kode[$i];
                $kj = $kode[$j];
                $nilai = (float) $A[$i][$j];
                $lebihPenting = $nilai >= 1.0;
                $besaran = $lebihPenting ? $nilai : 1.0 / $nilai;

                $baris[] = [
                    'pasangan' => "{$ki} - {$kj}",
                    'tier_i' => $tier[$ki],
                    'tier_j' => $tier[$kj],
                    'beda_tier' => abs($tier[$ki] - $tier[$kj]),
                    'nilai_saaty' => round($nilai, 4),
                    'label' => self::labelSaaty($besaran),
                    'arah' => $lebihPenting ? "{$ki} lebih penting" : "{$kj} lebih penting",
                ];
            }
        }

        return $baris;
    }

    /** Definisi kriteria lengkap dengan bobot yang sudah terhitung. */
    public static function denganBobot(array $bobot): array
    {
        $out = [];
        foreach (self::KRITERIA as $k) {
            $out[] = $k + ['weight' => round($bobot[$k['code']] ?? 0.0, 6)];
        }
        return $out;
    }
}
