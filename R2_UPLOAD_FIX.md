# 🔧 Fix Upload ke R2 - Windows SSL Issue

## Masalah

SSL handshake failure masih terjadi meskipun sudah menggunakan `--skip-ssl-verify` flag.

## ✅ Solusi: Set Environment Variable di PowerShell

Karena masalah SSL di Windows, kita perlu set environment variable **sebelum** menjalankan npm command.

### Cara 1: Manual di PowerShell (Recommended)

Buka PowerShell dan jalankan:

```powershell
# Set environment variable
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"

# Jalankan sync
npm run r2:sync

# Setelah selesai, unset (optional)
$env:NODE_TLS_REJECT_UNAUTHORIZED=$null
```

### Cara 2: Gunakan Script PowerShell

Saya sudah membuat script `scripts/sync-r2-ssl-fix.ps1`. Jalankan:

```powershell
.\scripts\sync-r2-ssl-fix.ps1
```

### Cara 3: Set Permanen di .env.local (Tidak Disarankan)

Tambahkan di `.env.local`:

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**⚠️ WARNING:** Ini menonaktifkan SSL verification untuk semua Node.js process. Hanya untuk testing!

## 🎯 Langkah-langkah Upload

1. **Buka PowerShell**
2. **Navigate ke project directory:**
   ```powershell
   cd D:\PERKULIAHAN\Projek\siverking-by-cai\SilverkingbyCAI
   ```
3. **Set environment variable:**
   ```powershell
   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"
   ```
4. **Jalankan sync:**
   ```powershell
   npm run r2:sync
   ```
5. **Verifikasi di Cloudflare Dashboard:**
   - Buka R2 Dashboard
   - Cek bucket `silverking-assets`
   - File seharusnya sudah ter-upload

## 📝 Catatan

- **TIDAK perlu** membuat directory di R2 dashboard
- Folder akan otomatis dibuat berdasarkan path file
- Contoh: `images/logo.png` → folder `images/` otomatis dibuat

## ✅ Setelah Upload Berhasil

Setelah file ter-upload, Anda bisa:
1. Akses file via public URL: `https://pub-bc00595c61914727b9f968a7f9571d27.r2.dev/images/logo.png`
2. Gunakan di code dengan URL tersebut
3. Unset environment variable: `$env:NODE_TLS_REJECT_UNAUTHORIZED=$null`

