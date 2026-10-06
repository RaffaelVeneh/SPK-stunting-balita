# Deploy di Sub-Direktori (mis. `domainku.com/stunting-balita`)

Panduan ini untuk memasang aplikasi di **sub-jalur domain yang sudah ada**, bukan di
domain atau sub-domain tersendiri.

---

## Kenapa ada perubahan konfigurasi

Aplikasi ini aslinya dirancang untuk berdiri di akar domain. Supaya bisa hidup di
sub-jalur, ada empat hal yang berubah — dan keempatnya harus saling cocok:

| Bagian | Masalahnya kalau salah | Solusinya |
|---|---|---|
| `vite.config.ts` | Aset dirujuk `/assets/...` sehingga 404 di sub-jalur | `base` diambil dari `VITE_BASE_PATH` |
| Alamat API | SPA memanggil `localhost:8000` dari peramban pengguna | `VITE_API_URL` dibuat relatif, mis. `/stunting-balita/api` |
| nginx wadah frontend | Perlu dua port terbuka (halaman + API) | Wadah meneruskan `/api/` ke wadah backend, jadi **satu port saja** |
| Pengikatan port host | MySQL, Redis, dan phpMyAdmin terbuka ke internet | Semua diikat ke `127.0.0.1` |

**Penting:** `VITE_BASE_PATH` dan `VITE_API_URL` ditanamkan Vite **saat build**, bukan
saat container jalan. Jadi mengubah sub-jalur berarti **build ulang image**, bukan
sekadar restart.

---

## Langkah 1 — Cari tahu web server di VPS Anda

Jalankan di VPS:

```bash
# Siapa yang mendengarkan di port 80 dan 443?
sudo ss -tlnp | grep -E ':80|:443'
```

Yang Anda cari di kolom paling kanan (`users:(("nama",...))`):

- `nginx` → lanjut ke **Nginx di host**
- `apache2` / `httpd` → lanjut ke **Apache di host**
- `caddy` → lanjut ke **Caddy di host**
- `docker-proxy` → reverse proxy Anda berjalan sebagai container (Nginx Proxy Manager,
  Traefik, Coolify). Lanjut ke **Reverse proxy berbasis Docker**.

Kalau ragu, perintah ini memastikan:

```bash
nginx -v 2>/dev/null && echo "-> NGINX ada"
apache2 -v 2>/dev/null || httpd -v 2>/dev/null && echo "-> APACHE ada"
caddy version 2>/dev/null && echo "-> CADDY ada"
```

---

## Langkah 2 — Siapkan aplikasi

```bash
cd ~
git clone https://github.com/RaffaelVeneh/SPK-stunting-balita.git
cd SPK-stunting-balita

# Berkas .env dibaca otomatis oleh docker compose
cat > .env <<'EOF'
VITE_BASE_PATH=/stunting-balita/
VITE_API_URL=/stunting-balita/api
VITE_ALLOW_LOCAL_FALLBACK=false
APP_URL=https://domainku.com/stunting-balita
EOF

# Ganti domainku.com dengan domain Anda yang sebenarnya
sed -i 's|domainku.com|DOMAIN_ANDA|' .env
```

> **Ganti `stunting-balita`** di ketiga tempat kalau Anda memakai nama sub-jalur lain.
> Ketiganya **harus** sama.

---

## Langkah 3 — Build dan jalankan

```bash
docker compose up -d --build
```

Backend otomatis menjalankan `migrate --force --seed`, jadi basis data langsung terisi
dan versi bobot yang aktif adalah `v2.0-FuzzyAHP-7Kriteria`.

Periksa:

```bash
docker compose ps
```

Semua port harus tertulis `127.0.0.1:...`, **bukan** `0.0.0.0:...`. Kalau ada yang
`0.0.0.0`, hentikan dan periksa lagi sebelum melanjutkan — itu berarti basis data Anda
terbuka ke internet.

Uji dari dalam VPS:

```bash
curl -s http://127.0.0.1:3000/api/spk/criteria | head -c 200
```

Harus mengembalikan JSON berisi kriteria, bukan halaman galat.

---

## Langkah 4 — Sambungkan ke web server

Inti dari semuanya: **satu location yang meneruskan seluruh sub-jalur ke port 3000.**
Nginx wadah sudah mengurus pembagian antara halaman dan API, jadi host tidak perlu tahu
apa-apa soal backend.

