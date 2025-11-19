# Railway Deployment Configuration

## 🚀 Environment Variables untuk Production

Setelah deploy ke Railway, pastikan semua environment variables berikut sudah di-set dengan benar:

### Required Variables

```bash
# Database (auto-generated oleh Railway MySQL service)
DATABASE_URL="mysql://root:password@mysql.railway.internal:3306/silverkingbycai"

# Authentication
NEXTAUTH_SECRET="your-strong-secret-key-here"
NEXTAUTH_URL="https://www.cahayasilverking.id"

# Application URL (PENTING: untuk QR code generation)
NEXT_PUBLIC_APP_URL="https://www.cahayasilverking.id"

# Environment
NODE_ENV="production"
RAILWAY_ENVIRONMENT="true"

# Dashboard
NEXT_PUBLIC_ENABLE_DASHBOARD_MOCKS="false"
```

### Optional Variables (Cloudflare R2)

Jika ingin menggunakan Cloudflare R2 untuk QR storage:

```bash
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
R2_PUBLIC_URL="https://your-public-r2-domain.com"
R2_BUCKET="your-bucket-name"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
```

## 📋 Setup via Railway CLI

### 1. Install Railway CLI

```bash
npm i -g @railway/cli
```

### 2. Login ke Railway

```bash
railway login
```

### 3. Link Project

```bash
railway link
```

### 4. Setup Variables

Gunakan script `railway-setup.sh`:

```bash
chmod +x railway-setup.sh
./railway-setup.sh
```

Atau set manual:

```bash
# Switch ke service yang benar
railway service silverkingbycai

# Set variables
railway variables set NEXTAUTH_URL="https://www.cahayasilverking.id"
railway variables set NEXT_PUBLIC_APP_URL="https://www.cahayasilverking.id"
railway variables set NEXTAUTH_SECRET="your-strong-secret"
railway variables set NODE_ENV="production"
railway variables set RAILWAY_ENVIRONMENT="true"
railway variables set NEXT_PUBLIC_ENABLE_DASHBOARD_MOCKS="false"
```

## 🔗 Domain Configuration

### Custom Domain Setup

1. Di Railway Dashboard, buka project Anda
2. Pilih service (Next.js app)
3. Pergi ke **Settings** → **Domains**
4. Tambahkan custom domain: `www.cahayasilverking.id`
5. Railway akan memberikan DNS records yang perlu ditambahkan ke domain provider

### DNS Records

Tambahkan records berikut di domain provider:

```
Type: CNAME
Name: www
Value: [Railway provided CNAME]
```

Atau jika menggunakan A record:

```
Type: A
Name: www
Value: [Railway provided IP]
```

## ✅ Verifikasi Setup

Setelah deploy, verifikasi:

1. **QR Code URLs**: Semua QR code harus mengarah ke `https://www.cahayasilverking.id/verify/[serialCode]`
2. **API Endpoints**: Test endpoint `/api/verify/[serialCode]`
3. **Admin Panel**: Akses `https://www.cahayasilverking.id/admin`
4. **Environment Variables**: Pastikan semua variables sudah ter-set di Railway dashboard

## 🔍 Troubleshooting

### QR Code masih mengarah ke Railway URL

1. Check `NEXT_PUBLIC_APP_URL` di Railway variables
2. Pastikan value adalah `https://www.cahayasilverking.id` (tanpa trailing slash)
3. Redeploy aplikasi setelah mengubah variables

### Domain tidak terhubung

1. Check DNS records di domain provider
2. Tunggu propagation (bisa sampai 24 jam)
3. Verifikasi di Railway dashboard bahwa domain sudah verified

### QR Code tidak generate

1. Check `RAILWAY_ENVIRONMENT` variable (harus `true`)
2. Check `NODE_ENV` variable (harus `production`)
3. Check logs di Railway dashboard untuk error details

## 📝 Notes

- **PENTING**: `NEXT_PUBLIC_APP_URL` harus di-set ke domain production untuk QR code generation
- Semua QR code yang di-generate akan menggunakan URL dari `getBaseUrl()` function
- Function ini akan otomatis menggunakan `NEXT_PUBLIC_APP_URL` jika tersedia
- Jika tidak ada, akan fallback ke `https://www.cahayasilverking.id` di production

## 🔄 Update Variables

Untuk update variables setelah initial setup:

```bash
railway variables set NEXT_PUBLIC_APP_URL="https://www.cahayasilverking.id" --service silverkingbycai
```

Atau via Railway Dashboard:
1. Buka project → Service → Variables
2. Edit atau tambah variable
3. Redeploy aplikasi

