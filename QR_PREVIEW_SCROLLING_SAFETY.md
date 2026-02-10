# QR Preview (Page 1 & Page 2) - Scrolling/UI Deployment Safety

**Tanggal:** Februari 2026  
**Status:** ✅ SAFE FOR DEPLOYMENT

## Ringkasan

Perubahan ini meningkatkan kenyamanan admin di halaman **QR Preview** untuk:
- **Page 1**: `/admin/qr-preview`
- **Page 2**: `/admin/qr-preview/page2`

Fokus perubahan: **scrolling & layout** (UX), tanpa mengubah data/logic bisnis.

---

## Masalah Sebelumnya (UX)

- Terdapat potensi **double scroll** (scroll container bertumpuk) antara wrapper halaman dan komponen internal.
- Switcher Page 1 / Page 2 / Serticard ikut terscroll sehingga navigasi terasa kurang nyaman.
- Di Page 2, layout memaksa tinggi/overflow internal (table/grid) sehingga terasa “sempit” dan kurang natural.

---

## Perubahan yang Dilakukan

### 1) Single Scroll Container (Page 1 & Page 2)

- Wrapper halaman diubah menjadi:
  - `flex flex-col overflow-hidden`
  - konten utama memakai `flex-1 min-h-0 overflow-y-auto`
- Hasil: **satu area scroll** yang konsisten dan lebih mudah dipahami.

### 2) Switcher Tetap Terlihat

- Switcher dipindahkan ke bagian header non-scroll (di luar scroll container), sehingga:
  - selalu terlihat
  - lebih cepat untuk pindah Page 1 / Page 2 / Serticard

### 3) Page 2: Hapus Nested Vertical Scroll di Komponen

- `QrPreviewGridGram` tidak lagi membuat vertical scroll sendiri (menghindari nested scroll).
- Table hanya menggunakan `overflow-x-auto` untuk horizontal scroll.
- Grid tidak lagi `h-full overflow-y-auto` — mengikuti scroll container utama halaman.

### 4) Sticky Table Header (Page 2)

- Header tabel dibuat `sticky top-0` relatif ke scroll container utama, agar browsing list lebih nyaman.

### 5) Smart Dropdown Positioning (Page 2)

- Dropdown download sekarang **otomatis flip ke atas** jika tidak cukup ruang di bawah viewport.
- Deteksi posisi real-time saat scroll/resize untuk memastikan dropdown selalu terlihat.
- Styling lebih profesional:
  - Background lebih solid (`bg-black/95`) dengan backdrop blur yang lebih kuat.
  - Shadow lebih dalam untuk depth yang lebih baik.
  - Hover effects dengan animasi halus (motion.button dengan whileHover/whileTap).
  - Typography lebih jelas dengan spacing yang lebih baik.
  - Badge untuk nomor template dengan background subtle.
  - Scrollbar yang lebih baik untuk daftar template panjang.

---

## Dampak & Keamanan

- ✅ **Tidak ada perubahan pada database**
- ✅ **Tidak ada perubahan API**
- ✅ **Tidak ada perubahan alur download / QR generation**
- ✅ Perubahan hanya **presentational/UI** dan **scroll container**.

---

## Test Plan (Manual)

1. Buka `/admin/qr-preview`:
   - Scroll halaman, pastikan hanya **1 scrollbar** yang aktif.
   - Switcher tetap terlihat.
2. Buka `/admin/qr-preview/page2`:
   - Scroll list, pastikan smooth dan tidak “double scroll”.
   - Coba Table ↔ Grid view:
     - Table: header sticky saat scroll.
     - Grid: scroll mengikuti halaman, tidak ada scroll internal.
3. Pastikan dropdown download, modal enlarge, dan refresh tetap berjalan normal.
4. **Test dropdown positioning (Page 2)**:
   - Scroll ke bagian bawah halaman, klik "Download" pada produk terakhir.
   - Pastikan dropdown **muncul di atas** button (tidak terpotong).
   - Scroll ke bagian atas, klik "Download", pastikan dropdown muncul di bawah.
   - Pastikan semua opsi template terlihat dengan baik dan scrollable jika perlu.

---

## Rollback Plan

Rollback aman dilakukan dengan revert commit yang menyentuh:
- `src/app/admin/(protected)/qr-preview/page.tsx`
- `src/app/admin/(protected)/qr-preview/page2/page.tsx`
- `src/components/admin/QrPreviewGridGram.tsx`