Perhatikan **akhiran garis miring** pada `proxy_pass`. Itulah yang memotong prefiks
`/stunting-balita` sebelum diteruskan, sehingga wadah menerima `/assets/...` dan
`/api/...` seperti seharusnya.

### Nginx di host

Tambahkan di dalam blok `server` untuk domain Anda (biasanya
`/etc/nginx/sites-available/domainku.com` atau `/etc/nginx/conf.d/*.conf`):

```nginx
# Tanpa garis miring di ujung, prefiksnya jadi kosong saat dipotong.
location = /stunting-balita {
    return 301 /stunting-balita/;
}

location /stunting-balita/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_http_version 1.1;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";

    proxy_read_timeout 90s;
    client_max_body_size 12m;
}
```

Lalu:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Apache di host

```apache
RedirectMatch 301 ^/stunting-balita$ /stunting-balita/

ProxyPreserveHost On
ProxyPass        /stunting-balita/ http://127.0.0.1:3000/
ProxyPassReverse /stunting-balita/ http://127.0.0.1:3000/
```

Pastikan modulnya aktif: `sudo a2enmod proxy proxy_http headers && sudo systemctl reload apache2`

### Caddy di host

```caddy
handle_path /stunting-balita/* {
    reverse_proxy 127.0.0.1:3000
}

redir /stunting-balita /stunting-balita/ permanent
```

`handle_path` otomatis memotong prefiks, jadi tidak perlu aturan tambahan.

### Reverse proxy berbasis Docker

Kalau memakai **Nginx Proxy Manager**: buat *Proxy Host* baru, Domain `domainku.com`,
Forward Hostname `host.docker.internal` (atau IP host), Forward Port `3000`, lalu di tab
**Custom Locations** tambahkan lokasi `/stunting-balita` ke host yang sama. Jangan lupa
menyalakan **Websockets Support**.

Kalau memakai **Traefik**, tambahkan label pada service `frontend`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.spk.rule=Host(`domainku.com`) && PathPrefix(`/stunting-balita`)"
  - "traefik.http.services.spk.loadbalancer.server.port=3000"
  - "traefik.http.middlewares.spk-strip.stripprefix.prefixes=/stunting-balita"
  - "traefik.http.routers.spk.middlewares=spk-strip"
```

---

## Langkah 5 — Verifikasi

Dari komputer Anda, buka `https://domainku.com/stunting-balita/`.

Yang harus benar:

1. **Halaman masuk tampil** — bukan halaman 404, dan bukan tampilan tanpa gaya.
   Kalau tampil tanpa gaya, `VITE_BASE_PATH` tidak cocok dengan sub-jalurnya.
2. **Pita tujuh bobot tampil** dengan C1 di **35,07%** — ini membuktikan SPA berhasil
   memanggil API, bukan menghitung sendiri.
3. **Buka Konsol Peramban** (F12). Tidak boleh ada galat merah.
4. **Periksa Permintaan Jaringan**: harus ada permintaan ke
   `/stunting-balita/api/spk/criteria` yang berbalas **200**.

Kalau pita bobot kosong atau tabel tidak terisi, hampir pasti `VITE_API_URL` tidak
cocok. Ingat bahwa di produksi **tidak ada cadangan luring** — kalau API tidak
terjangkau, aplikasi akan menampilkan pesan galat, bukan diam-diam menghitung sendiri.
Itu memang disengaja: lihat catatan di bawah.

---

## Berdampingan dengan aplikasi lain di VPS yang sama

Kalau VPS Anda sudah menjalankan aplikasi lain (misalnya stack `segara` dengan
PHP-FPM, MySQL, Redis, queue worker, dan realtime WebSocket), **port bawaan
stack ini akan bentrok.** Yang bertabrakan:

| Port | Dipakai oleh | Stack ini memakai |
|---|---|---|
| 8000 | `segara-webserver` | `BACKEND_PORT` |
| 3307 | `segara-db` | `MYSQL_PORT` |
| 6380 | `segara-redis` | `REDIS_PORT` |

Akibatnya, `docker compose up` gagal dengan pesan `port is already allocated`.
Docker **tidak** akan mematikan container `segara` yang sudah jalan — jadi
aplikasi lama Anda aman. Tetapi ada skenario yang lebih berbahaya: kalau
`segara` sedang **mati** saat stack ini dinyalakan, stack ini akan merebut
portnya, sehingga `segara` gagal start saat dinyalakan kembali. Itu gangguan
pada layanan yang sedang berjalan.

