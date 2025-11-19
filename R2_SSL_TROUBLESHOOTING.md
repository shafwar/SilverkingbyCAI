# 🔧 Troubleshooting SSL Handshake Failure di Windows

## Masalah

Error: `SSL routines:ssl3_read_bytes:sslv3 alert handshake failure`

Ini adalah masalah umum di Windows dengan Node.js versi lama atau OpenSSL yang tidak kompatibel.

## ✅ Solusi

### Solusi 1: Update Node.js (Recommended)

1. **Cek versi Node.js saat ini:**
   ```bash
   node --version
   ```

2. **Update ke Node.js LTS terbaru:**
   - Download dari [nodejs.org](https://nodejs.org/)
   - Install versi LTS terbaru (minimal v18.x atau v20.x)
   - Restart terminal
   - Jalankan lagi: `npm run r2:sync`

### Solusi 2: Set Environment Variable (Temporary Fix)

**⚠️ WARNING: Ini menonaktifkan SSL verification. Hanya untuk testing!**

Di PowerShell, jalankan sebelum sync:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
npm run r2:sync
```

Atau buat file `.env.local` dan tambahkan (tidak disarankan untuk production):

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Catatan:** Setelah testing, hapus environment variable ini!

### Solusi 3: Gunakan WSL (Windows Subsystem for Linux)

Jika Anda menggunakan Windows, coba jalankan di WSL:

```bash
# Di WSL terminal
cd /mnt/d/PERKULIAHAN/Projek/siverking-by-cai/SilverkingbyCAI
npm run r2:sync
```

### Solusi 4: Upload File Kecil Dulu (Testing)

Coba upload file kecil dulu untuk memastikan konfigurasi benar:

```bash
# Upload hanya folder images (file kecil)
npm run r2:sync -- --folders images
```

Jika berhasil, masalahnya mungkin di file besar (video). Kita bisa implement chunk upload untuk file besar.

### Solusi 5: Gunakan Cloudflare Wrangler CLI

Alternatif: gunakan Wrangler CLI untuk upload:

```bash
npm install -g wrangler
wrangler r2 object put silverking-assets/images/logo.png --file=public/images/logo.png
```

## 🔍 Diagnosa

### Cek Versi Node.js dan OpenSSL

```bash
node --version
node -p "process.versions"
```

### Test Koneksi SSL

```bash
# Test koneksi ke R2 endpoint
openssl s_client -connect bfa93ec5dc81d8265a89844539388b2a.r2.cloudflarestorage.com:443
```

## 📝 Checklist

- [ ] Node.js versi >= 18.x
- [ ] OpenSSL terbaru
- [ ] Tidak ada proxy/firewall yang memblokir
- [ ] Credentials R2 sudah benar
- [ ] Bucket sudah dibuat di Cloudflare Dashboard

## 🎯 Quick Fix (Temporary)

Jika perlu fix cepat untuk testing:

1. **Buka PowerShell sebagai Administrator**
2. **Jalankan:**
   ```powershell
   $env:NODE_TLS_REJECT_UNAUTHORIZED=0
   npm run r2:sync
   ```
3. **Setelah selesai, unset:**
   ```powershell
   $env:NODE_TLS_REJECT_UNAUTHORIZED=$null
   ```

**⚠️ Jangan gunakan ini di production!**

## 💡 Rekomendasi

Solusi terbaik adalah **update Node.js ke versi terbaru** (v20.x LTS). Ini akan menyelesaikan masalah SSL compatibility dengan OpenSSL terbaru.

