# Railway Setup - Final Instructions

## ✅ Status: Code Ready, Setup Required

Semua optimasi sudah diterapkan. Sekarang perlu setup DATABASE_URL di Railway.

## 🎯 DATABASE_URL yang Perlu Di-Set

```
mysql://root:OsiHyYEfihrcazRuKAtawhHIeXFWKFEM@centerbeam.proxy.rlwy.net:18099/railway
```

## 📋 Setup Steps (Via Railway Dashboard - Recommended)

### Step 1: Set DATABASE_URL

1. **Buka Railway Dashboard**: https://railway.app
2. **Login** ke akun Railway Anda
3. **Pilih Project**: SilverkingbyCAI
4. **Pilih Service**: SilverkingbyCAI (Next.js app, bukan MySQL)
5. **Pergi ke tab "Variables"**
6. **Klik "New Variable"**
7. **Set**:
   - **Name**: `DATABASE_URL`
   - **Value**: `mysql://root:OsiHyYEfihrcazRuKAtawhHIeXFWKFEM@centerbeam.proxy.rlwy.net:18099/railway`
8. **Klik "Add"**

### Step 2: Regenerate Prisma Client

**Via Railway Dashboard**:

1. Buka Railway Dashboard → Project → Service "SilverkingbyCAI"
2. Pergi ke tab "Deployments"
3. Klik "Redeploy" atau trigger new deployment

**Via CLI**:

```bash
railway service SilverkingbyCAI
railway run npx prisma generate
```

### Step 3: Restart Service

**Via Railway Dashboard**:

1. Buka Railway Dashboard → Project → Service "SilverkingbyCAI"
2. Pergi ke tab "Settings"
3. Klik **"Restart"** button

**Via CLI**:

```bash
railway restart
```

### Step 4: Verify Setup

```bash
railway run npx prisma migrate status
```

**Expected output**: "Database schema is up to date!"

## 🧪 Test Batch Creation

### Test dengan Quantity 100

1. Buka `https://cahayasilverking.id/admin/products/page2/create`
2. Input:
   - **Nama Produk**: "Silver King 100 Gr"
   - **Quantity**: 100
   - **Weight**: 98
   - **Serial Prefix**: "SKA"
3. Klik **"Create Gram-based Batch"**
4. **Expected**:
   - ✅ 100 items terbuat (SKA000001 sampai SKA000100)
   - ✅ Setiap item punya root key
   - ✅ Response includes all items dengan root keys

### Test dengan Quantity 1000

1. Input **Quantity**: 1000
2. **Expected**:
   - ✅ Progress logs setiap 100 items
   - ✅ 1000 items terbuat
   - ✅ Processing time: 1-5 minutes
   - ✅ All items created successfully

### Test dengan Quantity 10000

1. Input **Quantity**: 10000
2. **Expected**:
   - ✅ Progress logs setiap 1000 items
   - ✅ Processing dalam batches of 100
   - ✅ Total time: 10-30 minutes
   - ✅ All items created successfully

## 📊 Monitoring

### Check Railway Logs

```bash
railway logs --tail 200
```

### Key Log Messages untuk Large Batches:

```
[GramProductCreate] Processing batch: { quantity: 10000, qrCount: 10000 }
[GramProductCreate] Pre-generating uniqCodes and root keys...
[GramProductCreate] Pre-generated 1000/10000 items...
[GramProductCreate] Pre-generated 2000/10000 items...
...
[GramProductCreate] Pre-generation complete. Starting QR generation and database insertion...
[GramProductCreate] Processing batch 1/100 (items 1-100)...
[GramProductCreate] Batch 1/100 complete. Processed: 100/10000, Failed: 0
[GramProductCreate] Processing batch 2/100 (items 101-200)...
...
[GramProductCreate] Batch creation complete. Successfully created 10000/10000 items.
```

## ✅ Verification Checklist

- [ ] DATABASE_URL set di Railway Dashboard
- [ ] Prisma client regenerated
- [ ] Service restarted
- [ ] Migration status verified
- [ ] Test batch dengan quantity 100 berhasil
- [ ] Test batch dengan quantity 1000 berhasil (optional)
- [ ] Root key verification berhasil

## 🎉 Success Criteria

- ✅ DATABASE_URL correctly set
- ✅ Prisma client regenerated
- ✅ Service restarted
- ✅ Batch creation works untuk quantities 1-10000+
- ✅ Root key verification works
- ✅ All items created dengan root keys

---

**Next Steps**: Set DATABASE_URL via Railway Dashboard, lalu test batch creation!
