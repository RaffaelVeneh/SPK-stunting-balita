<?php

namespace App\Http\Controllers;

use App\Models\BalitaSpk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD data balita.
 *
 * Tidak ada penghapusan permanen. Data yang salah atau sudah tidak terpakai
 * dinonaktifkan: ia keluar dari perhitungan tetapi tetap tampil di daftar
 * dengan tampilan redup, sehingga masih bisa diaktifkan kembali.
 */
class BalitaController extends Controller
{
    /** Aturan validasi. Ketujuh kriteria WAJIB dan harus 1-5. */
    private function aturan(bool $baru): array
    {
        $aturan = [
            'nama' => ['required', 'string', 'max:80'],
            'usia_bulan' => ['required', 'integer', 'min:0', 'max:72'],
            'jenis_kelamin' => ['required', 'string', 'max:20'],
            'tinggi_badan_cm' => ['required', 'numeric', 'min:30', 'max:140'],
            'haz' => ['required', 'numeric', 'min:-6', 'max:6'],
            'status_gizi' => ['required', 'string', 'max:30'],
            'tren_memburuk' => ['required', 'boolean'],
        ];
        foreach (range(1, 7) as $i) {
            // Tanpa required dan rentang ini, balita berkriteria kosong bisa
            // masuk dan merusak seluruh perhitungan di bawahnya.
            $aturan["c{$i}"] = ['required', 'integer', 'min:1', 'max:5'];
        }
        if ($baru) {
            $aturan['kode'] = [
                'required', 'string', 'max:20',
                'regex:/^[A-Za-z0-9\-]+$/',
                'unique:balita_spk,kode',
            ];
        }
        return $aturan;
    }

    public function index(): JsonResponse
    {
        $semua = BalitaSpk::orderBy('kode')->get();

        return response()->json([
            'status' => 'success',
            'total' => $semua->count(),
            'jumlah_aktif' => $semua->where('aktif', true)->count(),
            'jumlah_nonaktif' => $semua->where('aktif', false)->count(),
            'data' => $semua->map(fn (BalitaSpk $b) => $b->keArray())->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->aturan(true));
        $data['sumber'] = 'manual';
        $data['aktif'] = true;

        $b = BalitaSpk::create($data);

        return response()->json([
            'status' => 'success',
            'message' => "Balita {$b->kode} ditambahkan.",
            'data' => $b->keArray(),
        ], 201);
    }

    public function update(Request $request, string $kode): JsonResponse
    {
        $b = BalitaSpk::where('kode', $kode)->firstOrFail();
        $b->update($request->validate($this->aturan(false)));

        return response()->json([
            'status' => 'success',
            'message' => "Data {$b->kode} diperbarui.",
            'data' => $b->fresh()->keArray(),
        ]);
    }

    /** Ubah status aktif. Tidak menghapus apa pun. */
    public function toggleAktif(string $kode): JsonResponse
    {
        $b = BalitaSpk::where('kode', $kode)->firstOrFail();
        $b->aktif = ! $b->aktif;
        $b->save();

        return response()->json([
            'status' => 'success',
            'message' => $b->aktif
                ? "{$b->kode} diaktifkan kembali dan ikut perhitungan."
                : "{$b->kode} dinonaktifkan — tidak ikut perhitungan, tetap tampil di daftar.",
            'data' => $b->keArray(),
        ]);
    }
}