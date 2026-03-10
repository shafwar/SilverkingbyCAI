# Enterprise CMS – Bilingual Content & Translation

## Overview

Sistem CMS untuk konten halaman dengan **dua bahasa (ID ↔ EN)**, deteksi bahasa otomatis, dan terjemahan berbasis AI (OpenAI) dengan nada profesional korporat.

## Arsitektur

### 1. Database (`ContentEntry`)

- **pageName**: Halaman (e.g. `what-we-do`, `authenticity`, `products`, `distributor`, `about`)
- **sectionName**: Bagian (e.g. `hero`, `intro`, `features`)
- **title**: JSON `{ id: string, en: string }`
- **description**: JSON `{ id: string, en: string }` (opsional)
- **translationMeta**: JSON `{ titleIdAuto, titleEnAuto, descriptionIdAuto, descriptionEnAuto }` – menandai field yang auto-generated (bisa di-overwrite oleh Regenerate)

Satu entri unik per `(pageName, sectionName)`.

### 2. Translation Service Layer (`src/lib/translation/`)

- **detectLanguage(text)**: Deteksi bahasa (heuristic saja, tanpa API eksternal)
- **translateToOtherLanguage(text, fromLang)**: Tanpa provider → throw; admin isi kedua bahasa manual
- **generateBilingual(...)**: Tanpa provider → hanya isi sisi primary, sisi lain kosong; admin isi manual
- **regenerateTranslation(...)**: Tanpa provider → throw

**Mode saat ini: manual only (no AI, no API key).**

- Admin mengisi **Title (ID)**, **Title (EN)**, **Description (ID)**, **Description (EN)** sendiri di form.
- Tidak ada OpenAI / API key. Jika nanti ingin pakai auto-translate, bisa tambah provider di `translate-openai.ts` (atau modul terpisah) dan set `isTranslationAvailable()` mengembalikan `true`.

**Aturan:**

- `translationMeta` tetap dipakai jika nanti ada provider (untuk bedakan auto vs manual).
- Tanpa provider, tombol "Auto-translate on save" dan "Regenerate Translation" disembunyikan di admin.

### 3. API

| Endpoint | Method | Auth | Deskripsi |
|----------|--------|------|-----------|
| `/api/content?page=...&locale=id|en` | GET | Public | Ambil konten per halaman + locale |
| `/api/admin/content` | GET | Admin | Daftar semua entri |
| `/api/admin/content` | POST | Admin | Buat entri (body: pageName, sectionName, title, description, autoTranslate) |
| `/api/admin/content/[id]` | GET/PATCH/DELETE | Admin | Get/update/delete entri |
| `/api/admin/content/translate` | POST | Admin | Terjemah satu teks (body: text, fromLang) |

### 4. Admin Panel

- **Menu**: Admin → **Content**
- **Fitur**: Tambah entri, edit, hapus. Input title ID/EN dan description ID/EN.
- **Auto-translate on save**: Jika dicentang dan `OPENAI_API_KEY` ada, sistem deteksi bahasa dan generate pasangan.
- **Regenerate Translation**: Tombol per field (Title ID→EN, Title EN→ID) untuk generate ulang terjemahan.

### 5. Frontend

- **Fetch**: `GET /api/content?page=about&locale=id` (atau `en`).
- **Hook**: `useContent(page, locale)` di `src/hooks/useContent.ts` – return `{ data, loading, error, refetch }`.
- **Helper**: `getSection(data, sectionName)` untuk ambil satu section dari `data.sections`.
- **Fallback**: Jika tidak ada konten dari API, halaman bisa pakai fallback (e.g. key dari `next-intl` atau teks default).

## Environment

- Tidak ada env khusus untuk terjemahan. Konten bilingual diisi **manual** oleh admin (Title ID/EN, Description ID/EN). Jika nanti ditambah provider (mis. OpenAI), set env yang sesuai dan implementasi di `src/lib/translation/translate-openai.ts`.

## Migrasi

```bash
npx prisma migrate deploy
```

Migration: `20260218000000_add_content_entry/migration.sql`

## Media & CDN (rencana lanjutan)

- **R2**: Tetap dipakai untuk media (gambar/video); tidak diubah oleh fitur translation.
- **Background queue (BullMQ + Redis)** dan **video compression (ffmpeg)** bisa ditambah terpisah untuk media pipeline.
- **CDN**: Cache-Control, Brotli, immutable assets – konfigurasi di level deployment (e.g. Cloudflare).

## Keamanan

- Hanya role **ADMIN** yang bisa akses `/api/admin/content` dan `/api/admin/content/translate`.
- Rate limit pada endpoint translate disarankan di production untuk mencegah abuse (bisa ditambah di middleware atau di route).
