# Fix: Remove Unique Constraint from uniqCode

## ✅ Status: Fixed

### Masalah:

- Error: `Unique constraint failed on the constraint: GramProductItem_uniqCode_key`
- Hanya 1 item yang bisa dibuat karena `uniqCode` memiliki constraint `@unique`
- Kita ingin 100 items share 1 `uniqCode` yang sama

### Root Cause:

Di Prisma schema, `uniqCode` memiliki constraint `@unique`:

```prisma
model GramProductItem {
  uniqCode String @unique  // ❌ Ini mencegah multiple items dengan uniqCode yang sama
}
```

### Solusi:

#### 1. **Update Prisma Schema** ✅

```prisma
model GramProductItem {
  /// NOTE: NOT unique - multiple items in a batch can share the same uniqCode
  /// Root key is used to differentiate items with the same uniqCode
  uniqCode      String
  /// This MUST be unique per item
  serialCode    String           @unique

  /// Index for faster lookups by uniqCode (since multiple items can have same uniqCode)
  @@index([uniqCode])
}
```

#### 2. **Create Migration** ✅

```sql
-- Drop unique constraint
DROP INDEX `GramProductItem_uniqCode_key` ON `GramProductItem`;

-- Create index for faster lookups
CREATE INDEX `GramProductItem_uniqCode_idx` ON `GramProductItem`(`uniqCode`);
```

#### 3. **Update All Code** ✅

Mengubah semua `findUnique` dengan `uniqCode` menjadi `findFirst`:

**Files Updated:**

- `src/app/api/gram-products/create/route.ts`
- `src/app/api/qr-gram/[uniqCode]/route.ts`
- `src/app/api/qr-gram/[uniqCode]/qr-only/route.ts`
- `src/app/api/verify/[serialCode]/route.ts`
- `src/app/api/verify-gram/[uniqCode]/route.ts`
- `src/app/api/verify/root-key/route.ts`
- `src/app/api/qr/[serialCode]/route.ts`
- `src/app/api/qr/[serialCode]/qr-only/route.ts`

**Before:**

```typescript
const gramItem = await prisma.gramProductItem.findUnique({
  where: { uniqCode },
});
```

**After:**

```typescript
// Note: uniqCode is NOT unique - multiple items can share same uniqCode
// We just need to get the first item with this uniqCode
const gramItem = await prisma.gramProductItem.findFirst({
  where: { uniqCode },
});
```

## 📋 Migration Steps:

### 1. Local Development:

```bash
npx prisma migrate dev --name remove_uniqcode_unique_constraint
npx prisma generate
```

### 2. Production (Railway):

```bash
railway run npx prisma migrate deploy
railway run npx prisma generate
```

## ✅ Expected Results:

Setelah fix ini:

- ✅ **100 items** bisa dibuat dengan `uniqCode` yang sama
- ✅ **100 root keys** unik (satu per item)
- ✅ **1 uniqCode** shared untuk semua items dalam batch
- ✅ **100 serialCodes** unique (SKA000001 sampai SKA000100)
- ✅ **Index** pada `uniqCode` untuk faster lookups

## 🧪 Testing:

1. **Create Batch Baru**:
   - Quantity: 100
   - Serial Prefix: "SKA"
   - Expected: 100 items dengan uniqCode yang sama

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

**Status**: ✅ **FIXED - Unique Constraint Removed, Multiple Items Can Share Same uniqCode**

Silakan buat batch baru untuk test!
