# ✅ Distributor Feature – Deployment Safety

**Tanggal:** 13 Februari 2025  
**Status:** SAFE FOR DEPLOYMENT

## Ringkasan

Rilis ini menambah fitur **Distributor** (halaman publik + panel admin) dan perbaikan **R2 sync script**.

## Perubahan

- **Database:** Tabel `Distributor` (migration `20250213000000_add_distributor`) – jalankan `prisma migrate deploy` jika belum.
- **API:** `GET /api/distributors` (publik), CRUD admin di `/api/admin/distributors`.
- **Halaman:** `/distributors` (hero + kartu distributor), Navbar link baru.
- **Admin:** `/admin/distributors` – kelola nama, alamat, telepon, peta.
- **R2 sync:** Script `r2:sync` sekarang baca `.env` dan `.env.local`, dan menerima `R2_BUCKET` atau `R2_BUCKET_NAME`.

## Checklist

- [x] Migration sudah ada dan bisa di-deploy
- [x] Seed menambah distributor hanya jika tabel kosong
- [x] API distributor tidak mengubah endpoint lain
- [x] R2 sync hanya mengubah cara baca env, tidak mengubah bucket/upload logic

## Setelah Deploy

1. Jalankan migration: `npx prisma migrate deploy`
2. (Opsional) Seed distributor: `npm run prisma:seed`
3. (Opsional) Upload gambar ke R2: `npm run r2:sync -- --folders=images`
