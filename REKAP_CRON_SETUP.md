# Auto Export & Purge - Setup Cron Lengkap

Supaya **tiap bulan** log IP/scan di DB hilang otomatis dan jadi rekapan di halaman Rekap, ikuti panduan berikut.

---

## Ringkasan

| Komponen | Deskripsi |
|----------|-----------|
| **Cron API** | `GET /api/cron/export-purge-logs` — export & purge bulan lalu |
| **Auth** | Header `Authorization: Bearer <CRON_SECRET>` |
| **Jadwal** | Tanggal 1 setiap bulan, jam ~02:00 WIB |
| **Hasil** | Log bulan lalu → CSV di R2 → muncul di halaman Rekap → DB kosong untuk bulan itu |

---

## Step 1: Generate CRON_SECRET

```bash
openssl rand -hex 32
```

Simpan hasilnya (misalnya: `a1b2c3d4e5f6...`). Ini akan dipakai di Railway dan GitHub.

---

## Step 2: Tambah CRON_SECRET di Railway

1. Buka Railway Dashboard → Project → Service
2. Variables → New Variable
3. **Name:** `CRON_SECRET`
4. **Value:** (paste hasil generate di atas)
5. Save / Redeploy jika perlu

---

## Step 3: Setup GitHub Actions (Rekomendasi)

### 3a. Tambah Secret di GitHub

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. **Secrets** → **New repository secret**
3. **Name:** `CRON_SECRET`
4. **Value:** (sama dengan di Railway)

### 3b. Variable URL (Opsional)

Jika domain Anda **bukan** `https://cahayasilverking.id`:

1. **Variables** → **New repository variable**
2. **Name:** `REKAP_URL`
3. **Value:** `https://domain-anda.com` (tanpa trailing slash)

### 3c. Workflow Sudah Tersedia

File `.github/workflows/rekap-cron.yml` sudah ada. Cron akan jalan otomatis tanggal 1 setiap bulan.

### 3d. Uji Manual

1. Repo → **Actions** → **Rekap Export Purge (Auto)**
2. **Run workflow** → **Run workflow**
3. Cek log, pastikan HTTP 200

---

## Step 4: Alternatif - cron-job.org

Jika tidak pakai GitHub Actions:

1. Daftar di https://cron-job.org (gratis)
2. **Create Cronjob**
3. **URL:** `https://cahayasilverking.id/api/cron/export-purge-logs`
4. **Request Method:** GET
5. **Request Headers:** `Authorization: Bearer <CRON_SECRET Anda>`
6. **Schedule:** Setiap bulan, tanggal 1, jam 02:00 (sesuaikan timezone)

---

## Verifikasi

### Cek Cron API (Manual)

```bash
curl -X GET "https://cahayasilverking.id/api/cron/export-purge-logs" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

- **200:** Berhasil
- **401:** CRON_SECRET salah atau belum diset

### Setelah Cron Jalan

1. Tanggal 1 (sesuai jadwal), cron memanggil API
2. Log bulan lalu di-export ke CSV
3. CSV di-upload ke R2
4. Raw logs bulan lalu dihapus dari DB
5. File muncul di halaman Rekap (`/admin/rekap`), admin bisa download

---

## Keamanan

- **CRON_SECRET** harus minimal 16 karakter
- Perbandingan secret memakai **timing-safe** untuk mencegah timing attack
- Endpoint hanya menerima request dengan header auth yang benar
- CRON_SECRET jangan dikirim ke repo atau tempat publik

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| 401 Unauthorized | Pastikan CRON_SECRET sama persis di Railway dan GitHub/cron-job |
| 500 Internal Server Error | Cek R2 config, DATABASE_URL, dan log Railway |
| Cron tidak jalan | GitHub Actions: cek apakah workflow enabled; cron-job: cek jadwal |
| File tidak muncul di Rekap | Cek R2_PUBLIC_URL dan prefix `reports/scan-logs/` |
