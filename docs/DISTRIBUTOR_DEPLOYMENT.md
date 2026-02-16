# Distributor Page – Deployment

## 1. Database migration

Jalankan migrasi untuk tabel `Distributor`:

```bash
npx prisma migrate deploy
```

Atau untuk development:

```bash
npx prisma migrate dev
```

## 2. Gambar hero (R2)

Halaman distributor memakai gambar hero dari **R2** saat `NEXT_PUBLIC_R2_PUBLIC_URL` diset.

- **Lokal:** Gambar diambil dari `/images/DSC02998.JPG` (fallback jika R2 belum diset).
- **Production:** Upload file yang sama ke R2:
  - Path di bucket: `static/images/DSC02998.JPG`
  - Sumber file: `public/images/DSC02998.JPG`
- Set env: `NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-public-url`
- Setelah itu, tidak ada referensi lokal ke gambar hero; source final adalah link R2.

## 3. Data awal (opsional)

Setelah migrasi, tambah distributor lewat **Admin → Distributor**:

1. **Bandung:** Youceu, Toko Kang Emas, alamat lengkap, 082297131527, link map.
2. **Tasik:** Bisa ditambah sebagai placeholder (nama/toko/alamat sementara) sampai data lengkap.

## 4. Deploy & pengecekan

```bash
git add .
git commit -m "Add Distributor Page with CMS and R2 hero image"
git push origin main
```

Pastikan:

- Env production punya `DATABASE_URL` dan (untuk hero R2) `NEXT_PUBLIC_R2_PUBLIC_URL`.
- Migrasi sudah dijalankan di production (`prisma migrate deploy`).
- Responsive (mobile/desktop) dan CRUD admin distributor sudah dicoba, tidak ada error.
