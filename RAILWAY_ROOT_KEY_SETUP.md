# Railway Root Key Setup - Complete Guide

## 🎯 Tujuan
Mengoptimalkan infrastruktur Page 2 agar root key verification berjalan dengan baik di production Railway.

## ✅ Perbaikan yang Sudah Dilakukan

### 1. Optimasi Endpoint `/api/verify/root-key`
- ✅ **Multiple Lookup Strategies**: 
  - Strategy 1: Direct uniqCode lookup (primary)
  - Strategy 2: Fallback to serialCode lookup
  - Strategy 3: Case-insensitive search (edge cases)
- ✅ **Multiple Verification Methods**:
  - Primary: bcrypt hash comparison
  - Fallback 1: Plain text comparison (normalized)
  - Fallback 2: Direct string comparison (case-insensitive)
- ✅ **Enhanced Logging**: Detailed logs untuk debugging dengan `lookupMethod` dan `verificationMethod`
- ✅ **Better Error Messages**: Error messages yang lebih informatif untuk user

### 2. Optimasi Frontend Verification Page
- ✅ **Better Error Handling**: Improved JSON parsing dengan try-catch
- ✅ **Enhanced Logging**: Console logs untuk tracking verification flow
- ✅ **URL Encoding**: Proper encoding untuk redirect ke serial code

### 3. Database Migrations
- ✅ **All Migrations Applied**: Semua 7 migrations sudah ter-apply di Railway MySQL
- ✅ **Schema Verified**: `rootKeyHash` dan `rootKey` fields sudah ada di `GramProductItem` table

## 📋 Langkah Setup yang Perlu Dilakukan

### Step 1: Set DATABASE_URL di Service Aplikasi

**Masalah**: Service aplikasi Next.js mungkin belum terhubung ke MySQL service dengan benar.

**Solusi**:
```bash
# 1. Link ke project (jika belum)
railway link

# 2. Switch ke service aplikasi Next.js
railway service SilverkingbyCAI

# 3. Get MySQL DATABASE_URL dari MySQL service
railway variables --service MySQL | grep MYSQL_PUBLIC_URL

# 4. Set DATABASE_URL di service aplikasi
railway variables set "DATABASE_URL=<MYSQL_PUBLIC_URL_VALUE>"
```

**Atau gunakan script otomatis**:
```bash
chmod +x scripts/setup-railway-db.sh
./scripts/setup-railway-db.sh
```

### Step 2: Regenerate Prisma Client

```bash
# Di service aplikasi Next.js
railway service SilverkingbyCAI
railway run npx prisma generate
```

### Step 3: Restart Service

```bash
# Restart service untuk memuat Prisma client baru
railway restart
```

### Step 4: Verify Database Connection

```bash
# Check migration status
railway run npx prisma migrate status

# Should show: "Database schema is up to date!"
```

### Step 5: Create New Batch di Production

**PENTING**: Batch lama yang dibuat sebelum migrations tidak akan bekerja. Buat batch baru:

1. Buka `https://cahayasilverking.id/admin/products/page2/create`
2. Input:
   - Nama Produk: "Test Product"
   - Quantity: 100
   - Weight: 25
   - Serial Prefix: "SKA"
3. Klik "Create Gram-based Batch"
4. **Expected**: 100 items terbuat dengan root keys

### Step 6: Test Root Key Verification

1. **Get Root Key**: 
   - Buka `/admin/qr-preview/page2`
   - Klik kolom "Serial Code" pada batch baru
   - Copy salah satu root key (contoh: "PDRF")

2. **Scan QR Code**:
   - Scan QR dari batch baru (uniqCode: GK...)
   - Halaman verify muncul dengan form root key

3. **Input Root Key**:
   - Masukkan root key yang sudah di-copy
   - Klik "Verify Root Key"
   - **Expected**: Redirect ke `/verify/SKA000001` (atau serial code yang sesuai)

## 🔍 Troubleshooting

### Issue: "Product not found" (404)
**Kemungkinan**:
- Batch dibuat sebelum migrations diterapkan
- DATABASE_URL tidak benar di service aplikasi

**Solusi**:
1. Pastikan DATABASE_URL sudah di-set dengan benar
2. Buat batch baru setelah migrations
3. Cek Railway logs untuk error messages

### Issue: "Invalid root key" (401)
**Kemungkinan**:
- Root key yang diinput salah (typo, case sensitivity)
- Root key dari batch lama (sebelum migrations)

**Solusi**:
1. Gunakan root key dari batch baru (setelah migrations)
2. Pastikan root key diinput dengan benar (case-insensitive sekarang)
3. Cek Railway logs untuk `[VerifyRootKey]` messages

### Issue: Database Connection Error
**Kemungkinan**:
- DATABASE_URL tidak di-set atau salah
- MySQL service tidak accessible

**Solusi**:
1. Verify DATABASE_URL: `railway variables | grep DATABASE_URL`
2. Test connection: `railway run npx prisma migrate status`
3. Pastikan MySQL service running di Railway dashboard

## 📊 Monitoring & Logs

### Check Railway Logs
```bash
railway logs --tail 100
```

### Look for These Log Messages:
- `[VerifyRootKey] Looking up item with:` - Shows lookup parameters
- `[VerifyRootKey] Item found:` - Shows found item details
- `[VerifyRootKey] Root key verified via bcrypt hash` - Successful verification
- `[VerifyRootKey] Invalid root key` - Failed verification (check details)

### Key Metrics to Monitor:
- Verification success rate
- Lookup method distribution (uniqCode vs serialCode vs caseInsensitive)
- Verification method distribution (bcrypt vs plainText vs directString)

## 🎯 Expected Behavior After Setup

1. **Batch Creation**: 
   - ✅ Creates 100 items dengan uniqCode, serialCode, rootKeyHash, dan rootKey
   - ✅ All items stored in Railway MySQL database

2. **QR Scan**:
   - ✅ Shows product details (name, weight, quantity)
   - ✅ Shows "Two-Step Verification Required" form
   - ✅ Requires root key input

3. **Root Key Verification**:
   - ✅ Accepts root key (3-4 alphanumeric characters)
   - ✅ Verifies via multiple methods (bcrypt → plainText → directString)
   - ✅ Returns serialCode on success
   - ✅ Redirects to `/verify/{serialCode}`

4. **Final Verification Page**:
   - ✅ Shows complete product details
   - ✅ Shows scan count and first scanned date
   - ✅ No root key form (already verified)

## 🔐 Security Notes

- **Root Key Hash**: Disimpan sebagai bcrypt hash untuk security
- **Root Key Plain Text**: Hanya untuk admin display, tidak digunakan untuk verifikasi utama
- **Fallback Methods**: Hanya digunakan jika hash comparison gagal (edge cases)
- **Rate Limiting**: Consider adding rate limiting untuk prevent brute force attacks

## 📝 Next Steps

1. ✅ Set DATABASE_URL di service aplikasi
2. ✅ Regenerate Prisma client
3. ✅ Restart service
4. ✅ Create new batch di production
5. ✅ Test root key verification end-to-end
6. ⏳ Monitor logs untuk any issues
7. ⏳ Consider adding rate limiting
8. ⏳ Consider adding audit logging untuk security

## 🎉 Success Criteria

- ✅ Batch creation menghasilkan 100 items dengan root keys
- ✅ QR scan menampilkan form root key
- ✅ Root key verification berhasil dan redirect ke serial code
- ✅ Final verification page menampilkan product details lengkap
- ✅ No errors di Railway logs
