# ✅ Distributor Feature – Deployment Safety

**Tanggal:** 13 Februari 2025  
**Status:** SAFE FOR DEPLOYMENT

## Ringkasan

Rilis ini menambah fitur **Distributor** (halaman publik + panel admin), perbaikan **hero image**, tampilan data, dan konsistensi UI admin dengan CMS Products.

## Perubahan

- **Database:** Tabel `Distributor` (migration `20250213000000_add_distributor`) – jalankan `prisma migrate deploy` jika belum.
- **API:** `GET /api/distributors` (publik), CRUD admin di `/api/admin/distributors`.
- **Halaman publik `/distributors`:**
  - **Hero:** Gambar Silver King (DSC02998.JPG) dengan fallback: jika R2 gagal load, otomatis pakai gambar dari same-origin (`/images/DSC02998.JPG`).
  - **Data:** Fetch dari `window.location.origin + '/api/distributors'` agar data distributor tampil dengan benar di production.
  - **Kartu:** Gaya konsisten dengan halaman Contact/About (border, shadow, hover).
- **Admin `/admin/distributors`:**
  - Layout konsisten dengan CMS Products: StatsHeader (eyebrow, title, description) + actions bar (Add) + section berisi kartu distributor dalam container rounded.
  - Field data bisa ditambah/edit/hapus via modal (nama, toko, alamat, telepon, map URL, kota, urutan).
- **Seed:** Youceu (Bandung – Toko Kang Emas, Jl Ahmad Yani No 161, 082297131527, map) + Tasik (Tasikmalaya placeholder). Jalankan `npm run prisma:seed` jika belum ada data.
- **R2 sync:** Script `r2:sync` baca `.env` dan `.env.local`, menerima `R2_BUCKET` atau `R2_BUCKET_NAME`.

## Checklist

- [x] Migration sudah ada dan bisa di-deploy
- [x] Seed menambah 2 distributor (Youceu + Tasik) hanya jika tabel kosong
- [x] Hero image punya fallback same-origin
- [x] API fetch pakai origin untuk production
- [x] Admin UI selaras dengan CMS Products

## Setelah Deploy

1. Jalankan migration: `npx prisma migrate deploy`
2. Seed distributor (jika belum): `npm run prisma:seed`
3. (Opsional) Upload gambar ke R2: `npm run r2:sync -- --folders=images`
