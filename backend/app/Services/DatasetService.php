<?php

namespace App\Services;

use App\Services\SPK\KriteriaDefinition;

/**
 * Pembacaan dataset balita untuk keperluan demo/triase.
 *
 * Mendukung DUA format, dideteksi dari baris header:
 *
 *   1. Format 7 kriteria (UTAMA) — dataset/dummy_balita_7kriteria.csv
 *      Kolom: kode_balita, nama_samar, usia_bulan, jenis_kelamin,
 *             tinggi_badan_cm, haz, status_gizi, tren_memburuk,
 *             c1..c7, kelengkapan
 *      Ketujuh kriteria sudah terisi sungguhan, sehingga sistem dapat
 *      benar-benar menunjukkan kemampuannya membedakan prioritas.
 *
 *   2. Format lama (cadangan) — dataset/data_balita.csv
 *      Kolom: Umur (bulan), Jenis Kelamin, Tinggi Badan (cm), Status Gizi
 *      Hanya memuat antropometri. Versi lama service ini MENGARANG nilai C2
 *      dan C4 dari usia/tinggi badan lewat heuristik, lalu membiarkan C3, C5,
 *      C6, C7 kosong. Cara itu dipertahankan hanya sebagai cadangan supaya
 *      tidak crash, TETAPI tidak lagi dipakai sebagai sumber utama karena
 *      nilai karangan tidak dapat dipertanggungjawabkan dan membuat seluruh
 *      kriteria berkolinear (4 dari 7 kriteria jadi konstan), sehingga
 *      perangkingan menjadi tidak sensitif terhadap bobot AHP.
 */
class DatasetService
{
    public const FILE_UTAMA = 'dummy_balita_7kriteria.csv';
    public const FILE_LAMA = 'data_balita.csv';

    private ?string $pathCache = null;

    /**
     * Cari file dataset, utamakan format 7 kriteria.
     */
    public function getDatasetPath(): ?string
    {
        foreach ([self::FILE_UTAMA, self::FILE_LAMA] as $nama) {
            foreach ($this->kandidat($nama) as $path) {
                if (file_exists($path)) {
                    return $path;
                }
            }
        }

        return null;
    }

    private function kandidat(string $nama): array
    {
        return [
            storage_path('dataset/' . $nama),
            '/var/www/dataset/' . $nama,
            base_path('../dataset/' . $nama),
            base_path('../../dataset/' . $nama),
            'C:\\CODE\\SPK Stunting Balita\\dataset\\' . $nama,
        ];
    }

    /** Apakah file memakai format 7 kriteria? */
    public function isFormat7Kriteria(string $path): bool
    {
        $fh = fopen($path, 'r');
        if (!$fh) {
            return false;
        }
        $header = fgetcsv($fh);
        fclose($fh);

        if (!is_array($header)) {
            return false;
        }
        $lower = array_map(static fn ($h) => strtolower(trim((string) $h)), $header);

        return in_array('kode_balita', $lower, true) && in_array('c1', $lower, true);
    }

    /**
     * Ambil sampel balita dan petakan ke alternatif SPK.
     */
    public function getBalitaSamples(
        int $limit = 20,
        int $offset = 0,
        ?string $filterStatus = null,
        bool $includeSimulatedC2C4 = true
    ): array {
        $path = $this->getDatasetPath();
        if (!$path || !is_readable($path)) {
            return [
                'error' => 'Dataset tidak ditemukan. Diharapkan ' . self::FILE_UTAMA
                    . ' atau ' . self::FILE_LAMA . ' di folder dataset/.',
                'samples' => [],
                'total_rows' => 0,
            ];
        }

        return $this->isFormat7Kriteria($path)
            ? $this->bacaFormat7($path, $limit, $offset, $filterStatus)
            : $this->bacaFormatLama($path, $limit, $offset, $filterStatus, $includeSimulatedC2C4);
    }

