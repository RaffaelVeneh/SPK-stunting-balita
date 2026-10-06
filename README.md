# 🏥 SPK Prioritas Intervensi Gizi Balita

> **Sistem Pendukung Keputusan (SPK)** berbasis metode hibrida **Fuzzy Sub-Kriteria + Fuzzy AHP (Buckley) + MOORA** untuk triase klinis prioritas intervensi stunting balita. Dikembangkan sebagai proyek penelitian di **Universitas Negeri Yogyakarta (UNY)**.

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
│      ┌──────────────┐            ┌────────────┐             │
│      │ SpkEngine    │─── MOORA ─▶│MooraService│             │
│      │ (router)     │            └────────────┘             │
│      └──────┬───────┘                                        │
│             │ bobot                                          │
│             ▼                                                │
│   ┌────────────────────┐   ┌──────────────────┐             │
│   │ FuzzyAhpService    │◀──│KriteriaDefinition│             │
│   │ (Buckley 1985)     │   │ (sumber tunggal) │             │
│   └────────────────────┘   └──────────────────┘             │
└────────────────────┬─────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
  ┌─────────────┐ ┌───────┐ ┌──────────────────────────┐
  │ MySQL 8.4   │ │Redis 7│ │ dummy_balita_7kriteria.csv│
  │ Port 3307   │ │:6380  │ │ 120 balita, 7 kriteria    │
  └─────────────┘ └───────┘ └──────────────────────────┘
```

> **Catatan metodologi**: metode skoring **difiksasi ke MOORA saja**. SAW sudah dihapus
> supaya tidak ada dua rumus yang berjalan bersamaan. Bobot kriteria ditentukan oleh
> **Fuzzy AHP**, dan tingkat prioritas ditentukan oleh **aturan klinis absolut** — bukan
> oleh ambang relatif terhadap kohort.

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
┌───────────────────────────────────────────┐
│  TAHAP 2: PEMBOBOTAN FUZZY AHP            │
│  Struktur tier dari Perpres 72/2021       │
│  Pasal 1 + bukti literatur                │
│       ↓ aturan deterministik              │
│  Matriks Saaty 7×7 (21 perbandingan)      │
│       ↓ Buckley 1985 (TFN + defuzzifikasi)│
│  → Bobot w₁ … w₇   ·   CR = 0.0396 ✓      │
└────────────┬──────────────────────────────┘
             │
             ▼
┌───────────────────────────────────────────┐
│  TAHAP 3: SKORING MOORA                   │
│  r_ij = x_ij / √(Σx²)                     │
│  y_i  = Σ w_j · r_ij   → URUTAN           │
└────────────┬──────────────────────────────┘
             │
             ▼
┌───────────────────────────────────────────┐
│  TAHAP 4: TRIASE KLINIS ABSOLUT           │
│  Tingkat ditentukan dari profil anak      │
│  (C1 + jumlah kriteria risiko tinggi)     │
│  → Sangat Tinggi / Tinggi / Sedang / Rendah│
└───────────────────────────────────────────┘
```

> **Catatan**: Sistem ini **bukan** Fuzzy Mamdani (tidak ada rule base / defuzzifikasi
> pada tahap kriteria). Fungsi keanggotaan dipakai untuk konversi data mentah ke skala
> ordinal 1–5, sedangkan kerangka fuzzy yang kedua dipakai pada **Fuzzy AHP** untuk
> memodelkan ketidakpastian pertimbangan antar-kriteria.

### Bobot Fuzzy AHP (7 Kriteria)

Bobot tidak lagi diketik manual. Semuanya **diturunkan** dari `KriteriaDefinition`
(struktur tier) lewat `FuzzyAhpService`, sehingga matriks dan bobot mustahil tidak sinkron.

