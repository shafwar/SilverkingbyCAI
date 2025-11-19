# 📝 Panduan .env.local untuk Cloudflare R2

## ✅ Format yang Benar

File `.env.local` Anda seharusnya berisi:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=bfa93ec5dc81d8265a89844539388b2a
R2_ACCESS_KEY_ID=5824420d9b9f5a7d42974000a64a731e
R2_SECRET_ACCESS_KEY=38893da6a29ff59cef1fcff756472833e37001a51a304b16e6393e4497647c5f
R2_BUCKET_NAME=silverking-assets
R2_PUBLIC_URL=https://pub-bc00595c61914727b9f968a7f9571d27.r2.dev
```

## 📋 Penjelasan Setiap Variable

### 1. `R2_ACCOUNT_ID`

- **Apa itu:** Account ID dari Cloudflare Dashboard
- **Format:** 32 karakter hex (contoh: `bfa93ec5dc81d8265a89844539388b2a`)
- **Cara dapatkan:**
  - Buka Cloudflare Dashboard
  - Account ID ada di sidebar kanan
  - Atau di URL: `https://dash.cloudflare.com/[ACCOUNT_ID]/r2`

### 2. `R2_ACCESS_KEY_ID`

- **Apa itu:** Access Key ID dari R2 API Token
- **Format:** 32 karakter hex
- **Cara dapatkan:**
  - Cloudflare Dashboard → R2 → Manage R2 API Tokens
  - Create API Token → Copy Access Key ID

### 3. `R2_SECRET_ACCESS_KEY`

- **Apa itu:** Secret Access Key dari R2 API Token
- **Format:** 64 karakter hex
- **Cara dapatkan:**
  - Cloudflare Dashboard → R2 → Manage R2 API Tokens
  - Create API Token → Copy Secret Access Key
  - ⚠️ **Hanya muncul sekali!** Simpan dengan aman

### 4. `R2_BUCKET_NAME`

- **Apa itu:** Nama bucket di R2
- **Format:** String (contoh: `silverking-assets`)
- **Cara dapatkan:**
  - Cloudflare Dashboard → R2
  - Nama bucket yang sudah dibuat
  - Harus sama persis dengan nama di dashboard

### 5. `R2_PUBLIC_URL`

- **Apa itu:** URL publik untuk mengakses file
- **Opsi 1 - R2.dev Subdomain (Gratis):**

  ```
  R2_PUBLIC_URL=https://pub-bc00595c61914727b9f968a7f9571d27.r2.dev
  ```

  - Otomatis dari Cloudflare
  - Format: `https://pub-{random}.r2.dev`
  - Dapatkan di: R2 Dashboard → Bucket → Settings → Public Access

- **Opsi 2 - Custom Domain (Jika sudah setup):**
  ```
  R2_PUBLIC_URL=https://assets.cahayasilverking.id
  ```

  - Perlu setup DNS di Cloudflare
  - Lebih profesional
  - Perlu domain sendiri

## ✅ Checklist

Pastikan:

- [ ] Tidak ada spasi di awal/akhir value
- [ ] Tidak ada tanda kutip (kecuali value memang perlu)
- [ ] `R2_ACCOUNT_ID` adalah Account ID yang benar
- [ ] `R2_ACCESS_KEY_ID` dan `R2_SECRET_ACCESS_KEY` dari API token yang sama
- [ ] `R2_BUCKET_NAME` sama persis dengan nama bucket di dashboard
- [ ] `R2_PUBLIC_URL` sudah di-set (R2.dev atau custom domain)

## 🔍 Verifikasi

Jalankan untuk memverifikasi:

```bash
npm run r2:verify
```

Jika berhasil, akan muncul:

```
✅ Bucket access successful!
✅ Bucket "silverking-assets" is accessible
```

## ⚠️ Masalah Umum

### 1. "Access Denied"

- **Penyebab:** API token tidak memiliki permission yang cukup
- **Solusi:** Buat API token baru dengan permission "Admin Read & Write"

### 2. "Bucket not found"

- **Penyebab:** Nama bucket tidak sama
- **Solusi:** Pastikan `R2_BUCKET_NAME` sama persis dengan nama di dashboard

### 3. "SSL handshake failure"

- **Penyebab:** Masalah SSL di Windows
- **Solusi:** Gunakan `npm run r2:sync:skip-ssl` untuk testing

## 📝 Contoh Lengkap

```env
# Database (jika ada)
DATABASE_URL="mysql://user:password@localhost:3306/silverking"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Cloudflare R2
R2_ACCOUNT_ID=bfa93ec5dc81d8265a89844539388b2a
R2_ACCESS_KEY_ID=5824420d9b9f5a7d42974000a64a731e
R2_SECRET_ACCESS_KEY=38893da6a29ff59cef1fcff756472833e37001a51a304b16e6393e4497647c5f
R2_BUCKET_NAME=silverking-assets
R2_PUBLIC_URL=https://pub-bc00595c61914727b9f968a7f9571d27.r2.dev

# Optional: Next.js Public Variables
NEXT_PUBLIC_R2_URL=https://pub-bc00595c61914727b9f968a7f9571d27.r2.dev
NEXT_PUBLIC_USE_R2=true
```

## 🔒 Security

- ✅ **Jangan commit `.env.local` ke Git**
- ✅ **Jangan share credentials**
- ✅ **Rotate API token secara berkala**
- ✅ **Gunakan permission minimal yang diperlukan**
