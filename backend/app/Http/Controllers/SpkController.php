<?php

namespace App\Http\Controllers;

use App\Services\SPK\SpkEngine;
use Illuminate\Http\Request;
use InvalidArgumentException;

class SpkController extends Controller
{
    public function __construct(
        protected SpkEngine $spkEngine
    ) {}

    /**
     * Mengambil daftar 7 kriteria standar triase balita dan bobot defaultnya.
     */
    public function criteria()
    {
        $criteria = [
            ['code' => 'C1', 'name' => 'Kondisi Gizi & Pertumbuhan (TB/U, BB/U, BB/TB)', 'weight' => 0.3440, 'type' => 'benefit'],
            ['code' => 'C2', 'name' => 'Riwayat Kelahiran Berisiko (BBLR, Prematur)', 'weight' => 0.0881, 'type' => 'benefit'],
            ['code' => 'C3', 'name' => 'Riwayat Penyakit / Infeksi (Diare, ISPA)', 'weight' => 0.2289, 'type' => 'benefit'],
            ['code' => 'C4', 'name' => 'Kualitas Pola Pemberian Makan (ASI, MPASI)', 'weight' => 0.1466, 'type' => 'benefit'],
            ['code' => 'C5', 'name' => 'Sanitasi & Akses Air Bersih', 'weight' => 0.0521, 'type' => 'benefit'],
            ['code' => 'C6', 'name' => 'Kerentanan Sosial-Ekonomi', 'weight' => 0.0881, 'type' => 'benefit'],
            ['code' => 'C7', 'name' => 'Akses & Pemanfaatan Layanan Kesehatan', 'weight' => 0.0521, 'type' => 'benefit'],
        ];

        return response()->json([
            'status' => 'success',
            'criteria' => $criteria,
        ]);
    }

    /**
     * Menjalankan kalkulasi SAW atau MOORA.
     */
    public function calculate(Request $request)
    {
        $request->validate([
            'method' => ['required', 'string', 'in:saw,moora,SAW,MOORA'],
            'alternatives' => ['required', 'array', 'min:1'],
            'alternatives.*.id' => ['required'],
            'alternatives.*.name' => ['required', 'string'],
            'alternatives.*.values' => ['required', 'array'],
            'criteria' => ['required', 'array', 'min:1'],
            'criteria.*.code' => ['required', 'string'],
            'criteria.*.weight' => ['required', 'numeric', 'min:0'],
        ]);

        try {
            $result = $this->spkEngine->calculate(
                $request->method,
                $request->alternatives,
                $request->criteria
            );

            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
