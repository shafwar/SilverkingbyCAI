# Rekap Feature - Deployment Safety

**Tanggal:** Januari 2026  
**Status:** ✅ SAFE FOR DEPLOYMENT

## Ringkasan

Fitur Rekap bulanan untuk scan logs telah diimplementasikan dengan aman. **Purge bulan terpilih** memungkinkan admin memilih bulan (Nov 2025, Des 2025, Jan 2026, dll) untuk purge manual—berguna karena sistem belum otomatis dan bulan historis bisa catch-up via Analytics.

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
- `POST /api/admin/export-and-purge-logs` — Export + Purge bulan terpilih (body: `{ month, year }`)
- `GET /api/admin/scans/export?month=&year=` — Export CSV bulan terpilih
- ~~`GET /api/admin/rekap/list`~~ — Dihapus (centralized ke Analytics)
- ~~`GET /api/admin/rekap/download`~~ — Dihapus (export via scans/export)

### 3. Perubahan API
- `GET /api/admin/scans/trend` — Fallback ke raw logs jika ScanLogSummary kosong (Nov–Des 2025) + backfill

### 4. Purge Bulan Terpilih (penting)
- **Admin bisa memilih bulan** untuk Purge di Analytics → Signal control (Month picker)
- Tombol Purge hanya aktif untuk **bulan lalu** (tidak untuk bulan berjalan atau masa depan)
- Cocok untuk Nov 2025, Des 2025, Jan 2026, dll yang sudah lewat tapi belum di-purge otomatis
- Cron tetap purge bulan lalu tiap tanggal 1; manual Purge untuk catch-up bulan historis

### 5. Halaman
- ~~`/admin/rekap`~~ — Dihapus; semua di **Analytics → Signal control - Scans over time**
- Graph, Export CSV, Purge bulan terpilih — semuanya di satu tempat

### 6. Filter Bulan di Halaman Log (Update)
- `/admin/logs` — Filter pemilihan bulan (Nov 2025 s/d bulan berjalan + 12 bulan)
- Cross-check apakah log masih ada per bulan sebelum/ setelah purge

### 7. Script Utilitas
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

## Purge Bulan Terpilih (Nov/Des 2025 Catch-up)

- Admin masuk ke **Analytics** → **Signal control - Scans over time**
- Pilih bulan di Month picker (mis. Nov 2025, Des 2025, Jan 2026)
- Tombol **Purge bulan terpilih** aktif hanya untuk bulan lalu (tidak untuk bulan berjalan)
- Untuk Nov/Des 2025 yang sudah lewat: pilih bulan → Export CSV (opsional) → Purge
- Data graph tetap aman via ScanLogSummary; raw logs dihapus setelah export ke R2

## Keamanan

- Semua endpoint Rekap dilindungi **admin auth**.
- Cron endpoint dilindungi **CRON_SECRET** (timing-safe comparison).
- Purge hanya dijalankan **setelah** upload CSV ke R2 berhasil.
- Tidak ada perubahan pada API publik atau alur verifikasi QR.