| Kode | Kriteria | Tier | Jalur | Bobot | Dasar utama |
|---|---|---|---|---|---|
| **C1** | Kondisi Gizi & Pertumbuhan (TB/U) | 1 | Langsung | **29,96%** | Prevalensi stunting Indonesia pooled 30,9%; sinyal triase paling langsung (Victora 2010) |
| **C2** | Riwayat Kelahiran (BBLR, Prematur) | 1 | Langsung | **29,96%** | Danaei 2016: FGR/prematur klaster terdepan, 10,8 juta kasus; LBW pooled OR 2,92 |
| **C3** | Riwayat Penyakit / Infeksi | 2 | Langsung | 13,90% | Perpres 72/2021 Pasal 1; Danaei: diare 5,8 juta kasus; Checkley 2008 OR 1,13/episode |
| **C4** | Pola Pemberian Makan (ASI, MPASI) | 2 | Langsung | 13,90% | RCT SHINE: lengan IYCF menurunkan stunting 35%→27% |
| **C5** | Sanitasi & Air Bersih | 3 | Tidak langsung | 6,70% | Danaei: sanitasi tidak layak 7,2 juta kasus; Torlesse 2016 aOR 3,47 |
| **C6** | Kerentanan Sosial-Ekonomi | 4 | Tidak langsung | 3,55% | Kerawanan pangan POR 2,00; namun bantuan tunai hanya −1,35% |
| **C7** | Akses Layanan Kesehatan | 5 | Tidak langsung | 2,04% | Bukti TERLEMAH — tidak ada meta-analisis untuk kehadiran Posyandu |

**Uji Konsistensi AHP:** λmax = 7,3134, CI = 0,0522, RI = 1,32, **CR = 0,0396 < 0,10 ✓**

> ⚠️ **Catatan penting soal CR**: karena matriks diturunkan dari satu nilai tier per
> kriteria, matriksnya transitif **secara konstruksi**. Nilai CR di atas karena itu hanya
> mencerminkan galat pembulatan ke bilangan Saaty, **bukan** kualitas pertimbangan, dan
> **tidak boleh** diklaim sebagai validasi keahlian pakar. Validasi yang bermakna ada pada
> uji sensitivitas (lihat `analisis/hasil_ahp.txt` Bagian 6): dari 12 skenario pergeseran
> tier, ketiga invarian struktural tetap bertahan.

### Tingkat Prioritas: Aturan Klinis Absolut

Skor MOORA menentukan **urutan**; tingkat prioritas ditentukan **aturan klinis absolut**
dari profil anak, sehingga tidak berubah karena komposisi kohort.

| Tingkat | Aturan | Tindakan |
|---|---|---|
| Sangat Tinggi | C1 = 5, atau C1 = 4 dengan ≥ 2 kriteria lain ≥ 4 | Rujuk Dokter Spesialis Anak & PMT Pemulihan Segera |
| Tinggi | C1 = 4, atau C1 ≤ 3 dengan ≥ 3 kriteria lain ≥ 4 | Kunjungan Rumah Kader & Konseling Gizi Intensif |
| Sedang | C1 = 3, atau C1 ≤ 2 dengan ≥ 2 kriteria ≥ 4, atau ≥ 3 kriteria = 3 | Pemantauan Rutin Posyandu & Suplementasi Vitamin |
| Rendah | selainnya | Pemantauan Rutin Posyandu |

