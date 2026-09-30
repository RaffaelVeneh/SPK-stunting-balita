# SPK Prioritas Intervensi Gizi Balita (Stunting)

Sistem Pendukung Keputusan (SPK) untuk menentukan balita mana yang paling mendesak/urgent menerima intervensi gizi menggunakan metode Multi-Criteria Decision Making (MCDM).

---

## 📌 Fitur & Metodologi Utama

Sistem ini menggunakan skala ordinal 1–5 untuk 7 kriteria biologis, perilaku, lingkungan, dan sosial-ekonomi balita:
- **C1**: Kondisi Gizi & Pertumbuhan (TB/U, BB/U, BB/TB, tren 2 bulan)
- **C2**: Riwayat Kelahiran Berisiko (BBLR, prematur, komplikasi)
- **C3**: Riwayat Penyakit / Infeksi (Diare, ISPA berulang)
- **C4**: Kualitas Pola Pemberian Makan (ASI, MPASI, keragaman)
- **C5**: Sanitasi & Akses Air Bersih
- **C6**: Kerentanan Sosial-Ekonomi
- **C7**: Akses & Pemanfaatan Layanan Kesehatan (Posyandu, kontrol)

### Metode Perhitungan Awal:
1. **SAW (Simple Additive Weighting)**
   - Normalisasi kriteria benefit: $r_{ij} = \frac{x_{ij}}{\max_k(x_{kj})}$
   - Nilai preferensi: $V_i = \sum_{j=1}^n w_j \cdot r_{ij}$
2. **MOORA (Multi-Objective Optimization on the basis of Ratio Analysis)**
   - Normalisasi rasio vektor: $r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^m x_{kj}^2}}$
   - Nilai optimasi: $y_i = \sum_{j \in \text{benefit}} w_j \cdot r_{ij} - \sum_{j \in \text{cost}} w_j \cdot r_{ij}$

---

## 🛠️ Tech Stack & Arsitektur

- **Web Gateway & UI**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Database & ORM**: MySQL 8.4 + Prisma ORM
- **Calculation Engine**: Python FastAPI + NumPy & Pandas
- **Cache & Message Broker**: Redis 7-alpine + BullMQ
- **Containerization**: Docker & Docker Compose

---

## 🚀 Cara Menjalankan

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)

Pastikan Docker Desktop aktif di sistem Anda, lalu jalankan:

```bash
cd app
docker compose up --build
```

Layanan yang akan berjalan:
- **Web UI & API Gateway**: http://localhost:3000
- **FastAPI Calculation Engine**: http://localhost:8000
- **MySQL Database**: `localhost:3307` (database `spk_stunting`)
- **Redis**: `localhost:6380`

### Opsi 2: Menjalankan Secara Lokal (Development)

#### 1. Menjalankan Next.js Web App
```bash
npm install
npm run dev
```
Akses di browser: http://localhost:3000

#### 2. Menjalankan Engine Python (Opsional jika ingin menjalankan kalkulasi via microservice FastAPI)
```bash
cd engine
python -m venv .venv
.\.venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 🧪 Menjalankan Pengujian (Testing)

### Test Engine Python (SAW, MOORA, & FastAPI)
```bash
cd engine
.\.venv\Scripts\pytest -v
```

### Build & Typecheck Next.js
```bash
npm run build
```

---

## 📂 Struktur Direktori Proyek

```text
app/
├── docker-compose.yml          # Orkestrasi Docker (MySQL, Redis, Engine, Web)
├── Dockerfile                  # Dockerfile untuk Next.js
├── .env.example                # Template konfigurasi environment
├── prisma/
│   └── schema.prisma           # Skema database MySQL (8 tabel)
├── src/
│   ├── app/
│   │   ├── api/calculate/      # REST API kalkulasi SPK
│   │   └── page.tsx            # Dashboard interaktif simulasi SAW & MOORA
│   └── lib/
│       └── algorithms/         # Implementasi modular TypeScript (SAW, MOORA)
└── engine/                     # Calculation engine (Python FastAPI)
    ├── Dockerfile
    ├── requirements.txt
    ├── app/
    │   ├── main.py             # FastAPI endpoints
    │   ├── registry.py         # Dynamic method registry
    │   ├── schemas.py          # Pydantic schemas
    │   └── methods/            # Algoritma SAW & MOORA (NumPy)
    └── tests/                  # Unit test pytest
```
