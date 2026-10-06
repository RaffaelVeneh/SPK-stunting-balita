<?php

namespace App\Http\Controllers;

use App\Services\DatasetService;
use App\Services\SPK\AhpService;
use App\Services\SPK\FuzzyAhpService;
use App\Services\SPK\KriteriaDefinition;
use App\Services\SPK\SpkEngine;
use App\Models\BalitaSpk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

class SpkController extends Controller
{
    public function __construct(
        protected SpkEngine $spkEngine,
        protected AhpService $ahpService,
        protected FuzzyAhpService $fuzzyAhpService,
        protected DatasetService $datasetService
    ) {}

    /**
     * Mengambil daftar 7 kriteria standar triase balita beserta bobotnya.
     *
     * Bobot TIDAK di-hardcode lagi. Sebelumnya angka bobot diketik manual di
     * sini (0.3440, 0.0881, ...) sementara matriks AHP yang ditampilkan
     * menghasilkan angka yang berbeda (0.3562, ...), sehingga sistem memakai
     * bobot yang tidak sesuai dengan matriksnya sendiri. Sekarang bobot
     * diturunkan dari KriteriaDefinition lewat Fuzzy AHP, jadi mustahil
     * tidak sinkron.
     */
    public function criteria()
    {
        $hasil = $this->fuzzyAhpService->hitungDefault();

        return response()->json([
            'status' => 'success',
            'weighting_method' => 'Fuzzy AHP (Buckley 1985) atas matriks perbandingan berpasangan pakar — CR 0,0079',
            'criteria' => KriteriaDefinition::denganBobot($hasil['bobot_fuzzy']),
            'bobot_crisp_pembanding' => $hasil['bobot_crisp'],
            'consistency' => [
                'lambda_max' => $hasil['lambda_max'],
                'consistency_index' => $hasil['consistency_index'],
                'random_index' => $hasil['random_index'],
                'consistency_ratio' => $hasil['consistency_ratio'],
                'is_valid' => $hasil['is_valid'],
                'status_label' => $hasil['status_label'],
                'catatan' => $hasil['catatan_konsistensi'],
            ],
        ]);
    }

    /**
     * Mengambil matriks perbandingan berpasangan AHP resmi dan status konsistensinya.
     */
    public function ahpMatrix()
    {
        $kode = KriteriaDefinition::kode();
        $matriks = KriteriaDefinition::matriksPasangan();
        $hasil = $this->fuzzyAhpService->hitung($matriks, $kode);

        return response()->json([
            'status' => 'success',
            'criteria' => $kode,
            'matrix' => $matriks,
            'tier' => KriteriaDefinition::tier(),
            'jejak_audit' => KriteriaDefinition::jejakAudit(),
            'kriteria_detail' => KriteriaDefinition::KRITERIA,
            'ahp_result' => [
                'weights' => $hasil['bobot_crisp'],
                'weights_fuzzy' => $hasil['bobot_fuzzy'],
                'tfn' => $hasil['tfn'],
                'lambda_max' => $hasil['lambda_max'],
                'consistency_index' => $hasil['consistency_index'],
                'random_index' => $hasil['random_index'],
                'consistency_ratio' => $hasil['consistency_ratio'],
                'is_valid' => $hasil['is_valid'],
                'status_label' => $hasil['status_label'],
                'catatan_konsistensi' => $hasil['catatan_konsistensi'],
            ],
        ]);
    }

