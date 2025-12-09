# Optimasi Root Key Fetching & Verification

## ✅ Status: Root Key Verification Dioptimalkan

### Masalah yang Ditemukan:

1. **Root Key Mismatch**: 
   - User input: `64AL`
   - Item dengan uniqCode `GKMIYQWU21MFKN` punya rootKey: `CJE`
   - Root key `64AL` adalah milik item lain (SKA000003)

2. **Verification Logic**: 
   - Plain text comparison harus menjadi PRIMARY method
   - bcrypt comparison sebagai fallback

## 🎯 Optimasi yang Dilakukan:

### 1. Primary Verification Method: Plain Text Comparison ✅

**Sebelumnya**: bcrypt comparison sebagai primary
**Sekarang**: Plain text comparison sebagai PRIMARY (karena kita store plain text rootKey)

```typescript
// PRIMARY: Plain text comparison
if (gramItem.rootKey) {
  const storedRootKeyNormalized = gramItem.rootKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (storedRootKeyNormalized === normalizedRootKey) {
    isRootKeyValid = true;
    verificationMethod = "plainText";
  }
}

// Fallback: bcrypt comparison
if (!isRootKeyValid) {
  isRootKeyValid = await bcrypt.compare(normalizedRootKey, gramItem.rootKeyHash);
}
```

### 2. Enhanced Error Messages ✅

- **Development**: Menampilkan expected vs provided root key
- **Production**: Menampilkan hint untuk check admin panel
- **Hint**: Menyebutkan serial code yang benar

### 3. Better User Guidance ✅

- Frontend menampilkan tip dengan serial code yang benar
- Error message lebih informatif
- Hint untuk check admin panel

### 4. Enhanced Logging ✅

- Log semua comparison attempts
- Log mismatch details untuk debugging
- Track verification method yang berhasil

## 📋 Cara Menggunakan Root Key dengan Benar:

### Step 1: Scan QR Code
- Scan QR dengan uniqCode (contoh: `GKMIYQWU21MFKN`)
- Halaman verify muncul dengan form root key

### Step 2: Get Root Key dari Admin Panel
1. Buka `/admin/qr-preview/page2`
2. Cari batch yang sesuai
3. Klik kolom "Serial Code" (menampilkan "X items")
4. **PENTING**: Cari item dengan uniqCode yang sama dengan yang di-scan
5. Copy root key yang sesuai dengan uniqCode tersebut

### Step 3: Input Root Key
- Input root key yang sudah di-copy
- Pastikan sesuai dengan uniqCode yang di-scan
- Klik "Verify Root Key"

## 🔍 Troubleshooting:

### Issue: "Invalid root key" meskipun root key benar

**Kemungkinan**:
1. Root key dari item yang salah (uniqCode berbeda)
2. Typo atau case sensitivity (sudah di-handle dengan normalization)
3. Root key dari batch yang berbeda

**Solusi**:
1. Pastikan root key sesuai dengan uniqCode yang di-scan
2. Check di admin panel: uniqCode → rootKey mapping
3. Pastikan tidak ada typo saat copy-paste

### Issue: Root key tidak muncul di modal

**Kemungkinan**:
1. Batch belum dibuat dengan benar
2. Root key tidak ter-generate saat batch creation

**Solusi**:
1. Buat batch baru dengan quantity yang benar
2. Pastikan semua items terbuat dengan root keys
3. Check Railway logs untuk error messages

## ✅ Expected Behavior:

1. **User scan QR** → uniqCode `GKMIYQWU21MFKN`
2. **Get root key** → dari admin panel untuk uniqCode `GKMIYQWU21MFKN` → `CJE`
3. **Input root key** → `CJE`
4. **Verification** → ✅ Success → Redirect ke `/verify/SKA000035`

## 🎯 Key Points:

- ✅ **Plain text comparison adalah PRIMARY method**
- ✅ **bcrypt comparison sebagai fallback**
- ✅ **Error messages lebih informatif**
- ✅ **User guidance lebih jelas**
- ✅ **Logging lebih detail untuk debugging**

---

**Status**: ✅ **ROOT KEY VERIFICATION DIOPTIMALKAN**

Silakan test dengan root key yang sesuai dengan uniqCode yang di-scan!