    /** Pembacaan format 7 kriteria (semua kriteria terisi sungguhan). */
    private function bacaFormat7(string $path, int $limit, int $offset, ?string $filterStatus): array
    {
        $fh = fopen($path, 'r');
        $header = array_map(static fn ($h) => strtolower(trim((string) $h)), fgetcsv($fh));

        $target = $filterStatus && strtolower($filterStatus) !== 'all'
            ? strtolower($filterStatus)
            : null;

        $samples = [];
        $matched = 0;
        $total = 0;

        while (($row = fgetcsv($fh)) !== false) {
            if (count($row) !== count($header)) {
                continue;
            }
            $r = array_combine($header, $row);
            $total++;

            $status = strtolower(trim($r['status_gizi'] ?? ''));
            if ($target && $status !== $target) {
                continue;
            }

            $matched++;
            if ($matched <= $offset) {
                continue;
            }

            $values = [];
            $hilang = [];
            foreach (KriteriaDefinition::URUTAN as $kode) {
                $v = $r[strtolower($kode)] ?? '';
                if ($v !== '' && is_numeric($v)) {
                    $values[$kode] = (float) $v;
                } else {
                    $hilang[] = $kode;
                }
            }

            $umur = (int) ($r['usia_bulan'] ?? 0);
            $jk = strtolower(trim($r['jenis_kelamin'] ?? ''));
            $jkSingkat = str_starts_with($jk, 'l') ? 'L' : 'P';
            $nama = $r['nama_samar'] ?? $r['kode_balita'];

            $samples[] = [
                'id' => $r['kode_balita'],
                'name' => "{$nama} ({$umur} bln, {$jkSingkat})",
                'values' => $values,
                'raw_attributes' => [
                    'usia_bulan' => $umur,
                    'jenis_kelamin' => $jk,
                    'tinggi_badan_cm' => isset($r['tinggi_badan_cm']) ? (float) $r['tinggi_badan_cm'] : null,
                    'haz' => isset($r['haz']) ? (float) $r['haz'] : null,
                    'status_gizi' => $status,
                    'tren_memburuk' => $r['tren_memburuk'] ?? null,
                    'kelengkapan' => $r['kelengkapan'] ?? null,
                ],
            ];

            if (count($samples) >= $limit) {
                break;
            }
        }
        fclose($fh);

        return [
            'status' => 'success',
            'dataset_source' => basename($path),
            'dataset_path' => $path,
            'dataset_format' => '7_kriteria',
            'is_dummy_sintetis' => true,
            'total_rows' => $total,
            'total_samples_returned' => count($samples),
            'offset' => $offset,
            'limit' => $limit,
            'active_criteria' => KriteriaDefinition::kode(),
            'missing_criteria' => [],
            'samples' => $samples,
        ];
    }

