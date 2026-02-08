# Analytics Centralized - Sistem Export & Purge Bulanan

**Tanggal:** Februari 2026  
**Status:** Implementasi selesai

## Ringkasan

Halaman **Rekap** dihapus. Seluruh sistem export, graph, dan purge bulanan dipusatkan di **Analytics** → **Signal control - Scans over time**.

---

## Perubahan

### 1. Halaman Rekap Dihapus
- `/admin/rekap` — dihapus
- Link Rekap di nav — dihapus

### 2. Analytics = Single Source of Truth
- **Signal control - Scans over time** = wadah utama untuk:
  - Graph bulanan (Nov 2025 s/d masa depan)
  - Export CSV (bulan yang dipilih)
  - Purge bulan lalu (tombol manual)

### 3. Perbaikan Nov-Dec 2025
- **scans/trend**: Jika ScanLogSummary kosong (Nov-Dec belum pernah purge), fallback ke raw logs + backfill ScanLogSummary
- Graph Nov-Dec 2025 sekarang tampil data dari raw logs

### 4. Export CSV di Analytics
- Tombol Export CSV memakai **bulan yang dipilih** di picker
- Jika raw logs ada → generate CSV, download langsung
- Jika sudah purge (R2 punya file) → redirect ke signed URL

### 5. Purge Bulan Terpilih di Analytics
- Tombol "Purge bulan terpilih" di Signal control
- Admin memilih bulan di picker (Nov 2025, Des 2025, Jan 2026, dll)
- Purge hanya aktif untuk bulan lalu (tidak bulan berjalan)—untuk catch-up Nov/Des 2025
- ScanLogSummary tetap terisi (untuk graph)
- Raw logs dihapus, CSV disimpan di R2 (tidak ditimpa jika kosong)

### 6. Cron Tetap Berjalan
- Tanggal 1 setiap bulan: cron memanggil `/api/cron/export-purge-logs`
- Log bulan lalu di-export, di-upload ke R2, dihapus dari DB
- Graph tetap pakai ScanLogSummary

---

## Alur Sistem

```
Logs (bulan berjalan) → raw logs di DB
     │
     ▼ Tanggal 1 (cron atau manual Purge)
ScanLogSummary diisi + CSV ke R2 + raw logs dihapus
     │
     ▼
Analytics Signal control:
  - Graph: baca ScanLogSummary (historical) atau raw logs (current)
  - Export: raw logs (jika ada) atau signed URL R2 (jika purge)
  - Purge: tombol manual untuk bulan terpilih (Nov/Des 2025 catch-up)
```

---

## Endpoint Baru
- `GET /api/admin/scans/export?month=&year=` — Export scan logs bulan terpilih

## Endpoint yang Tetap
- `GET /api/admin/scans/trend?month=&year=` — Data graph (dengan fallback + backfill)
- `POST /api/admin/export-and-purge-logs` — Export & purge (manual/cron)
- `GET /api/cron/export-purge-logs` — Cron auto
