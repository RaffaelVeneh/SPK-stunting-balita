# SPK Prioritas Intervensi Gizi Balita (Stunting) — UNY Edition

Sistem Pendukung Keputusan (SPK) Triase Intervensi Gizi Balita Berbasis Multi-Criteria Decision Making (**SAW & MOORA**) dengan Autentikasi Khusus Civitas Akademika **Universitas Negeri Yogyakarta**.

---

## 🎓 Kebijakan Autentikasi Domain UNY

Akses ke dalam sistem dibatasi secara ketat hanya untuk akun resmi UNY:
- **`@uny.ac.id`** (Dosen, Tenaga Kependidikan, Administrator)
- **`@student.uny.ac.id`** (Mahasiswa UNY)

### Akun Superadmin:
- **Email**: `raffaelvincent.2024@student.uny.ac.id`
- **Password Default (Seeder)**: `password123`
- **Role**: `superadmin`

---

## 📌 Metodologi SPK (Multi-Criteria Decision Making)

Mendukung 7 kriteria triase balita skala ordinal 1–5 (arah benefit terhadap risiko):
- **C1**: Kondisi Gizi & Pertumbuhan (TB/U, BB/U, BB/TB, tren) — Bobot: 34.40%
- **C2**: Riwayat Kelahiran Berisiko (BBLR, Prematur) — Bobot: 8.81%
- **C3**: Riwayat Penyakit / Infeksi (Diare, ISPA) — Bobot: 22.89%
- **C4**: Kualitas Pola Pemberian Makan (ASI, MPASI) — Bobot: 14.66%
- **C5**: Sanitasi & Akses Air Bersih — Bobot: 5.21%
- **C6**: Kerentanan Sosial-Ekonomi — Bobot: 8.81%
- **C7**: Akses Layanan Kesehatan (Posyandu, kontrol) — Bobot: 5.21%

### Metode yang Diterapkan:
1. **SAW (Simple Additive Weighting)**: Penjumlahan terbobot rating kinerja ternormalisasi skala benefit.
2. **MOORA (Multi-Objective Optimization on the basis of Ratio Analysis)**: Normalisasi matriks rasio vektor akar kuadrat dan optimasi nilai manfaat vs biaya.

---

## 🛠️ Tech Stack & Arsitektur

```text
app/
├── backend/                    # Laravel 11 API Backend
│   ├── app/Http/Controllers/   # AuthController (UNY Domain Validation) & SpkController
│   ├── app/Rules/              # UnyEmailRule (@uny.ac.id | @student.uny.ac.id)
│   ├── app/Services/SPK/       # SawService, MooraService, SpkEngine
│   └── database/migrations/    # 8 tabel (users, wilayah, balita, pengukuran, dll)
│
├── frontend/                   # React SPA Murni (Vite + Tailwind CSS + Lucide Icons)
│   ├── src/pages/              # LoginPage (UNY Brand) & DashboardPage (Interactive SPK)
│   └── src/services/api.ts     # Client HTTP terintegrasi
│
├── docker-compose.yml          # MySQL (3307), Redis (6380), Backend (8000), Frontend (3000)
└── README.md
```

---

## 🚀 Cara Menjalankan

### Opsi 1: Menggunakan Docker Compose (Full Stack)

```bash
docker compose up --build
```
Akses layanan:
* **Web Application (React SPA)**: [http://localhost:3000](http://localhost:3000)
* **Backend API (Laravel)**: [http://localhost:8000](http://localhost:8000)
* **MySQL Database**: `localhost:3307`
* **Redis**: `localhost:6380`

### Opsi 2: Menjalankan Secara Lokal (Development)

#### 1. Backend (Laravel)
```bash
cd backend
composer install
php artisan migrate --seed
php artisan serve --port=8000
```

#### 2. Frontend (React SPA)
```bash
cd frontend
npm install
npm run dev
```
Akses di browser: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Pengujian (Testing)

### Test Backend Laravel & Auth Domain UNY
```bash
cd backend
php artisan test
```
*Memverifikasi penolakan domain luar (@gmail/@yahoo), login akun UNY, serta perhitungan SAW dan MOORA.*

### Test Build Frontend React SPA
```bash
cd frontend
npm run build
```