    /**
     * Pembacaan format lama (cadangan). C2 dan C4 dikarang dari heuristik;
     * ini dipertahankan hanya supaya tidak crash, bukan sebagai sumber utama.
     */
    private function bacaFormatLama(
        string $path,
        int $limit,
        int $offset,
        ?string $filterStatus,
        bool $includeSimulatedC2C4
    ): array {
        $fh = fopen($path, 'r');
        fgetcsv($fh); // buang header

        $target = $filterStatus && strtolower($filterStatus) !== 'all'
            ? strtolower($filterStatus)
            : null;

        $samples = [];
        $rowIdx = 0;
        $matched = 0;

        while (($row = fgetcsv($fh)) !== false) {
            $rowIdx++;
            if (count($row) < 4) {
                continue;
            }

            $umur = (int) trim($row[0]);
            $jk = strtolower(trim($row[1]));
            $tb = (float) trim($row[2]);
            $status = strtolower(trim($row[3]));

            if ($target && $status !== $target) {
                continue;
            }
            $matched++;
            if ($matched <= $offset) {
                continue;
            }

            $c1 = match ($status) {
                'severely stunted' => 5.0,
                'stunted' => 4.0,
                'normal' => 2.0,
                'tinggi' => 1.0,
                default => 3.0,
            };

            $values = ['C1' => $c1];
            if ($includeSimulatedC2C4) {
                if ($umur <= 6) {
                    $values['C2'] = $tb < 46.0 ? 4.0 : ($tb < 48.0 ? 3.0 : 1.0);
                    $values['C4'] = $status === 'severely stunted' ? 4.0 : 2.0;
                } else {
                    $values['C2'] = $status === 'severely stunted' ? 3.0 : 2.0;
                    $values['C4'] = match ($status) {
                        'severely stunted' => 4.0,
                        'stunted' => 3.0,
                        'normal' => 2.0,
                        default => 1.0,
                    };
                }
            }

            $id = 'CSV-' . str_pad((string) $rowIdx, 5, '0', STR_PAD_LEFT);
            $samples[] = [
                'id' => $id,
                'name' => "Balita #{$rowIdx} ({$umur} bln, " . ($jk === 'laki-laki' ? 'L' : 'P') . ", {$tb} cm)",
                'values' => $values,
                'raw_attributes' => [
                    'row_number' => $rowIdx,
                    'umur_bulan' => $umur,
                    'jenis_kelamin' => $jk,
                    'tinggi_badan_cm' => round($tb, 1),
                    'status_gizi' => $status,
                ],
            ];

            if (count($samples) >= $limit) {
                break;
            }
        }
        fclose($fh);

        return [
            'status' => 'success',
            'dataset_source' => basename($path),
            'dataset_path' => $path,
            'dataset_format' => 'legacy_4_kolom',
            'is_dummy_sintetis' => false,
            'peringatan' => 'Format lama hanya memuat antropometri. Nilai C2 dan C4 dikarang '
                . 'dari heuristik, dan C3/C5/C6/C7 kosong. Gunakan '
                . self::FILE_UTAMA . ' untuk demonstrasi yang sahih.',
            'total_samples_returned' => count($samples),
            'offset' => $offset,
            'limit' => $limit,
            'active_criteria' => $includeSimulatedC2C4 ? ['C1', 'C2', 'C4'] : ['C1'],
            'missing_criteria' => $includeSimulatedC2C4
                ? ['C3', 'C5', 'C6', 'C7']
                : ['C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
            'samples' => $samples,
        ];
    }

    /**
     * Ringkasan statistik dataset.
     */
    public function getDatasetSummary(): array
    {
        $path = $this->getDatasetPath();
        if (!$path || !is_readable($path)) {
            return ['error' => 'Dataset tidak ditemukan.', 'total_rows' => 0];
        }

        return $this->isFormat7Kriteria($path)
            ? $this->ringkasFormat7($path)
            : $this->ringkasFormatLama($path);
    }

    private function ringkasFormat7(string $path): array
    {
        $fh = fopen($path, 'r');
        $header = array_map(static fn ($h) => strtolower(trim((string) $h)), fgetcsv($fh));

        $total = 0;
        $distribusi = [];
        $kelengkapan = [];
        // sebaran tiap kriteria
        $sebaran = array_fill_keys(KriteriaDefinition::URUTAN, array_fill(1, 5, 0));

        while (($row = fgetcsv($fh)) !== false) {
            if (count($row) !== count($header)) {
                continue;
            }
            $r = array_combine($header, $row);
            $total++;

            $status = strtolower(trim($r['status_gizi'] ?? ''));
            $distribusi[$status] = ($distribusi[$status] ?? 0) + 1;
            $kelengkapan[$r['kelengkapan'] ?? '?'] = ($kelengkapan[$r['kelengkapan'] ?? '?'] ?? 0) + 1;

            foreach (KriteriaDefinition::URUTAN as $kode) {
                $v = $r[strtolower($kode)] ?? '';
                if ($v !== '' && is_numeric($v)) {
                    $i = (int) $v;
                    if (isset($sebaran[$kode][$i])) {
                        $sebaran[$kode][$i]++;
                    }
                }
            }
        }
        fclose($fh);

        return [
            'status' => 'success',
            'file_name' => basename($path),
            'dataset_format' => '7_kriteria',
            'is_dummy_sintetis' => true,
            'keterangan' => 'Dataset dummy sintetis. Ketujuh kriteria bervariasi dan '
                . 'mencakup seluruh rentang 1-5, sehingga sistem dapat menunjukkan '
                . 'kemampuannya membedakan prioritas.',
            'total_rows' => $total,
            'distribution' => $distribusi,
            'kelengkapan_distribution' => $kelengkapan,
            'sebaran_kriteria' => $sebaran,
            'available_columns' => $header,
            'mapped_criteria' => KriteriaDefinition::kode(),
        ];
    }

    private function ringkasFormatLama(string $path): array
    {
        $fh = fopen($path, 'r');
        fgetcsv($fh);

        $total = 0;
        $distribusi = ['severely stunted' => 0, 'stunted' => 0, 'normal' => 0, 'tinggi' => 0];

        while (($row = fgetcsv($fh)) !== false) {
            $total++;
            $status = strtolower(trim($row[3] ?? ''));
            if (isset($distribusi[$status])) {
                $distribusi[$status]++;
            }
        }
        fclose($fh);

        return [
            'status' => 'success',
            'file_name' => basename($path),
            'dataset_format' => 'legacy_4_kolom',
            'is_dummy_sintetis' => false,
            'peringatan' => 'Format lama tidak memuat C2-C7 secara sungguhan.',
            'total_rows' => $total,
            'distribution' => $distribusi,
            'available_columns' => ['Umur (bulan)', 'Jenis Kelamin', 'Tinggi Badan (cm)', 'Status Gizi'],
            'mapped_criteria' => ['C1' => 'Kondisi Gizi & Pertumbuhan (TB/U)'],
        ];
    }
}
