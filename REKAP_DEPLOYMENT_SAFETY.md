# Rekap Feature - Deployment Safety

**Tanggal:** Januari 2025  
**Status:** ✅ SAFE FOR DEPLOYMENT

## Ringkasan

Fitur Rekap bulanan untuk scan logs telah diimplementasikan dengan aman. Dokumen ini menjelaskan langkah deployment dan jaminan keamanan.

---

## Yang Tidak Berubah (Zero Impact)

- ✅ **API Verify** (`/api/verify`, `/api/verify-gram`) — tidak disentuh
- ✅ **API QR** (`/api/qr`, `/api/qr-gram`) — tidak disentuh
- ✅ **QrRecord.scanCount**, **GramProductItem.scanCount** — tidak disentuh
- ✅ **Product, User, Batch** — tidak disentuh
- ✅ **Logika verifikasi QR** — tidak berubah

---

## Perubahan yang Ditambahkan

### 1. Database
- **Tabel baru:** `ScanLogSummary` (date, page1Scans, page2Scans, totalScans)
- **Migration:** `20260115000000_add_scan_log_summary`

### 2. API Baru
- `POST /api/admin/export-and-purge-logs` — Export + Purge bulan lalu
- `GET /api/admin/rekap/list` — Daftar laporan dari R2
- `GET /api/admin/rekap/download?file=YYYY-MM.csv` — URL unduh laporan

### 3. Perubahan API
- `GET /api/admin/scans/trend` — Untuk bulan lalu, baca dari `ScanLogSummary`; bulan berjalan tetap dari raw logs

### 4. Halaman Baru
- `/admin/rekap` — Daftar laporan + tombol Export & Purge

### 5. Filter Bulan di Halaman Log (Update)
- `/admin/logs` — Filter pemilihan bulan (Nov 2025 s/d bulan berjalan + 12 bulan)
- Cross-check apakah log masih ada per bulan sebelum/ setelah purge

### 6. Script Utilitas
- `scripts/check-logs-by-month.js` — Cek jumlah scan logs per bulan (Nov, Des, Jan) via CLI

---

## Pre-Deployment Checklist

1. **Jalankan migration di Railway:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Pastikan env vars R2 tersedia:**
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET` atau `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`

3. **CRON_SECRET** — tambah di Railway (untuk cron auto, lihat REKAP_CRON_SETUP.md)

4. **Backup database** sebelum pertama kali Export & Purge (opsional)

5. **Setup cron** — baca REKAP_CRON_SETUP.md agar log IP hilang otomatis tiap bulan

---

## Keamanan

- Semua endpoint Rekap dilindungi **admin auth**.
- Cron endpoint dilindungi **CRON_SECRET** (timing-safe comparison).
- Purge hanya dijalankan **setelah** upload CSV ke R2 berhasil.
- Tidak ada perubahan pada API publik atau alur verifikasi QR.
