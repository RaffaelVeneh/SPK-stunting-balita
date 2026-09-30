<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class UnyEmailRule implements ValidationRule
{
    /**
     * Domain email yang diizinkan untuk login dan registrasi.
     */
    protected array $allowedDomains = [
        'uny.ac.id',
        'student.uny.ac.id',
    ];

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value) || !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $fail('Format email tidak valid.');
            return;
        }

        $email = strtolower(trim($value));
        $domain = substr(strrchr($email, "@"), 1);

        if (!in_array($domain, $this->allowedDomains, true)) {
            $fail('Akses dibatasi. Hanya akun resmi Universitas Negeri Yogyakarta (@uny.ac.id atau @student.uny.ac.id) yang diizinkan masuk.');
        }
    }
}
