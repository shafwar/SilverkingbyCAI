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

## 2. Gambar hero (R2) – konsisten dengan halaman lain

Hero distributor memakai **`getR2UrlClient("/images/DSC02998.JPG")`** seperti aset lain (logo, video, gambar What We Do). Artinya:

- Jika **`NEXT_PUBLIC_R2_PUBLIC_URL`** diset → URL hero = `{R2_PUBLIC_URL}/static/images/DSC02998.JPG` (link R2).
- Jika tidak diset → dipakai path lokal `/images/DSC02998.JPG`.  
- Untuk URL eksternal (R2), gambar di-load **unoptimized** agar request langsung ke R2 tanpa lewat `_next/image`.

**Production (hero dari R2):**

1. **Pastikan gambar ada di R2** (path key: **`static/images/DSC02998.JPG`**):
   - **Cara 1 – skrip khusus:**  
     `npm run r2:ensure-hero`  
     (akan cek R2; kalau belum ada, upload dari `public/images/DSC02998.JPG`).
   - **Cara 2 – sync penuh:**  
     `npm run r2:sync`  
     (sync semua `public/` ke R2 dengan prefix `static/`).
2. Set env: **`NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-public-url`** (tanpa trailing slash).
3. Hero akan memakai link R2; fallback ke `hero-fallback.jpg` hanya jika gambar gagal load.

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
