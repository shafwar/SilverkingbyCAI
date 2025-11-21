# QR Code Verification Guide - Cahaya Silver King

## ✅ Verifikasi Lengkap Flow QR Code

### 1. Product Creation Flow

**Endpoint:** `POST /api/products/create`

**Flow:**
1. Admin membuat product melalui admin panel
2. System generate serial code (atau menggunakan yang di-input)
3. System generate verify URL menggunakan `getVerifyUrl(serialCode)`
   - URL format: `https://www.cahayasilverking.id/verify/{serialCode}`
4. System generate QR code dengan URL tersebut
5. QR code disimpan:
   - **Production (Railway):** URL ke `/api/qr/{serialCode}` (on-the-fly generation)
   - **R2 Storage:** Jika R2 configured, upload ke R2 bucket
   - **Local Dev:** Save ke `/public/qr/{serialCode}.png`
6. Product dan QR record disimpan ke database

**Code Location:**
- `src/app/api/products/create/route.ts` - Product creation
- `src/lib/qr.ts` - QR generation logic
- `src/utils/constants.ts` - URL generation functions

### 2. QR Code Generation

**Endpoint:** `GET /api/qr/[serialCode]`

**Flow:**
1. Request QR code image untuk serial code tertentu
2. System generate verify URL: `https://www.cahayasilverking.id/verify/{serialCode}`
3. Generate QR code PNG dengan URL tersebut
4. Add serial number text di bawah QR code
5. Return PNG image

**Code Location:**
- `src/app/api/qr/[serialCode]/route.ts`

### 3. QR Preview Display

**Endpoint:** `GET /api/admin/qr-preview`

**Flow:**
1. Admin membuka QR Preview page
2. System fetch semua products dengan QR records
3. Display QR images:
   - Jika `qrImageUrl` ada: gunakan URL tersebut
   - Jika `qrImageUrl` null: fallback ke `/api/qr/{serialCode}`
4. Error handling: jika image gagal load, fallback ke API route

**Code Location:**
- `src/components/admin/QrPreviewGrid.tsx`
- `src/app/api/admin/qr-preview/route.ts`

### 4. QR Verification

**Endpoint:** `GET /api/verify/[serialCode]`

**Flow:**
1. User scan QR code atau input serial number
2. QR code mengarah ke: `https://www.cahayasilverking.id/verify/{serialCode}`
3. System verify serial code di database
4. Increment scan count
5. Log scan activity
6. Return product information

**Code Location:**
- `src/app/api/verify/[serialCode]/route.ts`
- `src/app/verify/[serialNumber]/page.tsx`

## 🔧 Configuration

### Environment Variables (Railway)

```bash
NEXTAUTH_URL=https://www.cahayasilverking.id
NEXT_PUBLIC_APP_URL=https://www.cahayasilverking.id
NODE_ENV=production
RAILWAY_ENVIRONMENT=true
```

### URL Generation Logic

**Function:** `getBaseUrl()` in `src/utils/constants.ts`

**Production Logic:**
1. Check `NEXT_PUBLIC_APP_URL` → use if exists
2. Check `NEXTAUTH_URL` → use if exists
3. Fallback to: `https://www.cahayasilverking.id`

**Verify URL Format:**
```
{baseUrl}/verify/{serialCode}
Example: https://www.cahayasilverking.id/verify/SKA000001
```

## ✅ Verification Checklist

### Product Creation
- [x] Product creation generates QR code
- [x] QR code uses correct domain (cahayasilverking.id)
- [x] QR record saved to database
- [x] QR URL stored correctly

### QR Display
- [x] QR Preview shows QR images
- [x] Fallback to API route if qrImageUrl null
- [x] Error handling for failed image loads
- [x] Download QR code functionality

### QR Verification
- [x] QR code scans correctly
- [x] Verify endpoint returns product data
- [x] Scan count increments
- [x] Scan logs created

### URL Consistency
- [x] All QR codes use cahayasilverking.id domain
- [x] Verify URLs consistent across all endpoints
- [x] No hardcoded Railway URLs

## 🐛 Troubleshooting

### QR Not Showing in Preview

**Problem:** QR image tidak muncul di admin preview

**Solutions:**
1. Check `qrImageUrl` di database - jika null, akan fallback ke API route
2. Verify API route `/api/qr/{serialCode}` accessible
3. Check browser console untuk error
4. Verify domain di environment variables

### QR Points to Wrong Domain

**Problem:** QR code mengarah ke domain lama (Railway)

**Solutions:**
1. Check `NEXT_PUBLIC_APP_URL` di Railway variables
2. Regenerate QR untuk product yang sudah ada:
   ```bash
   POST /api/admin/qr-preview/regenerate
   ```
3. Verify `getBaseUrl()` returns correct domain

### QR Generation Fails

**Problem:** Error saat generate QR code

**Solutions:**
1. Check logs di Railway dashboard
2. Verify `qrcode` package installed
3. Check database connection
4. Verify serial code format valid

## 📝 Regenerate QR Codes

Jika perlu regenerate QR untuk semua products:

**Endpoint:** `POST /api/admin/qr-preview/regenerate`

**Request Body:**
```json
{} // Empty body untuk regenerate semua
```

**Response:**
```json
{
  "success": true,
  "regenerated": 10,
  "total": 10,
  "results": [...]
}
```

## 🎯 Testing

### Manual Test Steps

1. **Create Product:**
   - Login ke admin panel
   - Create new product
   - Verify QR code generated

2. **View QR Preview:**
   - Navigate ke QR Preview page
   - Verify semua QR images muncul
   - Test download QR code

3. **Verify QR:**
   - Scan QR code atau input serial number
   - Verify product information muncul
   - Check scan count increments

4. **Check URL:**
   - Inspect QR code image
   - Scan QR code
   - Verify mengarah ke `cahayasilverking.id/verify/{serialCode}`

## ✅ Final Verification

Semua flow sudah di-verify dan tested:
- ✅ Product creation dengan QR generation
- ✅ QR Preview dengan fallback mechanism
- ✅ QR Verification endpoint
- ✅ URL consistency (semua menggunakan cahayasilverking.id)
- ✅ Error handling dan fallbacks
- ✅ Download functionality

**Status:** ✅ READY FOR PRODUCTION

