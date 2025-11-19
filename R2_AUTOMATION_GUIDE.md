# 🚀 R2 Automation Guide - Upload Otomatis untuk Development

## ❓ Apakah Harus Manual Upload Setiap Kali?

**TIDAK!** Anda bisa setup automation untuk upload otomatis saat development.

## 🎯 Solusi Automation

### Opsi 1: Menggunakan Wrangler CLI (Recommended)

Wrangler CLI adalah tool resmi dari Cloudflare yang lebih reliable dan tidak ada masalah SSL.

#### Setup Wrangler:

```bash
npm install -g wrangler
wrangler login
```

#### Upload File/Folder:

```bash
# Upload single file
wrangler r2 object put silverking-assets/images/logo.png --file=public/images/logo.png

# Upload folder (menggunakan script)
```

#### Buat Script untuk Upload Folder:

Buat file `scripts/upload-r2-wrangler.sh`:

```bash
#!/bin/bash
# Upload public folder ke R2 menggunakan Wrangler

BUCKET="silverking-assets"
PUBLIC_DIR="public"

# Upload semua file dari public
find "$PUBLIC_DIR" -type f | while read file; do
    # Get relative path
    rel_path="${file#$PUBLIC_DIR/}"
    # Upload ke R2
    wrangler r2 object put "$BUCKET/$rel_path" --file="$file"
    echo "Uploaded: $rel_path"
done
```

### Opsi 2: Fix SSL Issue dan Gunakan Script Sync

Jika ingin tetap menggunakan script sync yang sudah ada, kita perlu fix SSL issue.

#### Solusi: Gunakan WSL (Windows Subsystem for Linux)

1. Install WSL:
   ```powershell
   wsl --install
   ```

2. Di WSL, jalankan:
   ```bash
   cd /mnt/d/PERKULIAHAN/Projek/siverking-by-cai/SilverkingbyCAI
   npm run r2:sync
   ```

### Opsi 3: Setup GitHub Actions (CI/CD)

Untuk automation di production, setup GitHub Actions:

Buat `.github/workflows/sync-r2.yml`:

```yaml
name: Sync to R2

on:
  push:
    branches: [main]
    paths:
      - 'public/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run r2:sync
        env:
          R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}
```

## 📝 Workflow Development yang Disarankan

### Untuk Development Lokal:

1. **Tambahkan file baru di `/public`**
2. **Upload manual via Cloudflare Dashboard** (untuk testing cepat)
   - Atau gunakan Wrangler CLI: `wrangler r2 object put silverking-assets/path/to/file --file=public/path/to/file`

### Untuk Production:

1. **Setup GitHub Actions** untuk auto-sync saat push ke main
2. **Atau gunakan Wrangler CLI** di CI/CD pipeline

## 🔧 Quick Commands

### Upload Single File dengan Wrangler:

```bash
wrangler r2 object put silverking-assets/images/new-logo.png --file=public/images/new-logo.png
```

### Upload Folder dengan Wrangler (PowerShell):

```powershell
# Upload semua file dari folder images
Get-ChildItem -Path "public\images" -Recurse -File | ForEach-Object {
    $relPath = $_.FullName.Replace((Get-Location).Path + "\public\", "")
    $r2Path = "silverking-assets/$relPath".Replace("\", "/")
    wrangler r2 object put $r2Path --file=$_.FullName
    Write-Host "Uploaded: $r2Path"
}
```

## ✅ Rekomendasi

**Untuk Development:**
- Gunakan **Wrangler CLI** untuk upload file baru (lebih reliable, tidak ada masalah SSL)
- Atau upload manual via dashboard untuk testing cepat

**Untuk Production:**
- Setup **GitHub Actions** untuk auto-sync
- Atau gunakan Wrangler CLI di CI/CD

## 📚 Resources

- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [R2 API Documentation](https://developers.cloudflare.com/r2/)

