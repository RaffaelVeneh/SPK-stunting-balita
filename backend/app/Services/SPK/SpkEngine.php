<?php

namespace App\Services\SPK;

use InvalidArgumentException;

class SpkEngine
{
    public function __construct(
        protected SawService $sawService,
        protected MooraService $mooraService
    ) {}

    /**
     * Jalankan perhitungan SPK berdasarkan metode yang dipilih.
     */
    public function calculate(string $method, array $alternatives, array $criteria): array
    {
        return match (strtolower(trim($method))) {
            'saw' => $this->sawService->calculate($alternatives, $criteria),
            'moora' => $this->mooraService->calculate($alternatives, $criteria),
            default => throw new InvalidArgumentException("Metode '{$method}' tidak didukung. Pilihan metode: saw, moora.")
        };
    }
}