Anak dengan data < 5 dari 7 kriteria ditandai **perlu verifikasi lapangan** dan tingkatnya
tidak boleh diturunkan sepihak.

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
│   │   │       ├── DatasetService.php     # Baca dataset 7 kriteria (+ cadangan format lama)
│   │   │       └── SPK/
│   │   │           ├── KriteriaDefinition.php  # SUMBER TUNGGAL: 7 kriteria + tier + matriks
│   │   │           ├── FuzzyAhpService.php     # Fuzzy AHP (Buckley 1985) + uji CR
│   │   │           ├── AhpService.php          # AHP crisp (matriks yang diisi pengguna)
│   │   │           ├── MooraService.php        # Normalisasi Euclidean + triase klinis absolut
│   │   │           └── SpkEngine.php           # Router (MOORA saja)
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
│   ├── dummy_balita_7kriteria.csv  # 120 balita dummy, 7 kriteria lengkap (DIPAKAI)
│   └── data_balita.csv             # 121.001 baris — hanya 4 kolom (cadangan)
│
├── analisis/                       # Pembuktian bobot AHP (auditable & reproducible)
│   ├── kriteria.py                 # Sumber tunggal tier kriteria
│   ├── fuzzy_ahp.py                # Pipeline Fuzzy AHP + uji sensitivitas
│   ├── generate_dataset_dummy.py   # Generator dataset dummy 7 kriteria
│   ├── triase_klinis.py            # Aturan triase klinis absolut
│   ├── uji_dampak_bobot.py         # Uji apakah bobot mengubah urutan
│   ├── uji_kritis.py               # Uji vacuity CR & reachability bobot
│   ├── verify_php_ahp.php          # Verifikasi silang PHP vs Python (bobot)
│   ├── verify_php_moora.php        # Verifikasi silang PHP vs Python (MOORA/triase)
│   ├── hasil_ahp.txt               # LAPORAN PEMBUKTIAN lengkap
│   └── bobot_final.json            # Bobot final yang dipakai sistem
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
GET    /api/spk/criteria              Daftar 7 kriteria, tier, jalur & bobot Fuzzy AHP
POST   /api/spk/calculate             Body: { alternatives, criteria? } → dipaksa MOORA
POST   /api/spk/calculate             Body: { method: "saw" } → DITOLAK (422)
GET    /api/spk/ahp/matrix            Matriks 7×7 + jejak audit 21 perbandingan + CR
POST   /api/spk/ahp/calculate         Body: { criteria, matrix } → bobot + CR
GET    /api/spk/dataset/samples       Query: ?limit=20&offset=0&status=all
GET    /api/spk/dataset/summary       Statistik + sebaran tiap kriteria
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

Sistem memakai **dataset dummy sintetis** sebagai sumber utama, murni dibangkitkan
(tidak mengambil dari data lapangan), sesuai ketentuan penelitian ini.

| Atribut | Dataset utama | Dataset cadangan |
|---|---|---|
| **File** | `dataset/dummy_balita_7kriteria.csv` | `dataset/data_balita.csv` |
| **Jumlah** | 120 balita | 121.001 baris |
| **Kolom** | 16 (identitas, antropometri, HAZ, status gizi, tren, **c1–c7**, kelengkapan) | 4 |
| **Kriteria tersedia** | **Ketujuh (C1–C7), semua bervariasi penuh 1–5** | Hanya C1 (C2 & C4 dikarang heuristik) |
| **Profil klinis unik** | 117 dari 120 | 5 dari 20 (pada sampel yang dipakai) |
| **Korelasi antar-kriteria** | +0,05 s.d. +0,52 (koheren, tidak kolinear) | C1 vs C2 r = 0,87 (kolinear) |

> **Mengapa dataset cadangan tidak dipakai lagi**: pada format 4 kolom, 4 dari 7 kriteria
> menjadi konstan dan sisanya berkolinear kuat. Akibatnya perangkingan **tidak sensitif
> terhadap bobot AHP** — diuji dengan 7 skenario bobot yang sangat berbeda, Spearman
> selalu 1,0000 dan tidak ada satu pun peringkat balita yang berubah. Sistem jadi tidak
> dapat mendemonstrasikan kemampuannya membedakan prioritas.

Dataset dummy dibangkitkan oleh `analisis/generate_dataset_dummy.py` dengan seed tetap
(`SEED = 20260730`), sehingga hasilnya selalu sama dan dapat direproduksi.

---

## ✨ Fitur Aplikasi

