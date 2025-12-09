# Solusi: Shared UniqCode dengan Root Key Unik Per Item

## ✅ Implementasi Selesai

### Konsep:
- **1 UniqCode** untuk seluruh batch (100 items) → untuk QR code
- **100 Root Keys** (satu per item, unik) → untuk verifikasi serial code
- **100 Serial Codes** (SKA000001 sampai SKA000100) → untuk identifikasi item

## 🎯 Perubahan yang Dilakukan:

### 1. Batch Creation ✅

**Sebelumnya**: Setiap item punya uniqCode sendiri
```typescript
// OLD: Setiap item punya uniqCode berbeda
for (let i = 0; i < qrCount; i++) {
  const uniqCode = generateSerialCode("GK"); // Different for each
  const rootKey = generateRootKey();
  // ...
}
```

**Sekarang**: Semua items share 1 uniqCode
```typescript
// NEW: Generate ONE uniqCode for entire batch
const sharedUniqCode = generateSerialCode("GK");

// All items use the same uniqCode
for (let i = 0; i < qrCount; i++) {
  itemData.push({
    uniqCode: sharedUniqCode, // SAME for all items
    serialCode: serialCodes[i], // UNIQUE per item
    rootKey: generateRootKey(), // UNIQUE per item
  });
}
```

### 2. QR Generation ✅

**Sebelumnya**: Generate QR untuk setiap item (100x)
**Sekarang**: Generate QR sekali untuk seluruh batch

```typescript
// Generate QR code ONCE before batch processing
const qrResult = await generateAndStoreQR(
  sharedUniqCode,
  verifyUrl,
  payload.name,
  GRAM_QR_FOLDER
);
const sharedQrImageUrl = qrResult.url;

// All items use the same QR image URL
```

### 3. Root Key Verification ✅

**Sebelumnya**: Cari item dengan uniqCode saja
**Sekarang**: Cari item dengan uniqCode + rootKey

```typescript
// Find all items with the same uniqCode
const itemsWithUniqCode = await prisma.gramProductItem.findMany({
  where: { uniqCode: normalizedUniqCode },
});

// Match by rootKey to find the correct item
for (const item of itemsWithUniqCode) {
  if (item.rootKey === normalizedRootKey) {
    gramItem = item; // Found!
    return serialCode; // Return the correct serialCode
  }
}
```

## 📋 Flow Lengkap:

### 1. Batch Creation (Admin):
```
Input: Quantity 100, Serial Prefix "SKA"
Output:
  - 1 uniqCode: GKMIYRN... (shared)
  - 100 serialCodes: SKA000001, SKA000002, ..., SKA000100
  - 100 rootKeys: ZR4I, 2IKM, ED54, ... (each unique)
  - 1 QR image (because uniqCode is shared)
```

### 2. QR Scan (User):
```
User scans QR → uniqCode: GKMIYRN...
System finds ALL items with this uniqCode (100 items)
Shows form: "Enter root key to verify specific SKP serial number"
```

### 3. Root Key Verification (User):
```
User inputs root key: ED54
System searches:
  - Find items with uniqCode: GKMIYRN...
  - Match rootKey: ED54
  - Found: SKA000003
  - Return: serialCode SKA000003
  - Redirect: /verify/SKA000003
```

## ✅ Benefits:

1. **Efisiensi Storage**: Hanya 1 QR image untuk 100 items
2. **Simplified QR Management**: Satu QR untuk semua items dalam batch
3. **Root Key sebagai Identifier**: Root key menentukan serial code mana yang diverifikasi
4. **Scalable**: Bisa handle quantity besar dengan efisien

## 🧪 Testing:

### Test dengan Batch Baru:

1. **Create Batch**:
   ```
   Quantity: 100
   Serial Prefix: "SKA"
   ```
   Expected:
   - ✅ 1 uniqCode untuk seluruh batch
   - ✅ 100 serialCodes (SKA000001 sampai SKA000100)
   - ✅ 100 rootKeys (masing-masing unik)
   - ✅ 1 QR image di-generate

2. **Verify Database**:
   ```sql
   SELECT uniqCode, COUNT(*) as count 
   FROM GramProductItem 
   WHERE batchId = X 
   GROUP BY uniqCode;
   ```
   Expected: 1 row dengan count = 100

3. **Test Root Key Verification**:
   - Scan QR dengan uniqCode yang shared
   - Input root key dari item tertentu (contoh: SKA000003 → ED54)
   - Expected: ✅ Redirect ke `/verify/SKA000003`

## 📝 Database Structure Example:

```
Batch: Silver King 25 Gr (ID: 21)
├── All items share uniqCode: GKMIYRN...
├── Item 1: serialCode: SKA000001, rootKey: ZR4I
├── Item 2: serialCode: SKA000002, rootKey: 2IKM
├── Item 3: serialCode: SKA000003, rootKey: ED54
└── ... (100 items total, semua dengan uniqCode yang sama)
```

## 🎯 Key Points:

- ✅ **1 UniqCode** untuk seluruh batch (untuk QR)
- ✅ **100 Root Keys** (satu per item, unik untuk verifikasi)
- ✅ **100 Serial Codes** (SKA000001 sampai SKA000100)
- ✅ **1 QR Code** di-generate (efisien)
- ✅ **Verification**: uniqCode + rootKey → serialCode

---

**Status**: ✅ **IMPLEMENTASI SELESAI - SHARED UNIQCODE DENGAN ROOT KEY UNIK PER ITEM**

Silakan buat batch baru untuk test!
