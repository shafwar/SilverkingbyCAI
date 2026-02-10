# Safety Deployment: Railway Build Pakai Docker (Fix ghcr.io Connection Reset)

## Tanggal
10 Februari 2026

## Masalah
Deploy Railway gagal dengan:
```
ERROR: failed to build: failed to solve: failed to fetch anonymous token: 
Get "https://ghcr.io/token?scope=repository%3Arailwayapp%2Frailpack-runtime%3Apull&service=ghcr.io": 
read tcp ... read: connection reset by peer
```
Railway memakai **Railpack** yang menarik runtime dari **ghcr.io** (GitHub Container Registry). Koneksi ke ghcr.io reset (network/region), sehingga build gagal.

## Solusi
Menggunakan **Docker builder** alih-alih Railpack. Bila ada **Dockerfile** di root repo, Railway memakai Docker untuk build dan tidak lagi menarik image dari ghcr.io.

## Perubahan

### 1. Dockerfile (baru)
- **Base**: `node:20-bookworm-slim`
- **System deps**: libcairo2-dev, libpango1.0-dev, libjpeg-dev, libgif-dev, librsvg2-dev (sama seperti nixpacks.toml, untuk canvas)
- **Install**: `npm ci --legacy-peer-deps`
- **Prisma**: `prisma generate`
- **Build**: `npm run build`
- **Start**: `node -r dotenv/config scripts/migrate-and-start.js` (sama seperti `npm start`)

### 2. .dockerignore (baru)
- Mengurangi ukuran context dan menghindari menimpa `node_modules` di dalam image
- Mengabaikan: node_modules, .next, .git, .env*, *.md (kecuali README), dll.

### 3. nixpacks.toml
- Tetap ada; dipakai hanya jika Railway tidak mendeteksi Dockerfile (fallback).

## Alur Build (setelah fix)
1. Railway mendeteksi **Dockerfile** di root → memakai **Docker** builder.
2. Build image dari Dockerfile (base image dari Docker Hub, bukan ghcr.io).
3. Tidak ada request ke ghcr.io → tidak kena "connection reset by peer".
4. Run: migrate DB lalu `next start` (sama seperti sebelumnya).

## File yang Ditambah/Diubah
- `Dockerfile` (baru)
- `.dockerignore` (baru)
- `RAILWAY_DOCKER_BUILD_SAFETY.md` (dokumen ini)

## Testing Checklist
- [ ] Push ke main, tunggu deploy Railway.
- [ ] Build sukses (tanpa error ghcr.io).
- [ ] Aplikasi start: migrate jalan, Next.js listen di PORT.
- [ ] Fitur utama (login, QR preview, download, admin) berjalan normal.

## Rollback
- Hapus atau rename `Dockerfile` (mis. `Dockerfile.railway.bak`) lalu push.
- Railway akan kembali pakai Railpack; jika koneksi ghcr.io sudah normal, build bisa jalan lagi.

## Catatan
- Perilaku aplikasi dan env (DATABASE_URL, R2, dll.) tidak berubah; hanya cara build yang pakai Docker.
- `npm start` / migrate-and-start.js tetap sama; flow deploy (migrate → start) tetap sama.
