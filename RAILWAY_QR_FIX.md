# Railway QR Code Serial Number Fix Guide

## Problem
QR codes di production (Railway) menampilkan "0000" atau tidak ada serial number, padahal di local berfungsi dengan baik.

## Root Cause Analysis

### 1. Canvas Library Dependencies
Library `canvas` memerlukan system dependencies yang harus diinstall di Railway:
- `libcairo2-dev`
- `libpango1.0-dev`
- `libjpeg-dev`
- `libgif-dev`
- `librsvg2-dev`

### 2. Environment Variables
Pastikan semua environment variables berikut sudah di-set di Railway:

#### Required Variables:
```bash
# Database
DATABASE_URL="mysql://..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://cahayasilverking.id"

# Application
NEXT_PUBLIC_APP_URL="https://cahayasilverking.id"
NODE_ENV="production"
RAILWAY_ENVIRONMENT="true"

# R2 Storage (Optional but recommended)
R2_ENDPOINT="https://..."
R2_BUCKET="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_PUBLIC_URL="https://..."
```

## Solution

### Step 1: Verify Railway Configuration

1. **Check nixpacks.toml exists** - File ini sudah dibuat untuk install canvas dependencies
2. **Verify environment variables** di Railway Dashboard:
   - Buka Railway Dashboard → Project → Service → Variables
   - Pastikan semua variables di atas sudah ter-set

### Step 2: Check Railway Logs

Setelah deployment, cek logs untuk:
- Canvas installation errors
- Font rendering errors
- Serial code values dari database

Cari log messages:
- `[QR Download] Environment check:`
- `[addProductInfoToQR] Text rendered character-by-character:`
- `[addSerialNumberToQR] Serial code rendered successfully:`

### Step 3: Test QR Code Generation

1. Buka `/admin/qr-preview`
2. Klik "Download QR Code" pada salah satu product
3. Cek apakah serial number muncul dengan benar

### Step 4: Verify Database Connection

Pastikan Railway bisa connect ke database:
- Check `DATABASE_URL` di Railway variables
- Test dengan query langsung di Railway logs

## Debugging Commands

### Check Railway Logs
```bash
railway logs
```

### Check Environment Variables
```bash
railway variables
```

### Test QR Endpoint Locally
```bash
curl -H "Cookie: next-auth.session-token=..." \
  https://cahayasilverking.id/api/qr/SKC000001/download
```

## Common Issues

### Issue 1: Canvas not installed
**Symptom**: Error "canvas module not found" atau font rendering fails
**Solution**: 
- Pastikan `nixpacks.toml` ada di root directory
- Redeploy aplikasi
- Check Railway logs untuk canvas installation

### Issue 2: Serial code is "0000"
**Symptom**: QR code shows "0000" instead of actual serial
**Solution**:
- Check Railway logs untuk `[QR Download] Using serial code from database:`
- Verify `finalSerialCode` value dari database
- Pastikan character-by-character rendering bekerja

### Issue 3: Font rendering fails
**Symptom**: No text appears below QR code
**Solution**:
- Character-by-character rendering sudah diimplementasi
- Check logs untuk `[addProductInfoToQR] Text rendered character-by-character:`
- Verify canvas library terinstall dengan benar

## Verification Checklist

- [ ] `nixpacks.toml` exists di root directory
- [ ] All environment variables set di Railway
- [ ] Canvas dependencies terinstall (check Railway build logs)
- [ ] Database connection working
- [ ] QR code download endpoint returns correct serial number
- [ ] Character-by-character rendering logs appear in Railway logs

## Next Steps After Fix

1. **Monitor Railway Logs** untuk 24 jam pertama
2. **Test multiple QR codes** dengan serial numbers berbeda
3. **Verify downloaded QR codes** memiliki serial number yang benar
4. **Check cache** - pastikan tidak ada stale QR codes di R2

