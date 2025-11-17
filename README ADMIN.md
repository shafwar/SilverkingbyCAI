# Silver King by CAI – Anti-Counterfeit Platform

Full-stack QR authentication suite built with **Next.js 14 (App Router)**, **Prisma ORM + MySQL**, **NextAuth**, **Tailwind CSS**, **Framer Motion**, and a QR engine that stores assets locally with optional Cloudflare R2 support.

## Features

- **Secure Admin access** (NextAuth credentials) with role gate.
- **Product lifecycle**
  - Create/update/delete bars with auto QR generation.
  - Serial change automatically regenerates QR and cleans old assets.
  - QR grid preview & scan counters.
- **QR Engine**
  - Generates PNG via `qrcode`.
  - Saves under `/public/qr` (local-first) or uploads to R2 if env vars exist.
- **Verification**
  - Public `/api/verify/[serial]` endpoint increments scan count and logs IP/UA.
  - Rich verification page for customers.
- **Analytics**
  - Dashboard cards, animated chart, premium package highlight.
  - Scan log pages + CSV/Excel export (`/api/export/excel` powered by `xlsx`).
- **Seed data**
  - Admin user `admin@silverking.com / admin123`.
  - Six preloaded SK bars with QR PNGs under `public/qr`.

## Project Structure

```
src/
  app/
    admin/(auth)/login
    admin/(protected)/
      page.tsx          # Dashboard
      products/
      qr-preview/
      logs/
      export/
    api/
      products/create|update|delete|list
      verify/[serialCode]
      scan-logs
      admin/overview
      export/excel
  components/admin/…     # Reusable admin UI + forms
  lib/
    auth.ts              # NextAuth config
    prisma.ts
    qr.ts                # QR generator + R2 uploader
    validators/product.ts
```

## Environment

Copy `env.example` → `.env.local` and edit:

```env
DATABASE_URL="mysql://user:password@localhost:3306/silverking"
NEXTAUTH_SECRET="replace-with-strong-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_ENABLE_DASHBOARD_MOCKS=false

# Optional Cloudflare R2 (leave blank for local storage)
R2_ENDPOINT=""
R2_PUBLIC_URL=""
R2_BUCKET=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
```

**Note:** All admin dashboard components now use **real-time data** from the database. The `NEXT_PUBLIC_ENABLE_DASHBOARD_MOCKS` flag is set to `false` by default. All mock data has been removed and replaced with live API calls.

If R2 variables are empty the QR engine automatically stays in local mode.

## Setup

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

The seed prints admin credentials and generates initial QR PNG files under `public/qr`.

## Commands

- `npm run dev` – local development
- `npm run build` / `npm start` – production build
- `npx prisma studio` – inspect DB
- `npm run prisma:seed` – reseed data

## Deployment Notes

- Ensure `DATABASE_URL` uses a managed MySQL instance.
- Set `NEXTAUTH_URL` to the public domain.
- To store QR images in Cloudflare R2 supply the R2 credentials + bucket + public URL. Otherwise the system persists to `/public/qr`.
- Protect admin routes over HTTPS only.
