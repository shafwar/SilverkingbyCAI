# Safety Deployment: Serticard Template Load Cepat & Responsif

## Tanggal
10 Februari 2026

## Ringkasan Perubahan
Mempercepat pemuatan template serticard dengan: (1) cache in-memory di server (template-proxy) agar request ke template yang sama tidak hit R2 berulang, (2) prefetch template di client saat dropdown download dibuka sehingga saat admin klik Preview template sudah/sedang dimuat.

## Fitur yang Diimplementasikan

### 1. Server: In-Memory Cache (template-proxy)
- **File**: `src/app/api/admin/template-proxy/route.ts`
- **Cache**: `Map<key, { buffer, contentType }>` dengan key `"front-01"`, `"front-03"`, dll.
- **Alur**: Request pertama fetch dari R2 (atau local), simpan ke cache, return. Request berikutnya untuk key yang sama langsung return dari cache.
- **Dampak**: Setelah template pernah dimuat sekali, request berikutnya sangat cepat (tanpa network ke R2).

### 2. Client: Prefetch saat Dropdown Dibuka
- **File**: `src/components/admin/QrPreviewGridGram.tsx`
- **Trigger**: Saat `downloadDropdownOpen` berubah dari null ke batchId (dropdown terbuka).
- **Aksi**: Panggil `prefetchSerticardTemplate("01")` segera; lalu prefetch variant 03, 05, … (B–I) dengan jeda 80 ms.
- **Dampak**: Saat admin klik "Preview" untuk salah satu template, gambar sering sudah di cache client → preview tampil cepat.

### 3. Export Prefetch
- **File**: `src/components/admin/SerticardPreviewModal.tsx`
- **Export**: `prefetchSerticardTemplate(variant: string)` dan `templateImageCache`.
- **Fungsi**: Load gambar template ke cache client (untuk dipakai saat modal preview dibuka).

## File yang Dimodifikasi

- `src/app/api/admin/template-proxy/route.ts` — In-memory cache per template+variant
- `src/components/admin/SerticardPreviewModal.tsx` — Export `prefetchSerticardTemplate` dan cache
- `src/components/admin/QrPreviewGridGram.tsx` — Panggil prefetch saat dropdown open

## Testing Checklist

- [ ] Buka halaman QR preview (page2), klik Download pada satu batch.
- [ ] Dropdown terbuka; (di network) request ke template-proxy untuk 01, lalu 03, … boleh terlihat (prefetch).
- [ ] Klik "Preview" untuk Serticard A: preview tampil secepat mungkin (template dari cache jika prefetch selesai).
- [ ] Buka lagi dropdown dan Preview template lain: response proxy cepat jika template sama pernah dimuat (server cache).
- [ ] Simpan Pengaturan & Download PDF tetap berfungsi.

## Rollback

- Revert commit: `git revert HEAD --no-edit` lalu `git push origin main`.
- Atau restore tiga file di atas dari commit sebelumnya.

## Catatan

- Cache server in-memory: hilang saat proses restart; request pertama setelah restart tetap hit R2/local.
- Prefetch hanya dipanggil saat dropdown dibuka; tidak mengubah alur auth atau data.
