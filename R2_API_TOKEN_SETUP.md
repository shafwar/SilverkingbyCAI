# 🔑 Cloudflare R2 API Token Setup Guide

## Masalah: Access Denied

Jika Anda mendapat error "Access Denied", kemungkinan besar API token tidak memiliki permission yang cukup.

## ✅ Solusi: Buat API Token Baru dengan Permission yang Benar

### Langkah 1: Buka Cloudflare Dashboard

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Pilih account Anda
3. Buka **R2** dari sidebar kiri

### Langkah 2: Buat API Token

1. Di halaman R2, klik **Manage R2 API Tokens** (di bagian atas)
2. Klik **Create API Token**
3. Isi form dengan:

   **Token Name:**
   ```
   silverking-assets-token
   ```

   **Permissions:**
   - Pilih **Admin Read & Write** (untuk akses penuh)
   - ATAU pilih **Object Read & Write** (untuk akses terbatas ke object saja)

   **Bucket Access:**
   - Pilih **One bucket** → Pilih bucket `silverking-assets`
   - ATAU pilih **All buckets** (jika ingin akses ke semua bucket)

4. Klik **Create API Token**

### Langkah 3: Salin Credentials

**PENTING:** Credentials hanya muncul sekali! Salin sekarang:

1. **Access Key ID** - Salin ke `R2_ACCESS_KEY_ID` di `.env.local`
2. **Secret Access Key** - Salin ke `R2_SECRET_ACCESS_KEY` di `.env.local`

### Langkah 4: Update .env.local

Update file `.env.local` dengan credentials baru:

```env
R2_ACCOUNT_ID=bfa93ec5dc81d8265a89844539388b2a
R2_ACCESS_KEY_ID=<paste_access_key_id_di_sini>
R2_SECRET_ACCESS_KEY=<paste_secret_access_key_di_sini>
R2_BUCKET_NAME=silverking-assets
R2_PUBLIC_URL=https://assets.cahayasilverking.id
```

### Langkah 5: Verifikasi

Jalankan:

```bash
npm run r2:verify
```

Jika berhasil, Anda akan melihat:
```
✅ Bucket access successful!
✅ Bucket "silverking-assets" is accessible
```

## 🔍 Troubleshooting

### Masih "Access Denied"?

1. **Pastikan bucket sudah dibuat:**
   - Di R2 Dashboard, pastikan bucket `silverking-assets` sudah ada
   - Jika belum, buat bucket dengan nama yang sama

2. **Cek permission API token:**
   - Pastikan memilih **Admin Read & Write** atau **Object Read & Write**
   - Pastikan bucket access memilih bucket yang benar

3. **Cek Account ID:**
   - Account ID ada di sidebar kanan Cloudflare Dashboard
   - Atau di URL: `https://dash.cloudflare.com/[ACCOUNT_ID]/r2`
   - Pastikan `R2_ACCOUNT_ID` di `.env.local` sama dengan Account ID Anda

4. **Coba buat token baru:**
   - Hapus token lama
   - Buat token baru dengan permission **Admin Read & Write**
   - Update `.env.local` dengan credentials baru

## 📝 Permission yang Disarankan

Untuk development dan production, gunakan:

- **Permission:** Admin Read & Write
- **Bucket Access:** One bucket → `silverking-assets`

Ini memberikan akses penuh untuk:
- ✅ Upload files
- ✅ Delete files
- ✅ List objects
- ✅ Read objects

## ⚠️ Security Best Practices

1. **Jangan commit `.env.local` ke Git**
2. **Gunakan token dengan permission minimal yang diperlukan**
3. **Rotate token secara berkala**
4. **Jangan share credentials**

## 🎯 Quick Checklist

- [ ] Bucket `silverking-assets` sudah dibuat di R2 Dashboard
- [ ] API Token sudah dibuat dengan permission **Admin Read & Write**
- [ ] `R2_ACCOUNT_ID` sudah benar (dari Cloudflare Dashboard)
- [ ] `R2_ACCESS_KEY_ID` sudah diisi (dari API Token)
- [ ] `R2_SECRET_ACCESS_KEY` sudah diisi (dari API Token)
- [ ] `R2_BUCKET_NAME` sama dengan nama bucket di dashboard
- [ ] Jalankan `npm run r2:verify` dan berhasil

