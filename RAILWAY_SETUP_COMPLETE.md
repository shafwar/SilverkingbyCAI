# Railway Setup - Complete Implementation Guide

## ✅ Status: Code Optimized & Ready for Railway Setup

Semua optimasi sudah diterapkan untuk handle large quantities (100, 1000, 10000+).

## 🎯 Optimasi yang Telah Dilakukan

### 1. Batch Processing untuk Large Quantities ✅
- **BATCH_SIZE**: 100 items per batch untuk optimal performance
- **MAX_QUANTITY**: 100,000 limit untuk safety
- **Pre-generation**: UniqCodes dan rootKeys di-generate di memory dulu
- **Parallel Processing**: QR generation dan DB insertion dalam batches
- **Error Recovery**: Failed items tracked, tidak abort seluruh batch
- **Progress Logging**: Log setiap 1000 items untuk monitoring

### 2. Performance Optimizations ✅
- Pre-generate semua uniqCodes dan rootKeys sebelum processing
- Batch processing untuk mengurangi memory usage
- Parallel QR generation dan DB insertion
- Error handling yang robust untuk large batches

### 3. Error Handling ✅
- Track failed items tanpa abort seluruh batch
- Return failed items dalam response untuk admin review
- Abort hanya jika >10% failures
- Detailed error logging

## 📋 Railway Setup Steps

### Step 1: Get MySQL DATABASE_URL

**Via Railway Dashboard** (Recommended):
1. Buka Railway Dashboard → Project → MySQL Service
2. Pergi ke **Variables** tab
3. Copy nilai `MYSQL_PUBLIC_URL` (full URL dengan password)

**Via CLI**:
```bash
railway variables --service MySQL | grep MYSQL_PUBLIC_URL
```

### Step 2: Set DATABASE_URL di Service Aplikasi

**Via Railway Dashboard** (Recommended):
1. Buka Railway Dashboard → Project → Service "SilverkingbyCAI"
2. Pergi ke **Variables** tab
3. Klik **"New Variable"**
4. Set:
   - **Name**: `DATABASE_URL`
   - **Value**: Paste `MYSQL_PUBLIC_URL` dari MySQL service
5. Klik **"Add"**

**Via CLI** (Alternative):
```bash
# Switch ke service aplikasi
railway service SilverkingbyCAI

# Set DATABASE_URL (replace dengan actual value dari MySQL service)
railway variables set "DATABASE_URL=mysql://root:password@centerbeam.proxy.rlwy.net:18099/railway"
```

### Step 3: Regenerate Prisma Client

```bash
railway service SilverkingbyCAI
railway run npx prisma generate
```

### Step 4: Restart Service

**Via Railway Dashboard**:
1. Buka Railway Dashboard → Project → Service "SilverkingbyCAI"
2. Pergi ke **Settings** tab
3. Klik **"Restart"** button

**Via CLI**:
```bash
railway restart
```

### Step 5: Verify Setup

```bash
# Check migration status
railway run npx prisma migrate status

# Should show: "Database schema is up to date!"
```

## 🧪 Testing Large Quantities

### Test dengan Quantity 1000

1. Buka `/admin/products/page2/create`
2. Input:
   - **Nama Produk**: "Silver King 100 Gr"
   - **Quantity**: 1000
   - **Weight**: 98
   - **Serial Prefix**: "SKA"
3. Klik **"Create Gram-based Batch"**
4. **Expected**:
   - ✅ Progress logs setiap 100 items
   - ✅ 1000 items terbuat (SKA000001 sampai SKA001000)
   - ✅ Response includes `failedCount` dan `failedItems` (if any)

### Test dengan Quantity 10000

1. Input **Quantity**: 10000
2. **Expected**:
   - ✅ Progress logs setiap 1000 items
   - ✅ Processing dalam batches of 100
   - ✅ Total processing time reasonable (< 10 minutes untuk 10000 items)
   - ✅ All items created successfully

## 📊 Monitoring Large Batch Creation

### Check Railway Logs

```bash
railway logs --tail 200
```

### Key Log Messages:

#### Progress Logs:
```
[GramProductCreate] Pre-generated 1000/10000 items...
[GramProductCreate] Processing batch 1/100 (items 1-100)...
[GramProductCreate] Batch 1/100 complete. Processed: 100/10000, Failed: 0
```

#### Completion Log:
```
[GramProductCreate] Batch creation complete. Successfully created 10000/10000 items.
```

#### Error Logs (if any):
```
[GramProductCreate] Failed to create item 1234 (SKA0001234): Error message
[GramProductCreate] Completed with 5 failures out of 10000 items
```

## 🎯 Expected Behavior

### Small Batches (1-100 items)
- ✅ Fast processing (< 30 seconds)
- ✅ All items created in single batch
- ✅ No progress logs needed

### Medium Batches (100-1000 items)
- ✅ Processing dalam batches of 100
- ✅ Progress logs setiap batch
- ✅ Total time: 1-5 minutes

### Large Batches (1000-10000 items)
- ✅ Processing dalam batches of 100
- ✅ Progress logs setiap 1000 items
- ✅ Total time: 5-30 minutes (depending on QR generation speed)

### Very Large Batches (10000+ items)
- ✅ Processing dalam batches of 100
- ✅ Progress logs setiap 1000 items
- ✅ May take 30+ minutes
- ✅ Consider splitting into multiple batches for better UX

## 🔍 Troubleshooting

### Issue: "Quantity exceeds maximum limit"
**Solusi**: Contact support untuk batches > 100,000 atau split into multiple batches

### Issue: "Too many failures"
**Kemungkinan**: Database connection issues atau R2 storage issues
**Solusi**: 
1. Check Railway logs untuk detailed errors
2. Verify DATABASE_URL is correct
3. Check R2 credentials
4. Retry with smaller batch size

### Issue: Slow processing
**Kemungkinan**: Large quantity atau slow QR generation
**Solusi**:
1. Monitor Railway logs untuk bottlenecks
2. Consider splitting into multiple batches
3. Check R2 storage performance

## 📝 Notes

- **Batch Size**: 100 items per batch is optimal balance between performance and memory
- **Max Quantity**: 100,000 limit untuk prevent accidental huge batches
- **Error Recovery**: Failed items tracked but don't abort entire batch
- **Progress Tracking**: Logs help monitor large batch creation
- **Memory Usage**: Pre-generation helps but may use significant memory for very large batches

## 🎉 Success Criteria

- ✅ DATABASE_URL set correctly
- ✅ Prisma client regenerated
- ✅ Service restarted
- ✅ Batch creation works for quantities 1-10000+
- ✅ Progress logs visible untuk large batches
- ✅ Failed items tracked and reported
- ✅ All items created successfully (or failures reported)

---

**Status**: ✅ **READY FOR PRODUCTION**

Silakan ikuti setup steps di atas untuk deploy ke Railway.
