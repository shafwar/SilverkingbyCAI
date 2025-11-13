# 🚀 Setup Guide untuk Tim - Silver King by CAI

Panduan lengkap untuk clone dan setup project ini di komputer Anda.

---

## 📋 Prerequisites (Yang Harus Diinstall Dulu)

Pastikan sudah terinstall:

1. **Node.js 18+** - [Download disini](https://nodejs.org/)
2. **MySQL 8.0+** atau **MariaDB** - [Download disini](https://dev.mysql.com/downloads/mysql/)
3. **Git** - [Download disini](https://git-scm.com/)
4. **npm** (otomatis terinstall dengan Node.js)

Cek versi:
```bash
node --version    # Minimal v18.0.0
npm --version     # Minimal v9.0.0
mysql --version   # Minimal v8.0.0
git --version     # Minimal v2.0.0
```

---

## 🔧 Langkah 1: Clone Repository

```bash
# Clone project dari GitHub
git clone https://github.com/shafwar/SilverkingbyCAI.git

# Masuk ke folder project
cd SilverkingbyCAI
```

---

## 📦 Langkah 2: Install Dependencies

Project ini menggunakan **500+ packages**. Jalankan:

```bash
npm install
```

**Tunggu sampai selesai** (sekitar 2-5 menit tergantung koneksi internet).

### ✅ Packages Utama yang Akan Terinstall:

#### **Framework & Core**
- `next@^14.2.0` - Next.js App Router
- `react@^18.3.0` - React library
- `react-dom@^18.3.0` - React DOM
- `typescript@^5.0.0` - TypeScript

#### **Styling & UI**
- `tailwindcss@^3.4.0` - CSS framework
- `@tailwindcss/postcss@^4.0.0` - Tailwind PostCSS plugin
- `postcss@^8.4.0` - CSS processor
- `autoprefixer@^10.4.0` - CSS prefixer
- `framer-motion@^11.0.0` - Animations
- `lucide-react@^0.447.0` - Icons
- `clsx@^2.1.1` - Class utilities
- `tailwind-merge@^2.6.0` - Merge Tailwind classes

#### **Database & ORM**
- `prisma@^6.19.0` - Prisma CLI
- `@prisma/client@^6.19.0` - Prisma Client
- `mysql2@^3.11.0` - MySQL driver

#### **Authentication**
- `next-auth@5.0.0-beta` - Authentication
- `bcrypt@^5.1.1` - Password hashing

#### **Utilities**
- `qrcode@^1.5.4` - QR code generator
- `axios@^1.13.2` - HTTP client
- `zod@^3.23.8` - Schema validation
- `react-hook-form@^7.54.2` - Form handling
- `@hookform/resolvers@^5.2.2` - Form validation

#### **Development Tools**
- `eslint@^8.57.1` - Code linting
- `prettier@^3.4.2` - Code formatting
- `ts-node@^10.9.2` - TypeScript executor
- `dotenv@^16.4.7` - Environment variables

---

## 🗄️ Langkah 3: Setup Database MySQL

### A. Buat Database

```bash
# Login ke MySQL
mysql -u root -p

# Buat database baru
CREATE DATABASE silverkingbycai;

# Keluar dari MySQL
EXIT;
```

### B. Konfigurasi Environment Variables

Buat file `.env` di root folder:

```bash
# Copy dari .env.example (jika ada)
cp .env.example .env

# Atau buat manual
touch .env
```

Isi file `.env` dengan:

```env
# Database - Sesuaikan dengan MySQL Anda
DATABASE_URL="mysql://root:PASSWORD_ANDA@localhost:3306/silverkingbycai"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="silverking-secret-change-in-production-2024"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**⚠️ PENTING:** Ganti `PASSWORD_ANDA` dengan password MySQL Anda!

---

## 🏗️ Langkah 4: Generate Prisma Client & Buat Tabel

```bash
# Generate Prisma Client
npx prisma generate

# Buat tabel di database (Pilih salah satu):

# Cara 1: Menggunakan script otomatis
node create-tables-safe.js

# Cara 2: Manual via phpMyAdmin
# - Buka phpMyAdmin
# - Pilih database silverkingbycai
# - Klik tab SQL
# - Copy paste isi file create_tables.sql
# - Klik Go
```

---

## 🌱 Langkah 5: Seed Database (Buat Admin User)

```bash
npm run prisma:seed
```

Ini akan membuat 2 user:
- **Admin:** `admin@silverking.com` / `admin123`
- **Staff:** `staff@silverking.com` / `staff123`

---

## 🚀 Langkah 6: Jalankan Development Server

```bash
npm run dev
```

Buka browser: **http://localhost:3000**

---

## ✅ Verifikasi Setup Berhasil

Cek hal-hal berikut:

1. ✓ Website buka tanpa error
2. ✓ Bisa login ke `/dashboard/login`
3. ✓ Bisa buat produk baru
4. ✓ QR code ter-generate otomatis
5. ✓ Bisa verify produk

---

## 📁 Struktur Project

```
SilverkingbyCAI/
├── src/
│   ├── app/                    # Pages & Routes
│   │   ├── page.tsx           # Homepage
│   │   ├── about/             # About page
│   │   ├── verify/            # QR verification
│   │   ├── dashboard/         # Admin dashboard
│   │   └── api/               # API routes
│   ├── components/            # Reusable components
│   ├── lib/                   # Auth & Prisma
│   ├── utils/                 # Utilities
│   └── styles/                # Global CSS
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
├── package.json               # Dependencies
└── .env                       # Environment variables
```

---

## 🔄 Update Code dari GitHub

Jika ada update di GitHub:

```bash
# Pull changes
git pull origin main

# Install dependencies baru (jika ada)
npm install

# Regenerate Prisma Client (jika schema berubah)
npx prisma generate

# Restart server
npm run dev
```

---

## 🛠️ Commands Berguna

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build production
npm start                # Start production server

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:seed      # Seed database
npm run prisma:studio    # Open database GUI
node check-tables.js     # Check database connection

# Code Quality
npm run lint             # Run linting
npm run format           # Format code
```

---

## 🐛 Troubleshooting

### Error: Cannot connect to database
**Solusi:**
1. Pastikan MySQL running: `mysql.server start`
2. Cek password di `.env` sudah benar
3. Cek database `silverkingbycai` sudah dibuat

### Error: Port 3000 already in use
**Solusi:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Error: Prisma Client not generated
**Solusi:**
```bash
npx prisma generate
npm run dev
```

### Error: Tables not found
**Solusi:**
```bash
node create-tables-safe.js
# atau via phpMyAdmin import create_tables.sql
```

### Error: Module not found
**Solusi:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Catatan Penting

1. **Jangan commit file `.env`** - Sudah ada di `.gitignore`
2. **Database dev.db (SQLite)** - Ignore saja, pakai MySQL
3. **File test-db.js** - Helper untuk cek koneksi database
4. **Dokumentasi lengkap** - Lihat README.md dan SETUP.md

---

## 🎯 Fitur Utama

- ✅ QR Code auto-generate saat buat produk
- ✅ Product verification system
- ✅ Admin dashboard dengan statistics
- ✅ CRUD products
- ✅ Role-based access (Admin/Staff)
- ✅ Luxury design (black, gold, silver)
- ✅ Responsive design
- ✅ Secure authentication

---

## 👥 Tim Development

Jika ada masalah atau pertanyaan:
1. Cek dokumentasi di `README.md`
2. Cek troubleshooting di `SETUP.md`
3. Tanya di grup tim

---

## 📊 Tech Stack Summary

| Category | Technology |
|----------|-----------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Backend | Next.js API Routes |
| Database | MySQL, Prisma ORM |
| Auth | NextAuth.js, bcrypt |
| QR Code | qrcode library |
| Validation | Zod, React Hook Form |

---

## 🚀 Quick Start Checklist

Untuk memastikan tidak ada yang terlewat:

- [ ] Clone repository
- [ ] Install Node.js & MySQL
- [ ] Run `npm install`
- [ ] Buat database `silverkingbycai`
- [ ] Buat file `.env` dan konfigurasi
- [ ] Run `npx prisma generate`
- [ ] Run `node create-tables-safe.js`
- [ ] Run `npm run prisma:seed`
- [ ] Run `npm run dev`
- [ ] Buka http://localhost:3000
- [ ] Login dengan `admin@silverking.com` / `admin123`
- [ ] Buat produk pertama
- [ ] Test QR verification

---

**Selamat Coding! 🎉**

*"The Art of Precious Metal Perfection"*

---

**Last Updated:** November 13, 2025  
**Version:** 1.0.0  
**Repository:** https://github.com/shafwar/SilverkingbyCAI

