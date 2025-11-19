# Cloudflare R2 Setup Guide

## 📋 Prerequisites

Sebelum menjalankan sync, pastikan Anda sudah:

### 1. Membuat R2 Bucket di Cloudflare Dashboard

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Pilih account Anda
3. Buka **R2** dari sidebar
4. Klik **Create bucket**
5. Masukkan nama bucket: `silverking-assets`
6. Pilih location (opsional, bisa default)
7. Klik **Create bucket**

### 2. Membuat API Token

1. Di halaman R2, klik **Manage R2 API Tokens**
2. Klik **Create API Token**
3. Pilih permissions: **Object Read & Write** atau **Admin Read & Write**
4. Pilih bucket: `silverking-assets` (atau semua buckets)
5. Klik **Create API Token**
6. **SALIN** Access Key ID dan Secret Access Key (hanya muncul sekali!)

### 3. Setup Public Access (Opsional)

Jika ingin file bisa diakses publik:

1. Di halaman bucket, klik **Settings**
2. Scroll ke **Public Access**
3. Pilih salah satu:
   - **R2.dev subdomain** (gratis, format: `https://pub-xxxxx.r2.dev`)
   - **Custom Domain** (perlu setup di Cloudflare DNS)

### 4. Update .env.local

Pastikan `.env.local` sudah diisi dengan benar:

```env
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=silverking-assets
R2_PUBLIC_URL=https://assets.cahayasilverking.id
```

**Cara mendapatkan Account ID:**

- Di Cloudflare Dashboard, pilih account Anda
- Account ID ada di sidebar kanan (atau di URL)

## ✅ Verifikasi Setup

Setelah setup, jalankan:

```bash
npm run r2:sync
```

Jika berhasil, Anda akan melihat:

- ✅ Validasi environment variables passed
- ✅ File mulai di-upload
- ✅ Summary dengan jumlah file yang di-upload

## ❌ Troubleshooting

### Error: "Missing required environment variables"

- Pastikan `.env.local` ada di root project
- Pastikan semua variabel sudah diisi dengan benar
- Jangan ada spasi di awal/akhir value

### Error: "Access Denied" atau "Bucket not found"

- Pastikan bucket name di `.env.local` sama dengan nama bucket di dashboard
- Pastikan API token memiliki permission yang benar
- Pastikan Account ID benar

### Error: "Failed to upload file"

- Cek koneksi internet
- Cek apakah bucket sudah dibuat
- Cek apakah API token masih valid

### Semua file failed

- Pastikan bucket sudah dibuat di Cloudflare Dashboard
- Pastikan credentials benar
- Coba jalankan dengan `npm run r2:sync:force` untuk melihat error detail

## 📝 Catatan Penting

- **Tidak perlu membuat directory/folder di R2** - R2 adalah object storage, "directory" hanya prefix dalam object key
- Contoh: File `public/images/logo.png` akan menjadi object dengan key `images/logo.png` di R2
- Public URL akan otomatis menggunakan `R2_PUBLIC_URL` dari env
- Jika `R2_PUBLIC_URL` tidak di-set, akan fallback ke R2.dev subdomain

## 🔗 Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
