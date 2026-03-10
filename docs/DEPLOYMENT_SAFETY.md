# Deployment Safety Checklist

Gunakan checklist ini sebelum dan setelah deploy ke production.

## Pre-deploy

- [ ] `npm run build` sukses (no type/lint errors)
- [ ] Environment production: `DATABASE_URL` dan (opsional) `NEXT_PUBLIC_R2_PUBLIC_URL` sudah diset
- [ ] Migrasi database sudah dijalankan di production: `npx prisma migrate deploy`
- [ ] Tidak ada secret/API key yang ter-commit

## Post-deploy

- [ ] Homepage dan halaman publik (products, distributor, about, contact) bisa diakses
- [ ] Admin login dan CRUD (Products, Distributor) berfungsi
- [ ] Tes responsive (mobile & desktop)
- [ ] Cek log/error di platform deploy (Railway/Render/dll)

## Rollback

Jika deploy bermasalah:

1. Revert commit terakhir: `git revert HEAD --no-edit && git push origin main`
2. Atau deploy ulang commit sebelumnya dari dashboard platform

## Commit & push (safe)

```bash
git add .
git status   # review changes
git commit -m "feat: Distributor layout dynamic centered + CMS reusable form"
git push origin main
```

Setelah push, pastikan production:
- Sudah jalankan `npx prisma migrate deploy` bila ada migrasi baru
- Env `DATABASE_URL` dan (opsional) `NEXT_PUBLIC_R2_PUBLIC_URL` sudah diset

---

## Last deployment note

- **Home edit video icon:** Edit button for hero video now always visible on Home when admin: portal after client mount, robust home path detection (`/`, `/en`, `/id`), `useIsAdmin` uses sessionStorage cache (same as Navbar) so icon shows immediately. No DB migration.
- **Video hero edit (all pages):** Replace-video modal without backdrop-blur (no conflict with page transition); `data-cms-modal-open` prevents blur when modal open. Hero edit overlays z-10002 on What We Do, Authenticity, Products, About.
