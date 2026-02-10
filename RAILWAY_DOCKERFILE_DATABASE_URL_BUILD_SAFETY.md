# Safety Deployment: DATABASE_URL saat Build Docker (Railway)

## Tanggal
10 Februari 2026

## Masalah
Build Docker di Railway gagal pada `RUN npm run build`:
```
PrismaConfigEnvError: Missing required environment variable: DATABASE_URL
```
`npm run build` menjalankan `prisma generate && next build`. File **prisma.config.ts** memakai `env("DATABASE_URL")`, sehingga Prisma membutuhkan variabel ini saat load config. Di fase build, env hanya dari Dockerfile (Railway menyuntikkan env saat **runtime**, bukan saat build).

## Solusi
Menetapkan **dummy DATABASE_URL** di Dockerfile hanya untuk fase **build**, agar prisma generate bisa load config dan generate client. Nilai ini **tidak dipakai** untuk koneksi (prisma generate tidak connect ke DB). Saat **runtime**, Railway meng-inject **DATABASE_URL** asli dari dashboard, sehingga aplikasi memakai database yang benar.

## Perubahan (Dockerfile)
- Sebelum: `ENV NODE_ENV=production` → `RUN npm run build`
- Sesudah: `ENV NODE_ENV=production` + **`ENV DATABASE_URL="mysql://build:build@localhost:3306/build"`** → `RUN npm run build`

Dummy URL hanya untuk memenuhi validasi config; tidak ada koneksi ke DB saat build.

## Keamanan & runtime
- **Build time**: image dibangun dengan dummy DATABASE_URL; tidak ada akses ke DB production.
- **Runtime**: Railway set variabel **DATABASE_URL** di service → nilai dari Dockerfile di-override, aplikasi pakai database production.

## File yang Dimodifikasi
- `Dockerfile` — penambahan `ENV DATABASE_URL="mysql://build:build@localhost:3306/build"` sebelum `RUN npm run build`

## Testing
- [ ] Push ke main, tunggu build Railway.
- [ ] Build sukses (prisma generate & next build jalan).
- [ ] Setelah deploy, pastikan DATABASE_URL di Railway sudah di-set.
- [ ] Aplikasi bisa connect ke DB (migrate, login, data) normal.

## Rollback
Revert commit ini; build akan gagal lagi sampai ada solusi lain (mis. build-arg atau skip prisma config saat build).
