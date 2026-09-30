<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Rules\UnyEmailRule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login khusus akun UNY (@uny.ac.id atau @student.uny.ac.id).
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'email', new UnyEmailRule()],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'Email UNY wajib diisi.',
            'password.required' => 'Password wajib diisi.',
        ]);

        $user = User::where('email', strtolower(trim($request->email)))->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password yang Anda masukkan salah.'],
            ]);
        }

        // Hapus token lama & buat token baru
        $user->tokens()->delete();
        $token = $user->createToken('spk-uny-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_superadmin' => $user->isSuperAdmin(),
                'wilayah_id' => $user->wilayah_id,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Registrasi pengguna baru civitas akademika UNY.
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users', new UnyEmailRule()],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'email.required' => 'Email UNY wajib diisi.',
            'email.unique' => 'Email UNY ini sudah terdaftar.',
            'password.min' => 'Password minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
        ]);

        $email = strtolower(trim($request->email));
        $isSuper = ($email === 'raffaelvincent.2024@student.uny.ac.id');

        $user = User::create([
            'name' => $request->name,
            'email' => $email,
            'password' => Hash::make($request->password),
            'role' => $isSuper ? 'superadmin' : 'petugas',
        ]);

        $token = $user->createToken('spk-uny-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Registrasi akun UNY berhasil.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_superadmin' => $user->isSuperAdmin(),
            ],
            'token' => $token,
        ], 201);
    }

    /**
     * Profil pengguna yang sedang login.
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_superadmin' => $user->isSuperAdmin(),
                'wilayah_id' => $user->wilayah_id,
            ]
        ]);
    }

    /**
     * Logout pengguna.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Logout berhasil.',
        ]);
    }
}
