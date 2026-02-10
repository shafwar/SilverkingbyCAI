# Safety Deployment: Dockerfile Prisma Schema Fix (Railway Build)

## Tanggal
10 Februari 2026

## Masalah
Build Docker di Railway gagal pada `RUN npm ci --legacy-peer-deps`:
```
Error: Could not find Prisma Schema that is required for this command.
prisma/schema.prisma: file not found
```
Penyebab: script **postinstall** di package.json menjalankan `prisma generate`, sementara folder **prisma** belum di-copy ke image (hanya package.json & package-lock.json yang di-copy saat itu).

## Solusi
Copy folder **prisma** ke image **sebelum** menjalankan `npm ci`, agar saat postinstall memanggil `prisma generate`, file `prisma/schema.prisma` sudah ada.

## Perubahan (Dockerfile)
- Sebelum: `COPY package.json ...` → `RUN npm ci` → `COPY prisma` → `RUN prisma generate` → `COPY . .`
- Sesudah: `COPY package.json ...` → **`COPY prisma ./prisma`** → `RUN npm ci` → `COPY . .` → `RUN npm run build`

Tidak ada perubahan logic aplikasi atau env; hanya urutan step di Dockerfile.

## File yang Dimodifikasi
- `Dockerfile` — penambahan `COPY prisma ./prisma` sebelum `RUN npm ci --legacy-peer-deps`

## Testing
- [ ] Push ke main, tunggu build Railway.
- [ ] Build sukses (npm ci dan prisma generate jalan).
- [ ] Aplikasi start dan berjalan normal.

## Rollback
Revert commit ini dan push; atau kembalikan Dockerfile ke urutan sebelumnya (copy prisma setelah npm ci, lalu jalankan npx prisma generate terpisah).
