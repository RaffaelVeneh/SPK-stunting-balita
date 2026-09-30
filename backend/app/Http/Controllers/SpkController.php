<?php

namespace App\Http\Controllers;

use App\Services\DatasetService;
use App\Services\SPK\AhpService;
use App\Services\SPK\SpkEngine;
use Illuminate\Http\Request;
use InvalidArgumentException;

class SpkController extends Controller
{
    public function __construct(
        protected SpkEngine $spkEngine,
        protected AhpService $ahpService,
        protected DatasetService $datasetService
    ) {}

    /**
     * Mengambil daftar 7 kriteria standar triase balita dan bobot defaultnya (Hasil AHP).
     */
    public function criteria()
    {
        $criteria = [
            [
                'code' => 'C1',
                'name' => 'Kondisi Gizi & Pertumbuhan (TB/U, BB/U, BB/TB)',
                'weight' => 0.3440,
                'type' => 'benefit',
                'description' => 'Evaluasi antropometri stunting (TB/U z-score). 1=Optimal/Tinggi, 4=Stunted, 5=Severely Stunted.'
            ],
            [
                'code' => 'C2',
                'name' => 'Riwayat Kelahiran Berisiko (BBLR, Prematur)',
                'weight' => 0.0881,
                'type' => 'benefit',
                'description' => 'Berat badan lahir dan usia gestasi saat lahir. 1=Cukup Bulan & BB Normal, 5=BBLSR (<1500g) / Prematur ekstrem.'
            ],
            [
                'code' => 'C3',
                'name' => 'Riwayat Penyakit / Infeksi (Diare, ISPA)',
                'weight' => 0.2289,
                'type' => 'benefit',
                'description' => 'Frekuensi dan keparahan infeksi 6 bulan terakhir. 1=Tidak pernah sakit, 5=Infeksi kronis / TB Anak.'
            ],
            [
                'code' => 'C4',
                'name' => 'Kualitas Pola Pemberian Makan (ASI, MPASI)',
                'weight' => 0.1466,
                'type' => 'benefit',
                'description' => 'Praktik pemberian ASI eksklusif 6 bulan dan kecukupan protein hewani MPASI. 1=ASI & MPASI adekuat, 5=Gagal makan parah.'
            ],
            [
                'code' => 'C5',
                'name' => 'Sanitasi & Akses Air Bersih',
                'weight' => 0.0521,
                'type' => 'benefit',
                'description' => 'Ketersediaan jamban sehat dan sumber air minum keluarga. 1=Air perpipaan & jamban sendiri, 5=BABS / limbah terbuka.'
            ],
            [
                'code' => 'C6',
                'name' => 'Kerentanan Sosial-Ekonomi',
                'weight' => 0.0881,
                'type' => 'benefit',
                'description' => 'Kondisi ekonomi keluarga dan daya beli pangan bergizi. 1=Mapan (>UMR), 5=Kemiskinan ekstrem.'
            ],
            [
                'code' => 'C7',
                'name' => 'Akses & Pemanfaatan Layanan Kesehatan',
                'weight' => 0.0521,
                'type' => 'benefit',
                'description' => 'Keaktifan kunjungan Posyandu bulanan dan kelengkapan imunisasi dasar. 1=100% Rutin & Tuntas, 5=Drop out / Tidak pernah.'
            ],
        ];

        return response()->json([
            'status' => 'success',
            'weighting_method' => 'AHP (Analytic Hierarchy Process)',
            'criteria' => $criteria,
        ]);
    }

    /**
     * Mengambil matriks perbandingan berpasangan AHP resmi dan status konsistensinya.
     */
    public function ahpMatrix()
    {
        $default = $this->ahpService->getDefaultAhpMatrix();
        $calc = $this->ahpService->computeWeights($default['criteria'], $default['matrix']);

        return response()->json([
            'status' => 'success',
            'criteria' => $default['criteria'],
            'matrix' => $default['matrix'],
            'ahp_result' => $calc,
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
     * Menjalankan kalkulasi SAW atau MOORA menggunakan bobot AHP (Toleran Data Parsial).
     */
    public function calculate(Request $request)
    {
        $request->validate([
            'method' => ['required', 'string', 'in:saw,moora,SAW,MOORA'],
            'alternatives' => ['required', 'array', 'min:1'],
            'alternatives.*.id' => ['required'],
            'alternatives.*.name' => ['required', 'string'],
            'alternatives.*.values' => ['required', 'array'],
            'criteria' => ['nullable', 'array', 'min:1'],
            'criteria.*.code' => ['required_with:criteria', 'string'],
            'criteria.*.weight' => ['required_with:criteria', 'numeric', 'min:0'],
        ]);

        // Jika criteria tidak dikirim, gunakan criteria default AHP
        $criteria = $request->input('criteria');
        if (empty($criteria)) {
            $defaultCriteriaData = $this->criteria()->getData(true);
            $criteria = $defaultCriteriaData['criteria'];
        }

        try {
            $result = $this->spkEngine->calculate(
                $request->method,
                $request->alternatives,
                $criteria
            );

            return response()->json([
                'status' => 'success',
                'weighting_method' => 'AHP (Dynamic Re-distribution)',
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
     * Mengambil sampel balita langsung dari dataset nyata data_balita.csv.
     */
    public function datasetSamples(Request $request)
    {
        $limit = min(max((int) $request->query('limit', 20), 1), 100);
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
     * Mengambil ringkasan statistik dataset data_balita.csv (121.001 data).
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