    /**
     * Menghitung ulang bobot dan rasio konsistensi dari matriks perbandingan berpasangan AHP.
     */
    public function ahpCalculate(Request $request)
    {
        $request->validate([
            'criteria' => ['required', 'array', 'min:2'],
            'matrix' => ['required', 'array', 'min:2'],
        ]);

        try {
            $calc = $this->ahpService->computeWeights($request->criteria, $request->matrix);
            return response()->json([
                'status' => 'success',
                'ahp_result' => $calc,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Menjalankan kalkulasi MOORA menggunakan bobot AHP (toleran data parsial).
     *
     * Metode difiksasi ke MOORA. Parameter 'method' tetap diterima demi
     * kompatibilitas, tetapi hanya 'moora' yang valid.
     */
    /**
     * Tandai balita berstatus nonaktif pada hasil peringkat.
     *
     * Balita nonaktif TIDAK dibuang dari hasil. Ia tetap diperingkat supaya
     * posisinya terlihat: pengguna perlu tahu ke urutan berapa ia kembali kalau
     * diaktifkan lagi. Yang berubah hanya penandanya, dan antarmuka memakai
     * penanda itu untuk meredupkan barisnya, menuliskan "Nonaktif" pada kolom
     * Tingkat, dan mengganti tombolnya menjadi Aktifkan.
     *
     * Konsekuensinya, peringkat balita aktif bisa bergeser ketika ada yang
     * dinonaktifkan. Itu memang diinginkan: daftar prioritas tetap berurutan
     * tanpa lubang.
     *
     * @param  array<int, array<string, mixed>>  $rankings
     * @return array<int, array<string, mixed>>
     */
    private function tandaiNonaktif(array $rankings): array
    {
        if (! Schema::hasTable('balita_spk')) {
            return $rankings;
        }

        $kode = array_values(array_filter(array_map(
            fn ($r) => is_array($r) ? ($r['id'] ?? null) : null,
            $rankings
        )));

        if ($kode === []) {
            return $rankings;
        }

        $nonaktif = BalitaSpk::whereIn('kode', $kode)
            ->where('aktif', false)
            ->pluck('kode')
            ->all();

        return array_map(function ($r) use ($nonaktif) {
            if (is_array($r)) {
                $r['aktif'] = ! in_array($r['id'] ?? null, $nonaktif, true);
            }

            return $r;
        }, $rankings);
    }

    public function calculate(Request $request)
    {
        $request->validate([
            'method' => ['nullable', 'string', 'in:moora,MOORA'],
            'alternatives' => ['required', 'array', 'min:1'],
            'alternatives.*.id' => ['required'],
            'alternatives.*.name' => ['required', 'string'],
            'alternatives.*.values' => ['required', 'array'],
            'criteria' => ['nullable', 'array', 'min:1'],
            'criteria.*.code' => ['required_with:criteria', 'string'],
            'criteria.*.weight' => ['required_with:criteria', 'numeric', 'min:0'],
        ]);

        // ----------------------------------------------------------------
        // BALITA NONAKTIF DIKELUARKAN DARI PERHITUNGAN, di server.
        // Klien boleh saja mengirimkannya; ia tetap dibuang di sini. Balita
        // nonaktif tetap ada di basis data dan tetap tampil di daftar.
        // ----------------------------------------------------------------

        // ================================================================
        // BOBOT TERKUNCI — TIDAK DINAMIS.
        //
        // Kriteria dan bobot SELALU diambil dari hasil Fuzzy AHP yang
        // diturunkan KriteriaDefinition. Apa pun yang dikirim klien pada field
        // 'criteria' DIABAIKAN sepenuhnya.
        //
        // Sebelumnya klien boleh mengirim bobot sendiri, dan ketika kriteria
        // dinonaktifkan di antarmuka bobotnya diredistribusi secara
        // proporsional. Keduanya dihapus: bobot wajib berasal dari satu
        // perhitungan AHP yang sah, bukan dari keadaan antarmuka pemakai.
        // Field 'criteria' masih diterima demi kompatibilitas kontrak API,
        // tetapi nilainya tidak lagi memengaruhi hasil.
        // ================================================================
        $criteria = KriteriaDefinition::denganBobot(
            $this->fuzzyAhpService->hitungDefault()['bobot_fuzzy']
        );

        try {
            $result = $this->spkEngine->calculate(
                $request->input('method', 'moora'),
                $request->alternatives ?? [],
                $criteria
            );

            $result['rankings'] = $this->tandaiNonaktif($result['rankings'] ?? []);

            return response()->json([
                'status' => 'success',
                'weighting_method' => 'Fuzzy AHP (Buckley 1985) — bobot terkunci, tidak dinamis',
                'scoring_method' => 'MOORA',
                'priority_rule' => 'Aturan klinis absolut (bukan ambang relatif min-max)',
                'weights_locked' => true,
                'data' => $result,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Mengambil sampel balita dari basis data (tabel balita_spk).
     */
    public function datasetSamples(Request $request)
    {
        // Batas atas dinaikkan dari 100 menjadi 500 agar seluruh kohort dataset
        // dummy (120 balita) dapat dimuat dalam satu tampilan. Batas lama 100
        // membuat 20 balita tidak pernah bisa muncul bersama yang lain.
        $limit = min(max((int) $request->query('limit', 20), 1), 500);
        $offset = max((int) $request->query('offset', 0), 0);
        $filter = $request->query('status', null);
        $includeC2C4 = filter_var($request->query('include_c2_c4', true), FILTER_VALIDATE_BOOLEAN);

        $result = $this->datasetService->getBalitaSamples($limit, $offset, $filter, $includeC2C4);

        if (isset($result['error'])) {
            return response()->json([
                'status' => 'error',
                'message' => $result['error'],
            ], 404);
        }

        return response()->json($result);
    }

    /**
     * Mengambil ringkasan statistik data balita dari basis data..
     */
    public function datasetSummary()
    {
        $summary = $this->datasetService->getDatasetSummary();

        if (isset($summary['error'])) {
            return response()->json([
                'status' => 'error',
                'message' => $summary['error'],
            ], 404);
        }

        return response()->json($summary);
    }
}
