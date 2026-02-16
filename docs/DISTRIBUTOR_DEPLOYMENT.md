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

Halaman distributor memakai gambar hero **DSC02998.JPG** (Silver King). URL diambil dengan prioritas:

1. **`NEXT_PUBLIC_DISTRIBUTOR_HERO_IMAGE_URL`** (disarankan) – URL penuh ke gambar di R2, contoh:  
   `https://your-bucket.r2.dev/static/images/DSC02998.JPG`
2. **`NEXT_PUBLIC_R2_PUBLIC_URL`** – Base URL R2; path otomatis: `{base}/static/images/DSC02998.JPG`
3. **Lokal** – `/images/DSC02998.JPG` (jika R2 tidak diset)

**Production (hero dari R2):**

- Upload `public/images/DSC02998.JPG` ke R2 path: `static/images/DSC02998.JPG`
- Set salah satu env:
  - **Opsi A:** `NEXT_PUBLIC_DISTRIBUTOR_HERO_IMAGE_URL=https://your-r2-url/static/images/DSC02998.JPG`
  - **Opsi B:** `NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-url`
- Source final hero = link R2 (tidak pakai path lokal).

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