### Tab Triase & Data Balita
- [x] Input manual kohort balita
- [x] Metode skoring **difiksasi ke MOORA** (SAW dihapus)
- [x] Toggle aktif/nonaktif kriteria C1–C7 secara real-time
- [x] Redistribusi bobot proporsional saat kriteria dinonaktifkan
- [x] Tingkat prioritas dari **aturan klinis absolut**, bukan ambang relatif kohort
- [x] Data kosong **tidak** diimputasi; anak dengan data < 5/7 ditandai perlu verifikasi
- [x] Tabel ranking dengan badge skor kriteria berwarna (merah/amber/hijau)
- [x] Perangkingan seri: skor sama → peringkat sama
- [x] Modal rincian klinis per balita (rapor nilai 1–5 tiap kriteria)
- [x] Export multi-sheet Excel (Hasil Triase, Perhitungan MOORA, Fuzzy AHP, Rubrik)
- [x] Integrasi dataset dummy 7 kriteria (120 balita)

### Tab Panduan Lengkap
- [x] **Sub-tab 1** — Alur & Tahapan SPK (tabel 7 langkah)
- [x] **Sub-tab 2** — Sub-Kriteria & Fungsi Keanggotaan Fuzzy (tabel lengkap domain & kurva)
- [x] **Sub-tab 3** — Rincian Matematis MOORA + aturan triase klinis absolut
- [x] **Sub-tab 4** — Pembobotan Fuzzy AHP (matriks 7×7, tier, λmax, CI, RI, CR)
- [x] **Sub-tab 5** — Flowchart visual alur komputasi MOORA + Fuzzy AHP

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
| Fuzzy AHP | Buckley, J.J. (1985). *Fuzzy Hierarchical Analysis*. Fuzzy Sets and Systems |
| MOORA | Brauers, W.K. & Zavadskas, E.K. (2006). *The MOORA Method* |
| Dasar hukum tier | Perpres No. 72 Tahun 2021 tentang Percepatan Penurunan Stunting, Pasal 1 |
| Beban atribusional | Danaei, G. et al. (2016). *Risk Factors for Childhood Stunting in 137 Developing Countries*. PLoS Medicine |
| Infeksi (C3) | Checkley, W. et al. (2008) — odds stunting +1,13 per 5 episode diare |
| Pola makan (C4) | RCT SHINE (Sanitation, Hygiene, Infant Nutrition Efficacy) |
| Sanitasi (C5) | Torlesse, H. et al. (2016); Cumming, O. et al. (2019) BMC Medicine |
| Riwayat lahir (C2) | Christian, P. et al. (2013); Gusnedi et al. (2023) untuk konteks Indonesia |
| Prevalensi nasional | SSGI 2021–2024 & SKI 2023 (Kemenkes/BKPK) |
| TB/U Z-score (C1) | WHO Child Growth Standards (2006) |
| Fuzzifikasi | Zadeh, L.A. (1965). *Fuzzy Sets. Information and Control* |

> Daftar rujukan lengkap beserta angka yang diverifikasi ada di `EVIDENCE_BASE_AHP_CRITERIA.md`
> dan `analisis/hasil_ahp.txt` Bagian 9.

### 🔬 Reproduksibilitas Pembuktian

Seluruh rantai dari bukti ke bobot dapat dijalankan ulang:

```bash
# 1. Bangkitkan dataset dummy (seed tetap)
python analisis/generate_dataset_dummy.py

# 2. Hitung bobot Fuzzy AHP + uji konsistensi + uji sensitivitas
python analisis/fuzzy_ahp.py

# 3. Uji apakah bobot benar-benar mengubah urutan prioritas
python analisis/uji_dampak_bobot.py

# 4. Uji apakah aturan triase klinis konsisten dengan status gizi
python analisis/triase_klinis.py

# 5. Verifikasi silang: implementasi PHP harus IDENTIK dengan Python
php analisis/verify_php_ahp.php
php analisis/verify_php_moora.php

# 6. Uji backend
cd app/backend && php vendor/bin/phpunit
```

---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan penelitian akademik di UNY.  
© 2024–2026 Tim SPK Stunting Balita — Universitas Negeri Yogyakarta.
