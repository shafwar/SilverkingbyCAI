# Safety Deployment: Serticard Preview Full Screen, Landscape & Fast Loading

## Tanggal
10 Februari 2026

## Ringkasan Perubahan
Perbaikan preview serticard: (1) tampilan full screen dan landscape agar visualisasi rapi untuk admin, (2) loading lebih cepat dengan tarik template dari R2, cache per variant, dan load template + QR secara paralel. Template ditampilkan segera setelah siap, lalu QR dan teks dilengkapi setelahnya.

## Fitur yang Diimplementasikan

### 1. Modal Full Screen
- **`Modal.tsx`**: Prop baru `fullScreen?: boolean`.
- Jika `fullScreen` true: modal memakai `max-w-[95vw] max-h-[90vh]`, konten scroll dengan `scrollbar-admin`.
- Serticard preview modal memakai `fullScreen` sehingga preview memakai hampir seluruh viewport.

### 2. Preview Landscape & Full Width
- Area preview dengan **aspect ratio 16:10** (landscape): lebar penuh, tinggi proporsional.
- Canvas serticard (portrait/landscape) di-fit di dalam kotak dengan **object-contain** sehingga tampilan selalu dalam bingkai landscape yang rapi.

### 3. Loading Cepat dari R2
- **Cache template per variant**: `templateImageCache[variant]` menyimpan gambar template yang sudah dimuat. Saat hanya adjustment/slider berubah, template tidak di-fetch ulang.
- **Parallel load**: Template dan QR diload bersamaan (`Promise.all`), waktu tunggu ≈ satu round-trip.
- **Tampil template dulu**: Begitu template selesai (dari R2/cache), canvas langsung menampilkan template; pesan "Memuat template dari R2..." lalu "Memuat QR..." (overlay kecil) saat QR masih loading.

### 4. State & UX
- State `templateDrawn`: memastikan canvas tampil setelah template selesai digambar (tanpa flash).
- State `loadingQr`: overlay "Memuat QR..." saat QR masih dimuat.
- Tombol Download bisa dipakai setelah template siap (tidak menunggu QR untuk enable).

## File yang Dimodifikasi

- `src/components/admin/Modal.tsx` — Prop `fullScreen`, layout besar + scroll.
- `src/components/admin/SerticardPreviewModal.tsx` — Full screen, landscape 16:10, cache template, parallel load, tampil template dulu lalu QR.

## Testing Checklist

- [ ] Buka preview serticard dari dropdown download.
- [ ] Modal tampil full screen (hampir seluruh layar).
- [ ] Area preview landscape (lebih lebar daripada tinggi).
- [ ] Pesan "Memuat template dari R2..." lalu template tampil; lalu "Memuat QR..." dan preview lengkap.
- [ ] Ubah slider: preview update cepat (template dari cache).
- [ ] Simpan Pengaturan dan Download PDF berfungsi normal.

## Rollback

Jika ada masalah:
1. Revert: `git revert HEAD --no-edit`
2. Push: `git push origin main`

Atau restore file dari commit sebelumnya: `Modal.tsx`, `SerticardPreviewModal.tsx`.

## Catatan

- Tidak ada perubahan database atau API.
- Hanya frontend: Modal + SerticardPreviewModal.
- Cache template di memori (per variant); tidak persist ke storage.