**Karena itu, pilih port lain di `.env` sebelum deploy pertama:**

```bash
FRONTEND_PORT=3000      # satu-satunya port yang perlu dibuka; arahkan proxy ke sini
BACKEND_PORT=8010
MYSQL_PORT=3317
REDIS_PORT=6390
PMA_PORT=8082
```

Yang **tidak** bentrok dan tidak perlu diubah: nama proyek (`spk-stunting` vs
`segara-admin`), nama container (`spk-stunting-*` vs `segara-*`), jaringan
Docker, dan volume. Semuanya terpisah, jadi kedua stack tidak saling melihat.

### Yang perlu dihindari

- **Jangan** menjalankan `docker compose down` dari direktori yang salah. Kalau
  Anda berada di folder proyek lain, perintah itu akan mematikan proyek itu.
  Selalu `cd` ke folder proyek dulu, atau pakai `-f` dengan jalur lengkap.
- **Jangan** memakai `docker system prune -a`. Perintah itu menghapus image
  yang tidak sedang dipakai, termasuk milik proyek lain, sehingga start
  berikutnya menjadi lambat karena harus menarik ulang. `docker image prune -f`
  (tanpa `-a`) hanya membuang image menggantung dan aman.
- **Selalu** jalankan compose dari dalam folder proyek. Docker Compose membaca
  berkas `.env` dari **direktori kerja saat itu**, bukan dari lokasi berkas
  compose. Kalau dijalankan dari folder induk, variabel dari proyek lain bisa
  terbaca.

### Batas memori

Setiap layanan stack ini sudah diberi `mem_limit` (MySQL 768m, Redis 192m,
backend 512m, frontend 128m, phpMyAdmin 192m — total di bawah 1,8 GB) supaya
tidak bisa menghabiskan RAM sampai mengganggu aplikasi lain. Pastikan VPS Anda
masih punya ruang sebanyak itu sebelum menyalakannya:

```bash
free -h
```

Kalau phpMyAdmin tidak diperlukan di VPS, matikan saja untuk menghemat memori:

```bash
docker compose stop phpmyadmin
```
## Memperbarui aplikasi

```bash
cd ~/SPK-stunting-balita
git pull
docker compose up -d --build          # build ulang frontend karena Vite menanam base
docker image prune -f                  # opsional, buang image lama
```

---

## Kalau ada yang salah

| Gejala | Penyebab yang paling mungkin |
|---|---|
| Halaman tampil tanpa gaya, atau 404 pada `/assets/...` | `VITE_BASE_PATH` tidak sama dengan sub-jalurnya (perhatikan garis miring di akhir) |
| Halaman tampil, tetapi tabel kosong dan ada galat di konsol | `VITE_API_URL` salah, atau `proxy_pass` tidak memakai akhiran `/` |
| Alih-alih halaman, yang muncul 404 dari nginx | Blok `location` belum dimuat — jalankan `sudo nginx -t` lalu `reload` |
| Muncul di `domainku.com` tapi mengganggu situs utama | Location sub-jalur diletakkan **sebelum** `location /` di berkas yang sama |
| Perubahan kode tidak muncul setelah `git pull` | Frontend belum di-build ulang; `VITE_*` hanya berlaku saat build |

---

## Catatan penting soal kejujuran hasil

`VITE_ALLOW_LOCAL_FALLBACK` **harus tetap `false` di produksi.**

Berkas `src/services/api.ts` punya salinan rumus MOORA dan aturan triase yang bisa
dijalankan di peramban. Fitur itu berguna saat mengembangkan tanpa backend, tetapi
berbahaya kalau aktif di produksi: kalau alamat API salah, aplikasi **tidak akan
menampilkan galat apa pun** — ia tetap menampilkan peringkat, padahal angkanya dihitung
di peramban dan bukan oleh server. Untuk sistem pendukung keputusan yang
dipertanggungjawabkan di sidang, hasil yang tampak benar tetapi berasal dari jalur yang
salah lebih berbahaya daripada pesan galat.

Kalau `false`, kegagalan API akan memunculkan pesan galat yang jujur.
