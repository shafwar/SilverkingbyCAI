# Implementasi: Shared UniqCode untuk Batch

## ✅ Status: Implementasi Selesai

### Konsep Baru:

- **1 UniqCode** untuk seluruh batch (untuk QR code)
- **100 Root Keys** (satu per item, unik)
- **100 Serial Codes** (SKA000001 sampai SKA000100)

## 🎯 Perubahan yang Dilakukan:

### 1. Batch Creation ✅

**Sebelumnya**: Setiap item punya uniqCode sendiri
**Sekarang**: Semua items dalam batch share 1 uniqCode

```typescript
// Generate ONE uniqCode for entire batch
let sharedUniqCode = generateSerialCode("GK");

// All items use the same uniqCode
for (let i = 0; i < qrCount; i++) {
  itemData.push({
    uniqCode: sharedUniqCode, // SAME for all items
    serialCode: serialCodes[i], // UNIQUE per item
    rootKey: generateRootKey(), // UNIQUE per item
    rootKeyHash: await bcrypt.hash(rootKey, 10),
  });
}
```

### 2. QR Generation ✅

**Sebelumnya**: Generate QR untuk setiap item
**Sekarang**: Generate QR sekali untuk seluruh batch

```typescript
// Generate QR code ONCE for the entire batch
const qrResult = await generateAndStoreQR(sharedUniqCode, verifyUrl, payload.name, GRAM_QR_FOLDER);
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
    break;
  }
}
```

## 📋 Flow Lengkap:

### 1. Batch Creation:

- Admin create batch dengan quantity 100
- System generate:
  - **1 uniqCode** (shared) → untuk QR
  - **100 serialCodes** (SKA000001 sampai SKA000100)
  - **100 rootKeys** (masing-masing unik)
- **1 QR code** di-generate (karena uniqCode sama)
- **100 items** tersimpan di database dengan:
  - uniqCode: SAMA (contoh: `GKMIYRN...`)
  - serialCode: BERBEDA (SKA000001, SKA000002, ...)
  - rootKey: BERBEDA (ZR4I, 2IKM, ED54, ...)

### 2. QR Scan:

- User scan QR → uniqCode (contoh: `GKMIYRN...`)
- System mencari semua items dengan uniqCode tersebut
- Menampilkan form root key

### 3. Root Key Verification:

- User input root key (contoh: `ED54`)
- System mencari item dengan:
  - uniqCode: `GKMIYRN...` (dari QR scan)
  - rootKey: `ED54` (dari user input)
- Jika ditemukan → return serialCode (contoh: `SKA000003`)
- Redirect ke `/verify/SKA000003`

## ✅ Benefits:

1. **Efisiensi Storage**: Hanya 1 QR image untuk seluruh batch
2. **Simplified QR Management**: Satu QR untuk semua items dalam batch
3. **Root Key sebagai Identifier**: Root key menentukan serial code mana yang diverifikasi
4. **Scalable**: Bisa handle quantity besar (1000, 10000+) dengan efisien

## 🧪 Testing:

### Test dengan Batch Baru:

1. **Create Batch**:
   - Quantity: 100
   - Serial Prefix: "SKA"
   - Expected: 1 uniqCode, 100 serialCodes, 100 rootKeys

2. **Verify QR Generation**:
   - Check bahwa hanya 1 QR image di-generate
   - Semua items punya qrImageUrl yang sama

3. **Test Root Key Verification**:
   - Scan QR dengan uniqCode yang shared
   - Input root key dari item tertentu (contoh: SKA000003 → ED54)
   - Expected: Redirect ke `/verify/SKA000003`

## 📝 Database Structure:

```
Batch: Silver King 25 Gr (ID: 21)
├── Item 1: uniqCode: GKMIYRN..., serialCode: SKA000001, rootKey: ZR4I
├── Item 2: uniqCode: GKMIYRN..., serialCode: SKA000002, rootKey: 2IKM
├── Item 3: uniqCode: GKMIYRN..., serialCode: SKA000003, rootKey: ED54
└── ... (100 items total, semua dengan uniqCode yang sama)
```

## 🎯 Key Points:

- ✅ **1 UniqCode** untuk seluruh batch
- ✅ **100 Root Keys** (satu per item, unik)
- ✅ **100 Serial Codes** (SKA000001 sampai SKA000100)
- ✅ **1 QR Code** di-generate (efisien)
- ✅ **Verification**: uniqCode + rootKey → serialCode

---

**Status**: ✅ **IMPLEMENTASI SELESAI - SHARED UNIQCODE DENGAN ROOT KEY UNIK PER ITEM**
