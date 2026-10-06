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
│  MASUKAN: matriks perbandingan            │
│  berpasangan 7×7 — penilaian pakar gizi   │
│  pada skala Saaty 1–9, ditulis tetap      │
│       ↓ Buckley 1985 (TFN + defuzzifikasi)│
│  → Bobot w₁ … w₇   ·   CR = 0,0079 ✓      │
│  (urutan tingkat = KELUARAN, bukan sebab) │
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

**Dua lapis yang tidak boleh tertukar.** Matriks perbandingan berpasangan 7×7 adalah
**masukan** — penilaian pakar gizi pada skala Saaty 1–9, ditulis tetap sebagai data di
`KriteriaDefinition::MATRIKS`. Kolom **Tier** di bawah adalah **keluaran** — urutan yang
keluar dari perhitungan bobot, bukan penyebabnya. Karena itu pertanyaan "mengapa C2 di
tier 4?" dijawab dengan bobotnya: 8,708%, setara C6.

Perhitungannya memakai **Fuzzy AHP (Buckley 1985)**: TFN `(v−1, v, v+1)` dijepit ke [1,9]
dengan resiprokal dibalik menjadi `(1/u, 1/m, 1/l)`, rata-rata geometrik tiap baris, lalu
defuzzifikasi graded mean `w = (l + 4m + u)/6` dan normalisasi.

| Kode | Kriteria | Tier | Jalur | Bobot | Dasar utama |
|---|---|---|---|---|---|
| **C1** | Kondisi Gizi & Pertumbuhan (TB/U, BB/U, BB/TB) | 1 | Langsung | **35,068%** | Prevalensi stunting Indonesia pooled 30,9%; sinyal triase paling langsung (Victora 2010, Roth 2017) |
| **C2** | Riwayat Kelahiran (BBLR, Prematur) | 4 | Langsung | 8,708% | Danaei 2016: FGR/prematur klaster terdepan, 10,8 juta kasus; BBLR pooled OR 2,92 |
| **C3** | Riwayat Penyakit / Infeksi | 2 | Langsung | 22,755% | Perpres 72/2021 Pasal 1; Checkley 2008 OR 1,13 per 5 episode diare |
| **C4** | Pola Pemberian Makan (ASI, MPASI) | 3 | Langsung | 14,609% | RCT SHINE: lengan IYCF menurunkan stunting 35%→27% |
| **C5** | Sanitasi & Air Bersih | 5 | Tidak langsung | 5,076% | Torlesse 2016 aOR 3,47; namun lengan WASH pada WASH-Benefits & SHINE null |
| **C6** | Kerentanan Sosial-Ekonomi | 4 | Tidak langsung | 8,708% | Kerawanan pangan POR 2,00; namun bantuan tunai hanya −1,35% |
| **C7** | Akses Layanan Kesehatan | 5 | Tidak langsung | 5,076% | Bukti TERLEMAH — tidak ada meta-analisis untuk kehadiran Posyandu |

**Uji konsistensi:** λmax = 7,062469, CI = 0,010411, RI = 1,32, **CR = 0,007887 < 0,10 ✓**

> **Catatan soal CR.** Matriks ini adalah penilaian pakar yang berdiri sendiri, **bukan**
> turunan dari satu skor per kriteria. Karena itu CR di sini benar-benar menguji kekoherenan
> pertimbangan antar-kriteria, bukan sekadar galat pembulatan — dan 0,0079 berarti
> perbandingan pakar saling konsisten.
>
> Bobot fuzzy ini juga berdekatan dengan hasil tegas (crisp) pada matriks yang sama:
> C1 35,616% tegas vs 35,068% fuzzy, dengan selisih maksimum 0,5 poin persentase. Artinya
> kesimpulan bobotnya **stabil terhadap pemodelan ketidakpastian**. Angka bekunya ada di
> `analisis/bobot_resmi.json`; urutan hasilnya C1 > C3 > C4 > C2 = C6 > C5 = C7.

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
│   │   │           ├── AhpService.php          # AHP crisp (metode tegas + uji konsistensi)
│   │   │           ├── MooraService.php        # Normalisasi Euclidean + triase klinis absolut
│   │   │           └── SpkEngine.php           # Router (MOORA saja)
│   │   ├── storage/dataset/               # Dataset DI DALAM repo, agar hasil clone mandiri
│   │   │   ├── dummy_balita_7kriteria.csv # 120 balita, 7 kriteria lengkap (DIPAKAI)
│   │   │   └── data_balita.csv            # 121.001 baris, 4 kolom (cadangan lama)
│   │   ├── database/migrations/           # Tabel users, spk_sessions, wilayah, dst.
│   │   ├── routes/api.php                 # Semua endpoint REST API
│   │   └── Dockerfile                     # PHP 8.2 + Composer + Artisan serve
│   │
│   ├── frontend/                   # React 19 SPA
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── DashboardPage.tsx      # Tiga seksi: Triase, Bukti Perhitungan, Panduan
│   │   │   │   └── LoginPage.tsx          # Halaman masuk + pita bobot dari API
│   │   │   ├── components/
│   │   │   │   ├── papan.tsx              # PitaBobot, Tally, PenandaTingkat, RampCell
│   │   │   │   ├── ProofPanel.tsx         # Bukti perhitungan AHP: matriks, audit, CR, TFN
│   │   │   │   ├── Diagram.tsx            # Enam diagram alir (SVG bentuk baku flowchart)
│   │   │   │   └── MethodologyGuide.tsx   # Panduan metodologi (4 sub-tab)
│   │   │   ├── hooks/
│   │   │   │   └── useHitungNaik.ts       # Angka ringkasan yang bergulir naik
│   │   │   ├── services/
│   │   │   │   └── api.ts                 # Pembungkus fetch ke backend
│   │   │   ├── utils/
│   │   │   │   └── exportExcel.ts         # Ekspor XLSX multi-sheet + jejak audit
│   │   │   ├── types/
│   │   │   │   └── index.ts               # Tipe TypeScript
│   │   │   └── index.css                  # Sistem desain: token, animasi, bilah gulir
│   │   ├── public/fonts/                  # Archivo & Archivo Narrow (di-host sendiri)
│   │   ├── nginx.conf                     # Nginx SPA routing (try_files)
│   │   └── Dockerfile                     # Node 20 build → Nginx Alpine serve
│   │
│   └── docker-compose.yml          # Orkestrasi 5 container
│
├── dataset/                        # Root proyek — DI LUAR repo ini
│   └── dummy_balita_7kriteria.csv  # Sumber generator (seed tetap 20260730)
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
│   └── bobot_resmi.json            # Angka resmi bobot (matriks, fuzzy, TFN, CR)
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
| **File** | `backend/storage/dataset/dummy_balita_7kriteria.csv` | `backend/storage/dataset/data_balita.csv` |
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

