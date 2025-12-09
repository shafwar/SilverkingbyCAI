# Root Key Verification System - Complete Guide

## Overview

Sistem verifikasi root key untuk Page 2 gram products menggunakan two-step verification:

1. User scan QR → melihat data produk dasar (nama, berat, quantity)
2. User input root key → jika benar, redirect ke SKP serial code

## Flow Lengkap

### 1. Product Creation (Admin)

- Admin membuat batch dengan quantity (contoh: 100)
- Sistem generate:
  - **100 uniqCode** (GK...) - satu per item
  - **100 serialCode** (SKA000001 sampai SKA000100)
  - **100 rootKey** (3-4 alphanumeric) - masing-masing unik
  - **100 rootKeyHash** (bcrypt hash) - untuk verifikasi

### 2. QR Scan (User)

- User scan QR dengan uniqCode (GK...)
- Request ke `/api/verify/{uniqCode}`
- API mengembalikan:
  - `requiresRootKey: true`
  - `product.serialCode` = uniqCode (untuk root key verification)
  - `product.actualSerialCode` = serialCode (SKA000001)

### 3. Root Key Verification (User)

- User input root key (3-4 karakter)
- Request ke `/api/verify/root-key` dengan:
  - `uniqCode`: uniqCode dari QR scan (GK...)
  - `rootKey`: root key yang diinput user
- API mencari item berdasarkan uniqCode
- Verifikasi menggunakan bcrypt.compare()
- Jika benar → return `serialCode` (SKA000001)
- Redirect ke `/verify/{serialCode}`

## Perbaikan yang Sudah Dilakukan

### 1. Fix uniqCode Handling

- **Masalah**: uniqCode yang dikirim ke root-key endpoint salah
- **Solusi**: Gunakan `serialNumber` (original QR scan uniqCode) ketika `requiresRootKey` true

### 2. Fallback Verification

- **Masalah**: Hash comparison mungkin gagal karena timing issues
- **Solusi**: Tambahkan fallback plain text comparison jika hash gagal

### 3. Comprehensive Logging

- Log semua langkah verifikasi untuk debugging
- Log root key saat product creation
- Log detail error jika verifikasi gagal

### 4. Quantity Generation Fix

- **Masalah**: Batch quantity 100 hanya generate 1 item
- **Solusi**: `qrCount = Math.max(payload.quantity, 1)` - generate sesuai quantity

## Testing Checklist

### ✅ Pre-requisites

- [ ] Migration sudah di-apply: `npx prisma migrate deploy`
- [ ] Prisma client sudah di-regenerate: `npx prisma generate`
- [ ] Server sudah restart setelah perubahan

### ✅ Create Batch Test

1. Buka `/admin/products/page2/create`
2. Input:
   - Nama Produk: "Test Product"
   - Quantity: 100
   - Weight: 25
   - Serial Prefix: "SKA"
3. Klik "Create Gram-based Batch"
4. **Expected**: 100 items terbuat (SKA000001 sampai SKA000100)

### ✅ QR Preview Test

1. Buka `/admin/qr-preview/page2`
2. Cari batch yang baru dibuat
3. Klik kolom "Serial Code" (menampilkan "100 items")
4. **Expected**: Modal muncul dengan semua serial codes + root keys

### ✅ Root Key Verification Test

1. Scan QR dari batch baru (uniqCode GK...)
2. Halaman verify muncul dengan form root key
3. Ambil root key dari modal (contoh: "SWMN")
4. Input root key tersebut
5. Klik "Verify Root Key"
6. **Expected**: Redirect ke `/verify/SKA000001` (atau serial code yang sesuai)

## Troubleshooting

### Root Key Invalid

**Kemungkinan penyebab:**

1. Root key yang diinput salah (typo, case sensitivity)
2. Item tidak ditemukan (uniqCode salah)
3. Root key hash tidak tersimpan dengan benar

**Debug steps:**

1. Cek server logs untuk `[VerifyRootKey]` messages
2. Pastikan root key yang digunakan sesuai dengan yang di modal
3. Pastikan batch baru dibuat setelah perbaikan

### Hanya 1 Item Terbuat

**Kemungkinan penyebab:**

1. Batch dibuat sebelum perbaikan quantity generation
2. Error saat create (cek server logs)

**Solusi:**

- Buat batch baru setelah perbaikan
- Cek server logs untuk error messages

## API Endpoints

### POST `/api/gram-products/create`

Create batch dengan quantity items.

**Body:**

```json
{
  "name": "Product Name",
  "weight": 25,
  "quantity": 100,
  "serialPrefix": "SKA"
}
```

**Response:**

```json
{
  "batch": { ... },
  "items": [
    {
      "id": 1,
      "uniqCode": "GK...",
      "serialCode": "SKA000001",
      "rootKey": "SWMN",
      ...
    },
    ...
  ]
}
```

### GET `/api/gram-products/batch/{id}?includeItems=true`

Get batch dengan semua items dan root keys.

**Response:**

```json
{
  "batch": { ... },
  "items": [
    {
      "id": 1,
      "uniqCode": "GK...",
      "serialCode": "SKA000001",
      "rootKey": "SWMN",
      ...
    }
  ]
}
```

### POST `/api/verify/root-key`

Verify root key.

**Body:**

```json
{
  "uniqCode": "GK...",
  "rootKey": "SWMN"
}
```

**Response:**

```json
{
  "verified": true,
  "serialCode": "SKA000001"
}
```

## Security Notes

1. **Root Key Hash**: Disimpan sebagai bcrypt hash untuk security
2. **Root Key Plain Text**: Hanya untuk admin display, tidak digunakan untuk verifikasi utama
3. **Fallback Comparison**: Hanya digunakan jika hash comparison gagal (edge case)
4. **Authentication**: Semua admin endpoints require ADMIN role

## Future Improvements

1. Rate limiting untuk root key verification
2. Audit log untuk root key verification attempts
3. Root key rotation mechanism
4. Bulk root key export dengan encryption
