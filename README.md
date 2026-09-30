# 🏥 SPK Prioritas Intervensi Gizi Balita

> **Sistem Pendukung Keputusan (SPK)** berbasis metode hibrida **Fuzzy Sub-Kriteria + AHP + SAW/MOORA** untuk triase klinis prioritas intervensi stunting balita. Dikembangkan sebagai proyek penelitian di **Universitas Negeri Yogyakarta (UNY)**.

[![Laravel](https://img.shields.io/badge/Laravel-12.x-FF2D20?logo=laravel)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql)](https://www.mysql.com)

---

## 📋 Deskripsi Singkat

Sistem ini dirancang sebagai **Alat Triase Klinis** — bukan model prediktif — yang membantu tenaga kesehatan dan kader Posyandu menentukan **balita mana yang paling mendesak** mendapat intervensi gizi, berdasarkan 7 kriteria terstandar WHO/Kemenkes. Output berupa perangkingan dengan tingkat prioritas (Sangat Tinggi / Tinggi / Sedang / Rendah).

> ⚠️ **Disclaimer**: Sistem ini merupakan alat bantu akademik. Keputusan klinis tetap berada di tangan tenaga medis berwenang.

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
│              React 19 SPA — Port 3000                       │
│     (TypeScript · Vite · Tailwind CSS · Lucide Icons)       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP REST API (JSON)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND API — Port 8000                     │
│              Laravel 12 · PHP 8.2 · Sanctum                 │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │ AuthController│  │SpkController │  │  DatasetService  │  │
│   └─────────────┘  └──────┬───────┘  └──────────────────┘  │
│                           │                                  │
│            ┌──────────────┴──────────────┐                  │
│            ▼                             ▼                   │
│      ┌──────────┐                 ┌──────────┐              │
│      │SawService│                 │MooraService│             │
│      └──────────┘                 └──────────┘              │
│            └──────────────┬──────────────┘                  │
│                           ▼                                  │
│                    ┌────────────┐                            │
│                    │ AhpService │                            │
│                    └────────────┘                            │
└────────────────────┬─────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
  ┌─────────────┐ ┌───────┐ ┌─────────────────────┐
  │ MySQL 8.4   │ │Redis 7│ │ data_balita.csv      │
  │ Port 3307   │ │:6380  │ │ 121,001 rows dataset │
  └─────────────┘ └───────┘ └─────────────────────┘
```

---

## 🛠️ Tech Stack Lengkap

### Backend
| Teknologi | Versi | Fungsi |
|---|---|---|
| **PHP** | 8.2+ | Runtime bahasa server |
| **Laravel** | 12.x | Framework backend (MVC, routing, Eloquent ORM) |
| **Laravel Sanctum** | 4.x | Token-based API authentication (SPA) |
| **MySQL** | 8.4 | Database relasional (users, wilayah, token) |
| **Redis** | 7 Alpine | Cache & queue driver |
| **PHPUnit** | 11.x | Unit testing backend |

### Frontend
| Teknologi | Versi | Fungsi |
|---|---|---|
| **React** | 19.x | UI framework (Hooks, Functional Components) |
| **TypeScript** | 6.x | Static typing untuk React + API types |
| **Vite** | 8.x | Build tool & dev server (HMR) |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Lucide React** | 1.49+ | Icon library |
| **SheetJS (xlsx)** | 0.18 | Multi-sheet Excel export |
| **OXLint** | 1.81+ | Fast JavaScript/TypeScript linter |

### Infrastructure
| Teknologi | Versi | Fungsi |
|---|---|---|
| **Docker** | Compose v2 | Containerisasi seluruh layanan |
| **Nginx** | Alpine | Static file server untuk React SPA build |
| **phpMyAdmin** | Latest | GUI MySQL — Port 8081 |

---

## 🧮 Metodologi SPK

Sistem mengimplementasikan pendekatan **hibrida tiga tahap**:

```
Data Mentah Lapangan
        │
        ▼
┌───────────────────────────┐
│  TAHAP 1: FUZZIFIKASI     │
│  Fungsi Keanggotaan       │
│  Trapezoid & Segitiga     │
│  → Nilai Ordinal 1–5      │
│  (per C1 s.d. C7)         │
└────────────┬──────────────┘
             │
             ▼
┌───────────────────────────┐
│  TAHAP 2: PEMBOBOTAN AHP  │
│  Analytic Hierarchy       │
│  Process (Saaty, 1980)    │
│  Matriks 7×7, CR = 0.0079 │
│  → Bobot w₁ … w₇          │
└────────────┬──────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
┌──────────┐  ┌──────────────┐
│   SAW    │  │    MOORA     │
│ r=x/max  │  │ r=x/√(Σx²)  │
│ Vi∈[0,1] │  │ Spread rel.  │
└──────────┘  └──────────────┘
      └──────┬──────┘
             ▼
    Perangkingan Descending
    → Output Triase Klinis
```

> **Catatan**: Sistem ini **bukan** Fuzzy Mamdani (tidak ada rule base / defuzzifikasi). Fungsi keanggotaan digunakan murni untuk konversi data mentah ke skala ordinal 1–5 pada tahap pra-pemrosesan.

### Bobot AHP (7 Kriteria)

| Kode | Kriteria | Bobot | Referensi |
|---|---|---|---|
| **C1** | Kondisi Gizi & Pertumbuhan (TB/U Z-score) | **35.62%** | WHO Child Growth Standards |
| **C2** | Riwayat Kelahiran (BBL + Usia Gestasi) | 8.68% | WHO Preterm Terminology |
| **C3** | Riwayat Penyakit Infeksi | **22.62%** | WHO Lancet Series 2013 |
| **C4** | Pola Asuh Makan (IYCF) | 14.45% | WHO/UNICEF IYCF Framework |
| **C5** | Sanitasi & Air Bersih | 4.97% | WHO/UNICEF JMP Service Ladder |
| **C6** | Kondisi Sosial-Ekonomi | 8.68% | BPS Garis Kemiskinan / DTKS |
| **C7** | Akses Layanan Kesehatan (Posyandu) | 4.97% | Kemenkes SPM (≥8x/tahun) |

**Uji Konsistensi AHP:** λmax = 7.0625, CI = 0.0104, RI = 1.32, **CR = 0.0079 < 0.10 ✓**

---

## 📁 Struktur Direktori

```
SPK Stunting Balita/
├── app/
│   ├── backend/                    # Laravel 12 API
│   │   ├── app/
│   │   │   ├── Http/Controllers/
│   │   │   │   ├── AuthController.php     # Login, Register, Logout, Me
│   │   │   │   └── SpkController.php      # Kriteria, Calculate, AHP, Dataset
│   │   │   ├── Models/
│   │   │   │   └── User.php               # Eloquent model + role + superadmin
│   │   │   ├── Rules/
│   │   │   │   └── UnyEmailRule.php       # Validasi @uny.ac.id & @student.uny.ac.id
│   │   │   └── Services/
│   │   │       ├── DatasetService.php     # Parsing data_balita.csv (121K rows)
│   │   │       └── SPK/
│   │   │           ├── AhpService.php     # Hitung bobot AHP & CR
│   │   │           ├── SawService.php     # Normalisasi linear + weighted sum
│   │   │           ├── MooraService.php   # Normalisasi Euclidean + spread relatif
│   │   │           └── SpkEngine.php      # Router SAW / MOORA
│   │   ├── database/migrations/           # Tabel users, spk_sessions, wilayah, dst.
│   │   ├── routes/api.php                 # Semua endpoint REST API
│   │   └── Dockerfile                     # PHP 8.2 + Composer + Artisan serve
│   │
│   ├── frontend/                   # React 19 SPA
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   └── DashboardPage.tsx      # Halaman utama (triase + panduan)
│   │   │   ├── components/
│   │   │   │   ├── Navbar.tsx             # Top navigation bar
│   │   │   │   └── MethodologyGuide.tsx   # Panduan Lengkap (5 sub-tab)
│   │   │   ├── services/
│   │   │   │   └── api.ts                 # Axios-like fetch wrapper ke backend
│   │   │   ├── utils/
│   │   │   │   └── exportExcel.ts         # Multi-sheet XLSX export (4 sheet)
│   │   │   └── types/
│   │   │       └── index.ts               # TypeScript types (Alternative, Criterion, dll.)
│   │   ├── nginx.conf                     # Nginx SPA routing (try_files)
│   │   └── Dockerfile                     # Node 20 build → Nginx Alpine serve
│   │
│   └── docker-compose.yml          # Orkestrasi 5 container
│
├── dataset/
│   └── data_balita.csv             # 121,001 baris data balita anonim
│
├── modul/
│   └── SPK[TIK]-3-AHP.pdf         # Modul AHP UNY (Tika Novita Sari, M.Cs.)
│
└── README.md                       # File ini
```

---

## 🚀 Cara Menjalankan (Docker)

### Prasyarat
- Docker Desktop (Windows/macOS/Linux)
- Git

### Langkah Setup

```bash
# 1. Clone repository
git clone https://github.com/RaffaelVeneh/SPK-stunting-balita.git
cd SPK-stunting-balita/app

# 2. Build & jalankan semua container
docker-compose up -d --build

# 3. Cek status semua container
docker-compose ps
```

### Akses Layanan

| Layanan | URL | Keterangan |
|---|---|---|
| **Frontend (React)** | http://localhost:3000 | Aplikasi utama |
| **Backend API** | http://localhost:8000/api | REST API Laravel |
| **API Health Check** | http://localhost:8000/api/health | Status backend |
| **phpMyAdmin** | http://localhost:8081 | GUI database MySQL |
| **MySQL** | localhost:3307 | Direct DB connection |
| **Redis** | localhost:6380 | Cache/queue |

### Rebuild Frontend (setelah ubah kode)

```bash
# Wajib dilakukan setiap ada perubahan kode frontend
cd app/
docker-compose build frontend
docker-compose up -d --no-deps frontend
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login      Body: { email, password }
POST   /api/auth/register   Body: { name, email, password, password_confirmation }
GET    /api/auth/me         Header: Authorization: Bearer {token}
POST   /api/auth/logout     Header: Authorization: Bearer {token}
```

> **Domain terbatas**: Hanya email `@uny.ac.id` dan `@student.uny.ac.id` yang diterima.

### SPK Decision Support
```
GET    /api/spk/criteria              Daftar 7 kriteria & bobot aktif
POST   /api/spk/calculate             Body: { method, alternatives, criteria }
GET    /api/spk/ahp/matrix            Matriks perbandingan AHP 7×7
POST   /api/spk/ahp/calculate         Body: { matrix } → bobot + CR
GET    /api/spk/dataset/samples       Query: ?limit=20&offset=0&filter_status=all
GET    /api/spk/dataset/summary       Statistik & distribusi status gizi dataset
```

---

## 👤 Akun Superadmin

Daftarkan akun dengan email berikut untuk mendapat role `superadmin` secara otomatis:

| Nama | Email |
|---|---|
| Raffael Vincent | raffaelvincent.2024@student.uny.ac.id |
| Muhammad Faizul Haq | muhammadfaizulhaq.2024@student.uny.ac.id |
| Galant Ona Latif | galantonalatif.2024@student.uny.ac.id |

---

## 📊 Dataset

| Atribut | Detail |
|---|---|
| **File** | `dataset/data_balita.csv` |
| **Jumlah Baris** | 121,001 balita anonim |
| **Kolom** | Umur (bulan), Jenis Kelamin, Tinggi Badan (cm), Status Gizi |
| **Distribusi Status Gizi** | Severely Stunted / Stunted / Normal / Tinggi |
| **Sumber** | Dataset penelitian gizi Indonesia (anonim) |

> Dataset **tidak ter-commit ke GitHub** (`.gitignore`) karena ukurannya. Letakkan file di `dataset/data_balita.csv` relatif terhadap folder `app/`.

---

## ✨ Fitur Aplikasi

### Tab Triase & Data Balita
- [x] Input manual kohort balita (10 balita dummy terpresetasi)
- [x] Pilih metode: **SAW** atau **MOORA**
- [x] Toggle aktif/nonaktif kriteria C1–C7 secara real-time
- [x] Kalkulasi ulang bobot AHP secara proporsional saat kriteria dinonaktifkan
- [x] Tabel ranking dengan badge skor kriteria berwarna (merah/amber/hijau)
- [x] Modal rincian klinis per balita (rapor nilai 1–5 tiap kriteria)
- [x] Export multi-sheet Excel (4 sheet: Ranking, Perhitungan, AHP, Fuzzy)
- [x] Integrasi dataset CSV 121K baris

### Tab Panduan Lengkap
- [x] **Sub-tab 1** — Alur & Tahapan SPK (tabel 7 langkah)
- [x] **Sub-tab 2** — Sub-Kriteria & Fungsi Keanggotaan Fuzzy (tabel lengkap domain & kurva)
- [x] **Sub-tab 3** — Rincian Matematis SAW / MOORA (rumus, normalisasi, ambang prioritas)
- [x] **Sub-tab 4** — Pembobotan AHP (matriks 7×7, λmax, CI, RI, CR)
- [x] **Sub-tab 5** — Flowchart visual alur komputasi SAW vs MOORA

---

## 🗃️ Database Schema (Migrasi Utama)

```sql
-- Tabel users
CREATE TABLE users (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  name           VARCHAR(255),
  email          VARCHAR(255) UNIQUE,  -- hanya @uny.ac.id / @student.uny.ac.id
  password       VARCHAR(255),
  role           ENUM('user','admin','superadmin') DEFAULT 'user',
  wilayah_id     BIGINT NULLABLE,
  created_at     TIMESTAMP,
  updated_at     TIMESTAMP
);

-- Tabel personal_access_tokens (Laravel Sanctum)
CREATE TABLE personal_access_tokens (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  tokenable_type VARCHAR(255),
  tokenable_id   BIGINT,
  name           VARCHAR(255),
  token          VARCHAR(64) UNIQUE,
  abilities      TEXT,
  last_used_at   TIMESTAMP NULLABLE,
  expires_at     TIMESTAMP NULLABLE
);
```

---

## 🧪 Testing

```bash
# Backend unit test
cd app/backend
php artisan test

# Type check frontend (tanpa build)
cd app/frontend
npx tsc --noEmit
```

---

## 👥 Tim Pengembang

| Nama | NIM | Peran |
|---|---|---|
| Raffael Vincent | 2024 | Backend & System Architecture |
| Muhammad Faizul Haq | 2024 | Frontend & UI/UX |
| Galant Ona Latif | 2024 | Metodologi SPK & Dataset |

**Pembimbing Modul AHP:** Tika Novita Sari, S.Pd., M.Cs.  
**Institusi:** Departemen Pendidikan Teknik Elektronika dan Informatika, Fakultas Teknik, Universitas Negeri Yogyakarta

---

## 📚 Referensi Metodologi

| Komponen | Referensi |
|---|---|
| AHP | Saaty, T.L. (1980). *The Analytic Hierarchy Process*. McGraw-Hill |
| SAW | Fishburn, P.C. (1967). *Additive Utilities with Incomplete Product Set* |
| MOORA | Brauers, W.K. & Zavadskas, E.K. (2006). *The MOORA Method* |
| TB/U Z-score (C1) | WHO Child Growth Standards (2006) |
| Fuzzifikasi | Zadeh, L.A. (1965). *Fuzzy Sets. Information and Control* |
| Sanitasi (C5) | WHO/UNICEF JMP Service Ladder (2017) |
| Pola Makan (C4) | WHO/UNICEF IYCF Framework (2010) |
| Posyandu (C7) | Kemenkes RI, SPM Bidang Kesehatan (Permenkes No. 4/2019) |
| Kemiskinan (C6) | BPS Garis Kemiskinan & DTKS Desil (2023) |

---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan penelitian akademik di UNY.  
© 2024–2026 Tim SPK Stunting Balita — Universitas Negeri Yogyakarta.
