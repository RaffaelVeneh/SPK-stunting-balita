<?php

namespace App\Services\SPK;

/**
 * FUZZY AHP (Buckley 1985) — perhitungan bobot kriteria.
 *
 * Mengapa fuzzy: modul SPK[TIK]-3-AHP (UNY) sendiri menyebut kelemahan AHP
 * adalah "ketergantungan pada input utamanya (persepsi ahli), sehingga
 * subjektivitas tinggi". Fuzzy AHP adalah jawaban baku atas kelemahan itu:
 * setiap perbandingan tidak dianggap angka pasti, melainkan bilangan fuzzy
 * segitiga (TFN), sehingga ketidakpastian dimodelkan dan dilaporkan sebarannya
 * alih-alih disembunyikan di balik satu angka.
 *
 * Implementasi ini adalah pasangan dari analisis/fuzzy_ahp.py. Keduanya
 * memakai aturan yang sama:
 *
 *   Fuzzifikasi nilai Saaty v:
 *       v = 1  -> (1, 1, 1)
 *       v > 1  -> (v-1, v, v+1) dipotong ke [1, 9]
 *       v < 1  -> kebalikannya, yaitu (1/u, 1/m, 1/l)
 *   Bobot: rata-rata geometrik fuzzy per baris, dinormalisasi, lalu
 *          defuzzifikasi graded mean w = (l + 4m + u) / 6.
 *
 * Uji konsistensi (CR) dihitung pada matriks tegas, mengikuti metode modul:
 * normalisasi kolom lalu rata-rata baris, RI(n=7) = 1,32.
 *
 * CATATAN METODOLOGIS: karena matriks diturunkan dari satu nilai tier per
 * kriteria, matriksnya transitif secara konstruksi. Nilai CR karena itu hanya
 * mencerminkan galat pembulatan ke bilangan Saaty, BUKAN kualitas pertimbangan.
 * Jangan mengklaim CR di sini sebagai validasi keahlian pakar.
 */
class FuzzyAhpService
{
    private const RI = [
        1 => 0.00, 2 => 0.00, 3 => 0.58, 4 => 0.90, 5 => 1.12,
        6 => 1.24, 7 => 1.32, 8 => 1.41, 9 => 1.45, 10 => 1.49,
    ];

    private const EPS = 1e-12;

    /** TFN untuk nilai Saaty v >= 1. */
    private function fuzzGeSatu(float $v): array
    {
        if (abs($v - 1.0) < self::EPS) {
            return [1.0, 1.0, 1.0];
        }
        return [
            max(1.0, $v - 1.0),
            $v,
            min((float) KriteriaDefinition::SAATY_MAKS, $v + 1.0),
        ];
    }

    /**
     * Nilai Saaty tegas -> TFN (l, m, u).
     *
     * Nilai < 1 adalah perbandingan KEBALIKAN (a_ji = 1/a_ij), bukan
     * "sama penting", sehingga TFN-nya juga harus dibalik. Kalau tidak,
     * semua perbandingan "kurang penting" akan salah dianggap setara.
     */
    public function fuzzify(float $v): array
    {
        if (abs($v - 1.0) < self::EPS) {
            return [1.0, 1.0, 1.0];
        }
        if ($v > 1.0) {
            return $this->fuzzGeSatu($v);
        }
        [$l, $m, $u] = $this->fuzzGeSatu(1.0 / $v);
        return [1.0 / $u, 1.0 / $m, 1.0 / $l];
    }

    /**
     * Fuzzy AHP Buckley: bobot fuzzy + bobot tegas hasil defuzzifikasi.
     *
     * @return array{tfn: array<int, array{0:float,1:float,2:float}>, bobot: array<int, float>}
     */
    public function hitungFuzzy(array $A): array
    {
        $n = count($A);

        // 1. Rata-rata geometrik fuzzy per baris
        $r = [];
        for ($i = 0; $i < $n; $i++) {
            $acc = [1.0, 1.0, 1.0];
            for ($j = 0; $j < $n; $j++) {
                [$l, $m, $u] = $this->fuzzify((float) $A[$i][$j]);
                $acc[0] *= $l;
                $acc[1] *= $m;
                $acc[2] *= $u;
            }
            $r[$i] = [
                $acc[0] ** (1.0 / $n),
                $acc[1] ** (1.0 / $n),
                $acc[2] ** (1.0 / $n),
            ];
        }

        // 2. Bobot fuzzy = r_i (x) (jumlah seluruh r)^-1
        $sumL = array_sum(array_column($r, 0));
        $sumM = array_sum(array_column($r, 1));
        $sumU = array_sum(array_column($r, 2));

        $tfn = [];
        $tegas = [];
        foreach ($r as $i => [$l, $m, $u]) {
            $tfn[$i] = [
                $sumU > 0 ? $l / $sumU : 0.0,
                $sumM > 0 ? $m / $sumM : 0.0,
                $sumL > 0 ? $u / $sumL : 0.0,
            ];
            // 3. Defuzzifikasi graded mean
            $tegas[$i] = ($tfn[$i][0] + 4.0 * $tfn[$i][1] + $tfn[$i][2]) / 6.0;
        }

        $total = array_sum($tegas);
        $bobot = array_map(
            static fn (float $v): float => $total > 0 ? $v / $total : 0.0,
            $tegas
        );

        return ['tfn' => $tfn, 'bobot' => array_values($bobot)];
    }

