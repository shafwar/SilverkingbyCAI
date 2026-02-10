# Safety Deployment: Preview Serticard Lebih Cepat dari R2

## Tanggal
10 Februari 2026

## Ringkasan Perubahan
Agar tampilan preview serticard lebih cepat dan responsif: (1) **Load langsung dari R2** bila `NEXT_PUBLIC_R2_PUBLIC_URL` diset (satu hop, tanpa lewat proxy), (2) **Fallback ke proxy** jika direct R2 gagal (CORS/error), (3) **Prefetch template 01 saat halaman load** sehingga saat admin buka dropdown/klik Preview, template sering sudah di cache.

## Fitur yang Diimplementasikan

### 1. Direct R2 URL (paling cepat)
- **File**: `src/components/admin/SerticardPreviewModal.tsx`
- **Helper**: `getTemplateUrl(variant, useProxy)` — bila `NEXT_PUBLIC_R2_PUBLIC_URL` ada dan variant bukan `custom`, return URL langsung ke R2 (`${base}/${r2Key}`). Kalau tidak, return URL proxy.
- **Dampak**: Satu request langsung browser → R2 (CDN), tanpa lewat Next.js server. Fetch dan rendering lebih cepat.

### 2. Fallback ke proxy
- Di `getOrLoadTemplate` dan `prefetchSerticardTemplate`: load pakai direct URL dulu; jika `onerror` (mis. CORS), ganti `img.src` ke URL proxy.
- **Dampak**: Jika R2 belum set CORS atau env belum diset, tetap jalan lewat proxy.

### 3. Prefetch saat halaman load
- **File**: `src/components/admin/QrPreviewGridGram.tsx`
- **Effect**: Saat komponen mount, panggil `prefetchSerticardTemplate("01")` sekali.
- **Dampak**: Template Serticard A sudah di-prefetch sebelum admin buka dropdown. Klik Preview → template sering sudah di cache → tampil cepat.

### 4. Prefetch saat dropdown (tetap)
- Saat dropdown download dibuka, prefetch 01 + 03, 05, … (B–I) dengan jeda 60 ms.
- Tetap memakai direct R2 URL jika env diset.

## Konfigurasi (penting untuk kecepatan maksimal)

- **Production**: Set env **`NEXT_PUBLIC_R2_PUBLIC_URL`** sama dengan base URL R2 publik (mis. `https://assets.cahayasilverking.id`), tanpa trailing slash.
- **R2 CORS**: Bucket R2 harus mengizinkan origin domain Anda (atau `*`) agar load langsung dari browser tidak kena CORS. Jika CORS belum diset, sistem otomatis fallback ke proxy.
- **Tanpa env**: Jika `NEXT_PUBLIC_R2_PUBLIC_URL` tidak diset, semua load lewat proxy (tetap pakai cache server + prefetch).

## File yang Dimodifikasi

- `src/components/admin/SerticardPreviewModal.tsx` — getTemplateUrl (direct R2 + fallback proxy), getOrLoadTemplate & prefetch pakai URL tersebut
- `src/components/admin/QrPreviewGridGram.tsx` — prefetch template "01" on mount; prefetch saat dropdown (jeda 60 ms)

## Testing Checklist

- [ ] Set `NEXT_PUBLIC_R2_PUBLIC_URL` (sama dengan R2_PUBLIC_URL), rebuild, buka halaman QR preview.
- [ ] Buka dropdown Download → klik Preview Serticard A: preview tampil secepat mungkin (direct R2 atau dari cache).
- [ ] Jika direct R2 gagal (CORS): pastikan fallback ke proxy dan preview tetap tampil.
- [ ] Tanpa `NEXT_PUBLIC_R2_PUBLIC_URL`: preview tetap jalan lewat proxy.
- [ ] Simpan Pengaturan & Download PDF tetap berfungsi.

## Rollback

- Revert commit lalu `git push origin main`.
- Atau restore dua file di atas dari commit sebelumnya.

## Catatan

- Tidak ada perubahan database atau API backend.
- Hanya frontend: URL source template (direct vs proxy) dan timing prefetch.
