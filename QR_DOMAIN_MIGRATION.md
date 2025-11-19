# QR Domain Migration ke cahayasilverking.id

## 📋 Ringkasan Perubahan

Semua endpoint QR code telah diubah dari Railway URL ke domain production: **https://www.cahayasilverking.id**

## ✅ File yang Telah Diupdate

### 1. Core Utilities
- **`src/utils/constants.ts`**
  - ✅ Ditambahkan function `getBaseUrl()` dengan default `https://www.cahayasilverking.id` untuk production
  - ✅ Ditambahkan function `getVerifyUrl(serialCode)` untuk generate verify URL

### 2. QR Generation
- **`src/lib/qr.ts`**
  - ✅ Menggunakan `getBaseUrl()` untuk semua QR URL generation
  - ✅ Production mode akan menggunakan domain baru

### 3. API Routes
- **`src/app/api/qr/[serialCode]/route.ts`**
  - ✅ Menggunakan `getVerifyUrl()` untuk generate verify URL di QR code
- **`src/app/api/products/create/route.ts`**
  - ✅ Menggunakan `getVerifyUrl()` untuk semua product creation
- **`src/app/api/products/update/[id]/route.ts`**
  - ✅ Menggunakan `getVerifyUrl()` untuk product update

### 4. Seed Script
- **`prisma/seed.ts`**
  - ✅ Menggunakan `getVerifyUrl()` untuk seed data

### 5. Layout
- **`src/app/layout.tsx`**
  - ✅ Menggunakan `getBaseUrl()` untuk metadata base URL

### 6. Configuration Files
- **`env.example`**
  - ✅ Ditambahkan komentar untuk production domain
- **`railway-setup.sh`**
  - ✅ Diupdate untuk menggunakan `https://www.cahayasilverking.id`
- **`RAILWAY_SETUP.md`** (NEW)
  - ✅ Dokumentasi lengkap untuk Railway setup

## 🔧 Cara Kerja

### Production Mode
Ketika aplikasi berjalan di production (Railway), function `getBaseUrl()` akan:
1. Cek `NEXT_PUBLIC_APP_URL` environment variable
2. Jika tidak ada, cek `NEXTAUTH_URL`
3. Jika tidak ada, gunakan default: `https://www.cahayasilverking.id`

### Development Mode
Di development, akan menggunakan:
1. `NEXT_PUBLIC_APP_URL` dari `.env.local`
2. Atau `NEXTAUTH_URL`
3. Atau fallback ke `http://localhost:3000`

## 🚀 Railway Variables yang Perlu Di-Set

```bash
NEXTAUTH_URL="https://www.cahayasilverking.id"
NEXT_PUBLIC_APP_URL="https://www.cahayasilverking.id"
NODE_ENV="production"
RAILWAY_ENVIRONMENT="true"
```

## 📝 Format QR Code URL

Semua QR code sekarang akan mengarah ke:
```
https://www.cahayasilverking.id/verify/[serialCode]
```

Contoh:
- `https://www.cahayasilverking.id/verify/SKT000001`
- `https://www.cahayasilverking.id/verify/SKC000001`

## ✅ Testing Checklist

Setelah deploy, pastikan:

- [ ] QR code yang di-generate mengarah ke domain `.id`
- [ ] Verify endpoint `/verify/[serialCode]` berfungsi
- [ ] QR preview di admin panel menampilkan URL yang benar
- [ ] Product creation menghasilkan QR dengan URL yang benar
- [ ] Product update regenerate QR dengan URL yang benar
- [ ] Environment variables di Railway sudah ter-set dengan benar

## 🔍 Verifikasi

Untuk verifikasi bahwa semua sudah benar:

1. **Check QR Code URL**:
   - Buat product baru di admin panel
   - Download atau preview QR code
   - Scan QR code, harus mengarah ke `https://www.cahayasilverking.id/verify/[serialCode]`

2. **Check API Response**:
   ```bash
   curl https://www.cahayasilverking.id/api/qr/SKT000001
   ```
   Response harus berupa PNG image dengan QR code yang mengarah ke verify URL

3. **Check Verify Endpoint**:
   ```bash
   curl https://www.cahayasilverking.id/api/verify/SKT000001
   ```
   Response harus berupa JSON dengan product data

## 🐛 Troubleshooting

### QR Code masih mengarah ke Railway URL
- Pastikan `NEXT_PUBLIC_APP_URL` di Railway sudah di-set ke `https://www.cahayasilverking.id`
- Redeploy aplikasi setelah mengubah environment variables
- Clear cache browser jika perlu

### QR Code tidak generate
- Check logs di Railway dashboard
- Pastikan `RAILWAY_ENVIRONMENT="true"` sudah di-set
- Pastikan `NODE_ENV="production"` sudah di-set

## 📅 Migration Date
Migration completed: $(date)

