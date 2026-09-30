<?php

namespace App\Services;

class DatasetService
{
    /**
     * Dapatkan path file data_balita.csv.
     */
    public function getDatasetPath(): ?string
    {
        $candidates = [
            storage_path('dataset/data_balita.csv'),
            '/var/www/dataset/data_balita.csv',
            base_path('../dataset/data_balita.csv'),
            base_path('../../dataset/data_balita.csv'),
            'C:\\CODE\\SPK Stunting Balita\\dataset\\data_balita.csv',
        ];

        foreach ($candidates as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Ambil sampel balita dari data_balita.csv dan petakan ke alternatif SPK.
     *
     * @param int $limit Jumlah data sampel yang diambil (default 20, max 100)
     * @param int $offset Offset baris (default 0)
     * @param string|null $filterStatus Filter status gizi ('all', 'stunted', 'severely stunted', 'normal', 'tinggi')
     * @param bool $includeSimulatedC2C4 Apakah menyertakan simulasi kriteria C2 & C4 dari usia/TB
     * @return array
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
                'error' => 'Dataset data_balita.csv tidak ditemukan atau tidak dapat dibaca.',
                'samples' => [],
                'total_rows' => 0,
            ];
        }

        $file = fopen($path, 'r');
        if (!$file) {
            return [
                'error' => 'Gagal membuka file CSV.',
                'samples' => [],
                'total_rows' => 0,
            ];
        }

        // Header: Umur (bulan), Jenis Kelamin, Tinggi Badan (cm), Status Gizi
        $header = fgetcsv($file);

        $samples = [];
        $rowIdx = 0;
        $matchedCount = 0;
        $filteredTarget = $filterStatus && strtolower($filterStatus) !== 'all' ? strtolower($filterStatus) : null;

        while (($row = fgetcsv($file)) !== false) {
            $rowIdx++;

            if (count($row) < 4) {
                continue;
            }

            $umur = (int) trim($row[0]);
            $jk = strtolower(trim($row[1]));
            $tb = (float) trim($row[2]);
            $statusGizi = strtolower(trim($row[3]));

            if ($filteredTarget && $statusGizi !== $filteredTarget) {
                continue;
            }

            $matchedCount++;

            if ($matchedCount <= $offset) {
                continue;
            }

            // Pemetaan C1 dari Status Gizi resmi Kemenkes/WHO
            $c1Score = match ($statusGizi) {
                'severely stunted' => 5.0,
                'stunted' => 4.0,
                'normal' => 2.0,
                'tinggi' => 1.0,
                default => 3.0,
            };

            // Pemetaan / inferensi C2 (Riwayat Lahir) dan C4 (Pola Asuh) jika diaktifkan
            $values = ['C1' => $c1Score];

            if ($includeSimulatedC2C4) {
                // Balita usia 0-6 bulan dengan TB sangat rendah cenderung memiliki riwayat BBLR/prematur (C2)
                if ($umur <= 6) {
                    $c2 = ($tb < 46.0) ? 4.0 : (($tb < 48.0) ? 3.0 : 1.0);
                    $c4 = ($statusGizi === 'severely stunted') ? 4.0 : 2.0;
                } else {
                    $c2 = ($statusGizi === 'severely stunted') ? 3.0 : 2.0;
                    $c4 = match ($statusGizi) {
                        'severely stunted' => 4.0,
                        'stunted' => 3.0,
                        'normal' => 2.0,
                        default => 1.0,
                    };
                }
                $values['C2'] = $c2;
                $values['C4'] = $c4;
            }
            // Kriteria C3, C5, C6, C7 sengaja tidak diisi (missing) untuk mendemonstrasikan fallback "Tahan Banting"

            $genderFormatted = $jk === 'laki-laki' ? 'L' : 'P';
            $id = 'CSV-' . str_pad((string)$rowIdx, 5, '0', STR_PAD_LEFT);
            $name = "Balita #{$rowIdx} ({$umur} bln, {$genderFormatted}, {$tb} cm)";

            $samples[] = [
                'id' => $id,
                'name' => $name,
                'values' => $values,
                'raw_attributes' => [
                    'row_number' => $rowIdx,
                    'umur_bulan' => $umur,
                    'jenis_kelamin' => $jk,
                    'tinggi_badan_cm' => round($tb, 1),
                    'status_gizi' => $statusGizi,
                ],
            ];

            if (count($samples) >= $limit) {
                break;
            }
        }

        fclose($file);

        return [
            'status' => 'success',
            'dataset_source' => basename($path),
            'dataset_path' => $path,
            'total_samples_returned' => count($samples),
            'offset' => $offset,
            'limit' => $limit,
            'active_criteria' => $includeSimulatedC2C4 ? ['C1', 'C2', 'C4'] : ['C1'],
            'missing_criteria' => $includeSimulatedC2C4 ? ['C3', 'C5', 'C6', 'C7'] : ['C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
            'samples' => $samples,
        ];
    }

    /**
     * Hitung ringkasan statistik dataset (total baris dan distribusi status gizi).
     */
    public function getDatasetSummary(): array
    {
        $path = $this->getDatasetPath();
        if (!$path || !is_readable($path)) {
            return [
                'error' => 'Dataset data_balita.csv tidak ditemukan.',
                'total_rows' => 0,
            ];
        }

        $file = fopen($path, 'r');
        $header = fgetcsv($file);

        $totalRows = 0;
        $distribution = [
            'severely stunted' => 0,
            'stunted' => 0,
            'normal' => 0,
            'tinggi' => 0,
        ];

        while (($row = fgetcsv($file)) !== false) {
            $totalRows++;
            $status = strtolower(trim($row[3] ?? ''));
            if (isset($distribution[$status])) {
                $distribution[$status]++;
            }
        }

        fclose($file);

        return [
            'status' => 'success',
            'file_name' => basename($path),
            'total_rows' => $totalRows,
            'distribution' => $distribution,
            'available_columns' => ['Umur (bulan)', 'Jenis Kelamin', 'Tinggi Badan (cm)', 'Status Gizi'],
            'mapped_criteria' => ['C1' => 'Kondisi Gizi & Pertumbuhan (TB/U)'],
        ];
    }
}