    /**
     * AHP crisp (metode modul UNY): normalisasi kolom -> rata-rata baris,
     * lalu uji konsistensi Saaty.
     */
    public function hitungCrisp(array $A): array
    {
        $n = count($A);

        $colSums = array_fill(0, $n, 0.0);
        for ($j = 0; $j < $n; $j++) {
            for ($i = 0; $i < $n; $i++) {
                $colSums[$j] += (float) $A[$i][$j];
            }
        }

        $w = array_fill(0, $n, 0.0);
        for ($i = 0; $i < $n; $i++) {
            $s = 0.0;
            for ($j = 0; $j < $n; $j++) {
                $s += $colSums[$j] > 0 ? (float) $A[$i][$j] / $colSums[$j] : 0.0;
            }
            $w[$i] = $s / $n;
        }

        // lambda_max = rata-rata (A w)_i / w_i
        $lambdaMax = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $aw = 0.0;
            for ($j = 0; $j < $n; $j++) {
                $aw += (float) $A[$i][$j] * $w[$j];
            }
            $lambdaMax += $w[$i] > 0 ? $aw / $w[$i] : 0.0;
        }
        $lambdaMax /= $n;

        $ci = ($lambdaMax - $n) / ($n - 1);
        $ri = self::RI[$n] ?? 1.49;
        $cr = $ri > 0 ? $ci / $ri : 0.0;

        return [
            'bobot' => array_values($w),
            'lambda_max' => $lambdaMax,
            'ci' => $ci,
            'ri' => $ri,
            'cr' => $cr,
            'konsisten' => $cr < 0.10,
        ];
    }

    /** Ambang tingkat konsistensi sesuai modul AHP. */
    public function statusLabel(float $cr): string
    {
        return $cr < 0.10
            ? 'KONSISTEN (CR < 0.10)'
            : 'TIDAK KONSISTEN (Harus Diisi Ulang)';
    }

    /**
     * Hitung bobot dari matriks apa pun, kembalikan hasil crisp dan fuzzy
     * lengkap dengan pemetaan ke kode kriteria.
     *
     * @param  array<int, string>  $kode
     */
    public function hitung(array $A, array $kode): array
    {
        $crisp = $this->hitungCrisp($A);
        $fuzzy = $this->hitungFuzzy($A);

        $bobotCrisp = [];
        $bobotFuzzy = [];
        $tfn = [];
        foreach ($kode as $i => $k) {
            $bobotCrisp[$k] = round($crisp['bobot'][$i], 6);
            $bobotFuzzy[$k] = round($fuzzy['bobot'][$i], 6);
            $tfn[$k] = array_map(static fn ($v) => round($v, 6), $fuzzy['tfn'][$i]);
        }

        return [
            'kode' => $kode,
            'bobot_crisp' => $bobotCrisp,
            'bobot_fuzzy' => $bobotFuzzy,
            'tfn' => $tfn,
            'lambda_max' => round($crisp['lambda_max'], 6),
            'consistency_index' => round($crisp['ci'], 6),
            'random_index' => $crisp['ri'],
            'consistency_ratio' => round($crisp['cr'], 6),
            'is_valid' => $crisp['konsisten'],
            'status_label' => $this->statusLabel($crisp['cr']),
            'catatan_konsistensi' => 'CR dihitung pada matriks tegas, yaitu nilai modal dari matriks '
                . 'perbandingan berpasangan pakar. Karena matriks ini adalah penilaian pakar yang berdiri '
                . 'sendiri — bukan turunan dari satu skor per kriteria — uji konsistensi di sini benar-benar '
                . 'menguji kekoherenan pertimbangan, bukan sekadar galat pembulatan ke bilangan Saaty. '
                . 'CR < 0,10 berarti perbandingan pakar saling konsisten dan bobot yang dihasilkan sah dipakai.',
        ];
    }

    /**
     * Bobot default sistem, diturunkan sepenuhnya dari KriteriaDefinition.
     * Tidak ada angka bobot yang di-hardcode di mana pun.
     */
    public function hitungDefault(): array
    {
        return $this->hitung(
            KriteriaDefinition::matriksPasangan(),
            KriteriaDefinition::kode()
        );
    }
}
