<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SpkController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'service' => 'SPK Stunting Balita - Laravel Backend API',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Authentication (Domain @uny.ac.id & @student.uny.ac.id)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// SPK Decision Support System (Fuzzy AHP Weighting + MOORA Scoring)
Route::prefix('spk')->group(function () {
    Route::get('/criteria', [SpkController::class, 'criteria']);
    Route::post('/calculate', [SpkController::class, 'calculate']);
    
    // Fuzzy AHP Weighting & Consistency Ratio (CR < 0.10)
    Route::get('/ahp/matrix', [SpkController::class, 'ahpMatrix']);
    Route::post('/ahp/calculate', [SpkController::class, 'ahpCalculate']);

    // Dataset dummy 7 kriteria (dummy_balita_7kriteria.csv)
    Route::get('/dataset/samples', [SpkController::class, 'datasetSamples']);
    Route::get('/dataset/summary', [SpkController::class, 'datasetSummary']);
});