### Seksi Triase Prioritas
- [x] **Bobot terkunci** pada hasil AHP — tidak ada toggle kriteria, tidak ada redistribusi
      bobot, dan bobot kiriman klien diabaikan server
- [x] Daftar peringkat 120 balita, dengan **goresan tally** sebagai skor 1–5 tiap kriteria
- [x] Pita tujuh bobot yang lebarnya sebanding dengan bobot AHP-nya
- [x] Penyaring jumlah baris, status gizi, dan pencarian kode / nama
- [x] Tingkat prioritas dari **aturan klinis absolut**, bukan ambang relatif kohort
- [x] Data kosong **tidak** diimputasi; balita dengan data < 5/7 ditandai perlu verifikasi
      **tanpa** menurunkan tingkatnya
- [x] Perangkingan seri: skor sama mendapat peringkat sama
- [x] Panel rincian per balita: nilai tujuh kriteria, dasar tingkat, dan tindakan yang disarankan
- [x] Panel rincian mengunci gulir halaman, dapat digulir sendiri, dan ditutup dengan Escape
- [x] Export multi-sheet Excel beserta langkah perhitungan dan jejak audit

### Seksi Bukti Perhitungan
- [x] Urutan kepentingan hasil perhitungan, lengkap dengan dasar tiap penempatan
- [x] Matriks perbandingan berpasangan 7×7 beserta jumlah baris dan jumlah kolom
- [x] Jejak audit 21 perbandingan unik, dibaca langsung dari matriks
- [x] Uji konsistensi: λmax, CI, RI, dan CR
- [x] Bobot tegas vs fuzzy beserta TFN dan lebar sebarannya

### Seksi Panduan Metodologi
- [x] Alur perhitungan tujuh tahap
- [x] **Diagram alir**: alur pengguna, alur sistem, alur AHP, alur MOORA, pohon keputusan
      triase klinis, dan arsitektur wadah
- [x] Sub-kriteria fuzzy: domain dan kurva tiap kriteria
- [x] Rumus MOORA dan aturan triase klinis

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

> Daftar rujukan lengkap beserta angka yang diverifikasi ada di
> `../EVIDENCE_BASE_AHP_CRITERIA.md` (root proyek, di luar repo ini).

### 🔬 Reproduksibilitas Pembuktian

Seluruh rantai dari bukti ke bobot dapat dijalankan ulang:

> ⚠️ Folder `analisis/` berada di **root proyek**, satu tingkat di atas repo ini, dan **tidak
> ikut ter-commit**. Skrip bertanda *(historis)* merekam penurunan yang pernah dipakai tetapi
> **bukan lagi sumber angka** yang berlaku — status tiap berkas ada di `analisis/README.md`.

```bash
# 1. Bangkitkan dataset dummy (seed tetap 20260730)
python ../analisis/generate_dataset_dummy.py

# 2. Terapkan aturan triase klinis atas dataset
python ../analisis/triase_klinis.py

# 3. Verifikasi silang: implementasi PHP harus IDENTIK dengan acuan Python
php ../analisis/verify_php_ahp.php      # bobot dan CR
php ../analisis/verify_php_moora.php    # MOORA dan triase

# 4. Uji backend: 17 tes, 496 asersi
cd backend && php vendor/bin/phpunit
```

Angka resmi bobot yang berlaku ada di `../analisis/bobot_resmi.json`.
Skrip *(historis)*: `../analisis/historis/fuzzy_ahp.py` (menurunkan matriks dari tier) dan
`../analisis/historis/uji_dampak_bobot.py`.

---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan penelitian akademik di UNY.  
© 2024–2026 Tim SPK Stunting Balita — Universitas Negeri Yogyakarta.
