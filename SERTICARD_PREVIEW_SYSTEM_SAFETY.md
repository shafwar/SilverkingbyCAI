# Safety Deployment: Serticard Preview & Adjustment System

## Tanggal
10 Februari 2026

## Ringkasan Perubahan
Implementasi sistem preview dan adjustment untuk serticard yang memungkinkan admin melihat preview sebelum download dan melakukan adjustment pada font, ukuran teks, dan QR code. Sistem ini terintegrasi dengan template default (A-I) dan custom template yang sudah ada.

## Fitur yang Diimplementasikan

### 1. Database Schema
- **Model `SerticardAdjustment`**: Menyimpan konfigurasi adjustment per template variant
- Fields:
  - `templateVariant`: Variant template (01, 03, ..., custom)
  - `userId`: Optional user ID (null = global default)
  - `fontFamily`: Jenis font
  - `fontSizePreset`: BESAR atau KECIL
  - `productTitleSize`: Multiplier untuk ukuran judul produk (0.5 - 2.0)
  - `uniqcodeSize`: Multiplier untuk ukuran uniqcode (0.5 - 2.0)
  - `serialcodeSize`: Multiplier untuk ukuran serial code (0.5 - 2.0)
  - `qrSize`: Multiplier untuk ukuran QR code (0.5 - 2.0)

### 2. API Endpoints
- **GET `/api/admin/serticard/adjustment`**: Get adjustment config
- **POST/PUT `/api/admin/serticard/adjustment`**: Upsert adjustment config
- **DELETE `/api/admin/serticard/adjustment`**: Delete adjustment config

### 3. Komponen Preview Modal
- **`SerticardPreviewModal`**: Modal dengan canvas untuk real-time preview
- Features:
  - Real-time preview saat adjustment berubah
  - Canvas rendering dengan HTML5 Canvas API
  - Controls untuk semua adjustment parameters
  - Save adjustment ke database
  - Download dengan adjustment yang sudah diset

### 4. Integration dengan Download System
- **Updated `QrPreviewGridGram`**: 
  - Dropdown sekarang membuka preview modal terlebih dahulu
  - Preview modal menampilkan preview dengan adjustment
  - Download menggunakan adjustment dari preview
- **Updated `/api/qr/download-single-pdf`**:
  - Menerima adjustment data dari request
  - Menggunakan adjustment untuk rendering PDF
  - Fallback ke database jika adjustment tidak disediakan

### 5. Library Functions
- **`src/lib/serticard-adjustment.ts`**: 
  - `getSerticardAdjustment()`: Get adjustment config
  - `upsertSerticardAdjustment()`: Save adjustment config
  - `deleteSerticardAdjustment()`: Delete adjustment config
  - `getAllSerticardAdjustments()`: Get all adjustments

## File yang Dimodifikasi/Dibuat

### Database
- `prisma/schema.prisma`: Added `SerticardAdjustment` model

### API Routes
- `src/app/api/admin/serticard/adjustment/route.ts` (NEW)
- `src/app/api/qr/download-single-pdf/route.ts` (MODIFIED)

### Components
- `src/components/admin/SerticardPreviewModal.tsx` (NEW)
- `src/components/admin/QrPreviewGridGram.tsx` (MODIFIED)

### Libraries
- `src/lib/serticard-adjustment.ts` (NEW)

## Testing Checklist
- [x] Database schema created successfully
- [x] API endpoints working correctly
- [x] Preview modal opens from dropdown
- [x] Real-time preview updates when adjustment changes
- [x] Adjustment saves to database
- [x] Download uses adjustment from preview
- [x] Works with default templates (A-I)
- [x] Works with custom templates
- [x] Fallback to default config if no adjustment found
- [x] TypeScript compilation successful
- [ ] Manual testing: Preview accuracy
- [ ] Manual testing: Download matches preview
- [ ] Manual testing: Adjustment persistence

## Impact Assessment
- **Risk Level**: MEDIUM
  - New database table required (migration needed)
  - Changes to download API (backward compatible with fallback)
  - New UI components (isolated, no breaking changes)

- **User Experience**: 
  - ✅ Significantly improved - admin can preview before download
  - ✅ More control over serticard appearance
  - ✅ Adjustment settings persist for reuse
  - ✅ Works seamlessly with existing custom template system

## Migration Required
```bash
npx prisma migrate deploy
```

## Rollback Plan
Jika terjadi masalah:
1. Revert database migration:
   ```sql
   DROP TABLE IF EXISTS SerticardAdjustment;
   ```
2. Revert code changes:
   ```bash
   git revert <commit-hash>
   ```

## Deployment Notes
- **Database Migration**: Required before deployment
- **Environment Variables**: No new variables needed
- **Breaking Changes**: None (backward compatible)
- **Cache**: No cache invalidation needed

## Related Issues
- Enables preview before download for better UX
- Allows fine-tuning of serticard appearance
- Integrates with existing custom template system
- Maintains backward compatibility with existing downloads
