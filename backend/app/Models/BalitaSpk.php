<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Satu baris data balita beserta tujuh skor kriterianya.
 */
class BalitaSpk extends Model
{
    protected $table = 'balita_spk';

    protected $fillable = [
        'kode', 'nama', 'usia_bulan', 'jenis_kelamin', 'tinggi_badan_cm',
        'haz', 'status_gizi', 'tren_memburuk',
        'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7',
        'aktif', 'sumber',
    ];

    protected $casts = [
        'usia_bulan' => 'integer',
        'tinggi_badan_cm' => 'float',
        'haz' => 'float',
        'tren_memburuk' => 'boolean',
        'aktif' => 'boolean',
        'sumber' => 'string',
        'c1' => 'integer',
        'c2' => 'integer',
        'c3' => 'integer',
        'c4' => 'integer',
        'c5' => 'integer',
        'c6' => 'integer',
        'c7' => 'integer',
    ];

    /** Bentuk yang dipakai antarmuka dan mesin SPK. */
    public function keArray(): array
    {
        return [
            'id' => $this->kode,
            'name' => $this->nama,
            'aktif' => (bool) $this->aktif,
            'sumber' => $this->sumber,
            // Dipakai antarmuka untuk menampilkan kapan data terakhir diubah.
            'diperbarui_pada' => $this->updated_at?->toIso8601String(),
            'dibuat_pada' => $this->created_at?->toIso8601String(),
            'values' => [
                'C1' => $this->c1, 'C2' => $this->c2, 'C3' => $this->c3,
                'C4' => $this->c4, 'C5' => $this->c5, 'C6' => $this->c6,
                'C7' => $this->c7,
            ],
            'raw_attributes' => [
                'umur_bulan' => $this->usia_bulan,
                'jenis_kelamin' => $this->jenis_kelamin,
                'tinggi_badan_cm' => $this->tinggi_badan_cm,
                'haz' => $this->haz,
                'status_gizi' => $this->status_gizi,
                'tren_memburuk' => $this->tren_memburuk,
            ],
        ];
    }
}