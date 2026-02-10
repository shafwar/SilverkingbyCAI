# Safety Deployment: Preview Serticard Tampil Lebih Cepat

## Tanggal
10 Februari 2026

## Ringkasan Perubahan
Fokus hanya pada kecepatan tampilan preview serticard: (1) prefetch template saat halaman load (bukan hanya saat dropdown), (2) hapus delay 80ms saat modal buka, (3) template-proxy stream response dari R2 ke client agar byte pertama sampai lebih cepat. Tidak mengubah alur bisnis, auth, atau fitur lain.

## Perubahan

### 1. Prefetch saat halaman load (QrPreviewGridGram)
- Saat komponen mount (admin buka halaman QR preview), langsung prefetch template "01", lalu 03, 05, … dengan jeda 50ms.
- Tetap prefetch saat dropdown dibuka sebagai cadangan (dengan jeda 30ms per variant).
- Dampak: saat admin klik Preview, template sering sudah di cache client → tampil cepat.

### 2. Tanpa delay saat modal buka (SerticardPreviewModal)
- `setTimeout(renderPreview, 80)` diubah menjadi `setTimeout(renderPreview, 0)`.
- Dampak: tidak ada tambahan 80ms sebelum mulai load/render.

### 3. Stream response dari R2 (template-proxy)
- Pada cache miss: response dari R2 di-stream ke client (`response.body`) sehingga byte pertama sampai lebih cepat.
- Cache diisi di background dari `response.clone().arrayBuffer()` agar request berikutnya tetap dilayani dari cache.
- Dampak: request pertama terasa lebih cepat; request berikutnya tetap dari cache (buffer).

## File yang Dimodifikasi

- `src/components/admin/QrPreviewGridGram.tsx` — Prefetch on mount + prefetch on dropdown dengan cleanup
- `src/components/admin/SerticardPreviewModal.tsx` — Debounce 80 → 0
- `src/app/api/admin/template-proxy/route.ts` — Stream R2 body ke client, cache di background

## Testing Checklist

- [ ] Buka halaman admin QR preview (page2): di network tab terlihat request ke template-proxy untuk 01, 03, … (prefetch).
- [ ] Buka dropdown Download, klik Preview Serticard A: preview tampil secepat mungkin.
- [ ] Simpan Pengaturan dan Download PDF tetap berfungsi.
- [ ] Tidak ada perubahan perilaku selain kecepatan tampilan preview.

## Rollback

- `git revert HEAD --no-edit` lalu `git push origin main`.
- Atau restore ketiga file di atas dari commit sebelumnya.

## Catatan

- Hanya menyentuh path preview dan template-proxy; tidak mengubah database, auth, atau API lain.
