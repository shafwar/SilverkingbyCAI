# Safety Deployment: Dropdown Positioning Fix untuk QR Preview Page 2

## Tanggal
10 Februari 2026

## Ringkasan Perubahan
Memperbaiki masalah dropdown download di QR Preview Page 2 yang tidak terlihat ketika user scroll ke bawah dan klik tombol Download. Dropdown sekarang menggunakan smart positioning yang lebih baik dan auto-scroll untuk memastikan selalu terlihat di viewport.

## Masalah yang Diperbaiki
- **Masalah 1**: Dropdown download untuk produk "Silver King Eid Al-Fitr Limited Edition #52" (dan produk lainnya) tidak terlihat ketika user scroll ke bagian bawah halaman dan klik tombol Download. User harus scroll manual untuk melihat dropdown.
- **Masalah 2**: Dropdown muncul di atas ketika user berada di bagian atas halaman, padahal seharusnya muncul di bawah karena ada cukup ruang di bawah.
- **Root Cause**: Positioning logic sebelumnya terlalu agresif dalam mem-flip dropdown ke atas dan tidak memprioritaskan posisi bawah sebagai default.

## Perubahan yang Dilakukan

### 1. Enhanced Positioning Logic dengan Prioritas Bawah (`src/components/admin/QrPreviewGridGram.tsx`)
- **Prioritas Posisi Bawah dengan Special Handling untuk Item di Paling Atas**: 
  - **Special Rule untuk Top Items**: Jika button berada dalam 300px dari atas viewport, dropdown **SELALU** muncul di bawah, tidak peduli kondisi lainnya
  - Dropdown sekarang **selalu muncul di bawah** jika ada cukup ruang (>= 200px)
  - Hanya flip ke atas jika benar-benar tidak ada cukup ruang di bawah (< 200px) DAN ada lebih banyak ruang di atas (selisih >= 150px)
  - Default tetap di bawah untuk UX yang lebih baik

- **Strict Logic**:
  - Minimum required space: 200px untuk muncul di bawah
  - Threshold untuk top items: 300px dari atas viewport
  - Selisih minimum untuk flip ke atas: 150px
  - Menghapus logic kompleks berdasarkan viewport percentage
  - Fokus pada perbandingan langsung antara ruang di atas vs di bawah dengan threshold yang jelas

### 2. Simplified Scroll Handling
- **Removed Auto-Scroll**: 
  - Menghapus fungsi `ensureVisibility()` yang menyebabkan scroll tidak perlu
  - Positioning logic yang lebih baik membuat auto-scroll tidak diperlukan
  - Scroll handler sekarang hanya update position, lebih ringan dan performant

### 3. Performance Optimization
- **Throttled Scroll Handler**: 
  - Scroll handler menggunakan throttling dengan timeout 50ms untuk performa yang lebih baik
  - Update position dan visibility check dilakukan bersamaan dalam satu handler

## File yang Dimodifikasi
- `src/components/admin/QrPreviewGridGram.tsx`
  - Enhanced `useEffect` hook untuk smart positioning (lines ~380-450)
  - Added `ensureVisibility()` function untuk auto-scroll
  - Improved positioning logic dengan viewport-aware calculations

## Testing Checklist
- [x] Dropdown muncul di bawah untuk item di paling atas (dalam 300px dari atas viewport)
- [x] Dropdown muncul di bawah ketika button berada di bagian atas halaman dengan cukup ruang
- [x] Dropdown flip ke atas hanya ketika benar-benar diperlukan (kurang dari 200px ruang di bawah)
- [x] Dropdown selalu terlihat di viewport tanpa perlu scroll manual
- [x] Positioning tetap akurat setelah window resize
- [x] Positioning tetap akurat saat scroll halaman
- [x] Tidak ada regresi pada fungsi download
- [x] UI tetap profesional dan konsisten dengan design system
- [x] Khusus untuk "Silver King Eid Al-Fitr Limited Edition #52" di paling atas, dropdown selalu muncul di bawah

## Impact Assessment
- **Risk Level**: LOW
  - Perubahan hanya pada positioning logic, tidak mengubah fungsi download
  - Tidak ada perubahan pada API atau data structure
  - Perubahan bersifat UI-only dan backward compatible

- **User Experience**: 
  - ✅ Significantly improved - dropdown sekarang selalu terlihat tanpa perlu scroll manual
  - ✅ Lebih profesional dan user-friendly
  - ✅ Consistent behavior di semua posisi scroll

## Rollback Plan
Jika terjadi masalah, rollback dengan:
```bash
git revert <commit-hash>
```

Atau restore file sebelumnya:
```bash
git checkout HEAD~1 -- src/components/admin/QrPreviewGridGram.tsx
```

## Deployment Notes
- Tidak ada migration atau environment variable yang diperlukan
- Tidak ada breaking changes
- Perubahan langsung aktif setelah deployment
- Tidak ada cache invalidation yang diperlukan

## Related Issues
- Fixes dropdown visibility issue untuk produk di bagian bawah halaman QR Preview Page 2
- Improves overall UX untuk download dropdown functionality
