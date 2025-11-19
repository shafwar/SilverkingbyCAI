# R2 Static Assets Sync

Utility functions untuk meng-upload static assets dari folder `/public` ke Cloudflare R2.

## 📦 Setup

Pastikan environment variables sudah di-set di `.env.local`:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=silverking-assets
R2_PUBLIC_URL=https://assets.cahayasilverking.id
```

## 🚀 Usage

### 1. Sync via CLI Script

**Sync semua file dari `/public` (skip jika sudah ada):**

```bash
npm run r2:sync
```

**Force overwrite semua file:**

```bash
npm run r2:sync:force
```

**Sync folder tertentu saja:**

```bash
npm run r2:sync -- --folders images,videos
```

### 2. Import dan Gunakan di Code

#### Sync Seluruh Public Directory

```typescript
import { syncPublicToR2 } from "@/lib/r2-static-sync";

// Sync semua file (skip jika sudah ada)
const summary = await syncPublicToR2({
  skipIfExists: true,
  onProgress: (current, total, file) => {
    console.log(`[${current}/${total}] ${file}`);
  },
});

console.log(`Uploaded: ${summary.uploaded}, Skipped: ${summary.skipped}`);
```

#### Upload Folder Tertentu

```typescript
import { uploadPublicFolders } from "@/lib/r2-static-sync";

// Upload hanya folder images dan videos
const summary = await uploadPublicFolders(["images", "videos"], {
  skipIfExists: true,
});
```

#### Upload Single File

```typescript
import { uploadPublicFile } from "@/lib/r2-static-sync";

// Upload file spesifik
const result = await uploadPublicFile("images/logo.png", {
  skipIfExists: true,
});

console.log("URL:", result.url);
```

#### Upload Directory

```typescript
import { uploadDirectory } from "@/lib/r2-static-sync";

// Upload directory dengan path relatif dari public
const results = await uploadDirectory("videos/hero", {
  skipIfExists: true,
  onProgress: (current, total, file) => {
    console.log(`Uploading ${file}...`);
  },
});
```

#### List Files di Public

```typescript
import { listPublicFiles } from "@/lib/r2-static-sync";

// Get semua file paths
const files = listPublicFiles();
console.log("Files:", files);
// Output: ['images/logo.png', 'videos/hero/background.mp4', ...]
```

## 📝 API Reference

### `syncPublicToR2(options?)`

Sync seluruh folder `/public` ke R2.

**Options:**

- `skipIfExists?: boolean` - Skip file yang sudah ada (default: false)
- `overwrite?: boolean` - Force overwrite file yang sudah ada (default: false)
- `onProgress?: (current, total, file) => void` - Callback untuk progress

**Returns:**

```typescript
{
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
  results: Array<{
    file: string;
    url: string;
    skipped: boolean;
    error?: string;
  }>;
}
```

### `uploadPublicFolders(folders, options?)`

Upload folder tertentu dari `/public`.

**Parameters:**

- `folders: string[]` - Array of folder names (e.g., `['images', 'videos/hero']`)

**Options:** Same as `syncPublicToR2`

### `uploadPublicFile(relativePath, options?)`

Upload single file dari `/public`.

**Parameters:**

- `relativePath: string` - Path relatif dari public (e.g., `'images/logo.png'`)

**Returns:**

```typescript
{
  url: string;
  skipped: boolean;
}
```

### `uploadDirectory(dirPath, options?)`

Upload directory secara recursive.

**Parameters:**

- `dirPath: string` - Path directory (relatif dari public atau absolute)

### `listPublicFiles()`

Get list semua file di `/public` directory.

**Returns:** `string[]` - Array of relative file paths

## 🔄 Integration dengan Build Process

Anda bisa menambahkan sync ke build process di `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && npm run r2:sync && next build",
    "postbuild": "npm run r2:sync"
  }
}
```

## 🎯 Use Cases

### 1. Initial Migration

```bash
# Upload semua file untuk pertama kali
npm run r2:sync:force
```

### 2. Update Specific Assets

```typescript
// Update hanya gambar baru
await uploadPublicFolders(["images"], { overwrite: false });
```

### 3. CI/CD Pipeline

```bash
# Di CI/CD, sync setelah build
npm run build
npm run r2:sync
```

## ⚠️ Notes

- File paths di R2 akan sama dengan struktur di `/public`
- Contoh: `public/images/logo.png` → R2 key: `images/logo.png`
- Public URL akan menggunakan `R2_PUBLIC_URL` dari env
- Jika `R2_PUBLIC_URL` tidak di-set, akan fallback ke R2.dev subdomain
