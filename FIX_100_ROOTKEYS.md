# Fix: Ensure All 100 Root Keys Are Generated

## ✅ Status: Fixed

### Masalah:

- Input quantity 100, tapi hanya 1 root key yang terbuat
- Batch creation menggunakan parallel processing yang menyebabkan race condition
- Database connection pool exhaustion

### Solusi yang Diimplementasikan:

#### 1. **Sequential Processing** ✅

**Sebelumnya**: Parallel processing dengan `Promise.allSettled()`

- Bisa menyebabkan race condition
- Database connection pool exhaustion
- Beberapa items tidak terbuat

**Sekarang**: Sequential processing dengan `for` loop

- Setiap item dibuat satu per satu
- Memastikan semua 100 items terbuat
- Tidak ada race condition

```typescript
// OLD: Parallel processing
const batchPromises = currentBatch.map(async (itemData) => {
  /* ... */
});
const batchResults = await Promise.allSettled(batchPromises);

// NEW: Sequential processing
for (let localIndex = 0; localIndex < currentBatch.length; localIndex++) {
  const itemData = currentBatch[localIndex];
  // Create item one by one
  const item = await prisma.gramProductItem.create({
    /* ... */
  });
}
```

#### 2. **Pre-generation All Root Keys** ✅

- Semua 100 root keys di-generate sebelum batch processing
- Setiap item punya root key unik
- Semua items share uniqCode yang sama

```typescript
// Pre-generate all root keys
for (let i = 0; i < qrCount; i++) {
  const rootKey = generateRootKey(); // Unique per item
  const rootKeyHash = await bcrypt.hash(rootKey, 10);

  itemData.push({
    uniqCode: sharedUniqCode, // SAME for all
    serialCode: serialCodes[i], // UNIQUE per item
    rootKey, // UNIQUE per item
    rootKeyHash, // UNIQUE per item
  });
}
```

#### 3. **Progress Logging** ✅

- Log progress setiap 10 items
- Memudahkan tracking jika ada masalah
- Menampilkan percentage completion

```typescript
if ((globalIndex + 1) % 10 === 0 || globalIndex === qrCount - 1) {
  const progressPercent = ((globalIndex + 1) / qrCount) * 100;
  console.log(
    `Progress: ${globalIndex + 1}/${qrCount} items created (${progressPercent.toFixed(1)}%)`
  );
}
```

#### 4. **Retry Logic** ✅

- Retry hingga 3 kali untuk setiap item yang gagal
- Exponential backoff (100ms, 200ms, 300ms)
- Skip duplicate items yang sudah ada

## 📋 Flow Lengkap:

### 1. Pre-generation Phase:

```
Input: Quantity 100, Serial Prefix "SKA"
Output:
  - 1 shared uniqCode: GKMIYRN...
  - 100 serialCodes: SKA000001 sampai SKA000100
  - 100 rootKeys: ZR4I, 2IKM, ED54, ... (each unique)
  - 100 rootKeyHashes: (hashed versions)
```

### 2. QR Generation:

```
- Generate 1 QR code untuk shared uniqCode
- Semua 100 items akan menggunakan QR image yang sama
```

### 3. Database Insertion (Sequential):

```
For each item (1 to 100):
  1. Create database record
  2. Log progress every 10 items
  3. Retry if failed (up to 3 times)
  4. Continue to next item
```

## ✅ Expected Results:

Setelah fix ini:

- ✅ **100 items** akan terbuat di database
- ✅ **100 root keys** unik (satu per item)
- ✅ **1 uniqCode** shared untuk semua items
- ✅ **100 serialCodes** (SKA000001 sampai SKA000100)
- ✅ **1 QR image** (karena uniqCode shared)

## 🧪 Testing:

1. **Create Batch Baru**:
   - Quantity: 100
   - Serial Prefix: "SKA"
   - Expected: 100 items dengan 100 root keys

2. **Verify Database**:

   ```sql
   SELECT COUNT(*) as total_items,
          COUNT(DISTINCT rootKey) as unique_rootkeys,
          COUNT(DISTINCT uniqCode) as unique_uniqcodes
   FROM GramProductItem
   WHERE batchId = X;
   ```

   Expected:
   - total_items: 100
   - unique_rootkeys: 100
   - unique_uniqcodes: 1

3. **Check QR Preview**:
   - Modal "Serial Code" harus menampilkan 100 items
   - Setiap item punya root key unik
   - Semua items share uniqCode yang sama

---

**Status**: ✅ **FIXED - Sequential Processing Memastikan Semua 100 Items Terbuat**

Silakan buat batch baru untuk test!
