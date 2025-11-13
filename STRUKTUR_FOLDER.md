# 📁 Struktur Folder & Content Management - Next.js vs Laravel

## 🆚 Perbandingan dengan Laravel

| Laravel | Next.js | Fungsi |
|---------|---------|--------|
| `public/` | `public/` | Static files (gambar, PDF, dll) |
| `storage/app/public` | `public/uploads/` | User uploads |
| `resources/views` | `src/app/` | Pages/Views |
| `app/Http/Controllers` | `src/app/api/` | API Routes |
| `resources/js` | `src/components/` | Components |
| `resources/css` | `src/styles/` | CSS files |

---

## 📂 Struktur Folder Next.js (Project Ini)

```
SilverkingbyCAI/
│
├── public/                      ← FOLDER INI UNTUK CONTENT!
│   ├── images/                  # Gambar produk, logo, banner
│   ├── documents/               # PDF, catalog, brochure
│   ├── qrcodes/                 # QR codes (opsional)
│   ├── uploads/                 # File upload dari user
│   ├── favicon.ico              # Icon website
│   └── robots.txt               # SEO
│
├── src/
│   ├── app/                     # Pages & Routes (seperti views + controllers)
│   │   ├── page.tsx            # Homepage
│   │   ├── about/              # About page
│   │   ├── dashboard/          # Admin pages
│   │   └── api/                # API endpoints (seperti Laravel controllers)
│   │
│   ├── components/              # React components (reusable UI)
│   ├── lib/                     # Libraries (auth, database)
│   ├── utils/                   # Helper functions
│   └── styles/                  # CSS files
│
├── prisma/                      # Database (seperti Laravel migrations)
└── node_modules/                # Dependencies (seperti Laravel vendor/)
```

---

## 🎯 Folder `public/` - Untuk Content Static

### ✅ Apa yang Ditaruh di `public/`?

1. **Gambar** - Logo, banner, product images
2. **Dokumen** - PDF, catalog, brochure
3. **Icons** - Favicon, touch icons
4. **Fonts** (optional) - Custom fonts
5. **QR Codes** - Generated QR codes
6. **Uploads** - File upload dari user

### ❌ Apa yang JANGAN Ditaruh di `public/`?

1. File konfigurasi (`.env`)
2. Source code (`.ts`, `.tsx`)
3. Database files
4. Private/sensitive files

---

## 🔗 Cara Akses File dari `public/`

### **1. Di React Component (.tsx)**

```tsx
import Image from 'next/image'

// ✅ BENAR - Path langsung dari public/
export default function MyComponent() {
  return (
    <>
      {/* Next.js Image (optimized) */}
      <Image 
        src="/images/logo.png" 
        width={200} 
        height={100} 
        alt="Logo" 
      />
      
      {/* Regular img tag */}
      <img src="/images/product.jpg" alt="Product" />
      
      {/* Link ke PDF */}
      <a href="/documents/catalog.pdf" download>
        Download Catalog
      </a>
      
      {/* Background image */}
      <div style={{ backgroundImage: 'url(/images/banner.jpg)' }}>
        Content
      </div>
    </>
  )
}
```

**❗ PENTING:** Path dimulai dari `/` (slash), bukan `public/`

### **2. Di CSS File (.css)**

```css
/* Path langsung dari public/ */
.hero {
  background-image: url(/images/hero-bg.jpg);
}

.logo {
  background: url(/images/logo.png);
}
```

### **3. Di API Route (untuk serve file)**

```typescript
// src/app/api/download/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  // File di public/documents/report.pdf
  const filePath = path.join(process.cwd(), 'public/documents/report.pdf')
  const file = fs.readFileSync(filePath)
  
  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"'
    }
  })
}
```

---

## 📝 Contoh Struktur `public/` Lengkap

```
public/
│
├── images/
│   ├── logo.png
│   ├── banner-home.jpg
│   ├── products/
│   │   ├── silver-bar-100gr.jpg
│   │   ├── gold-coin-5gr.jpg
│   │   └── ...
│   └── icons/
│       ├── verified.svg
│       └── security.svg
│
├── documents/
│   ├── catalog-2024.pdf
│   ├── terms-conditions.pdf
│   └── certificate-template.pdf
│
├── qrcodes/              # Optional - jika mau save QR sebagai file
│   ├── SK-ABC123.png
│   └── SK-DEF456.png
│
├── uploads/              # User uploads
│   └── temp/
│
├── favicon.ico
├── apple-touch-icon.png
└── robots.txt
```

---

## 💾 Cara Save QR Code di Project Ini

### **Option 1: Save as Base64 in Database (CURRENT)**

```typescript
// Ini yang sudah dipakai di project
const qrCode = await generateQRCode(verificationUrl) // Returns base64
// Save to database
await prisma.product.create({
  data: {
    qrCode: qrCode, // Base64 string
  }
})
```

**Keuntungan:** Tidak perlu manage file system  
**Kekurangan:** Database lebih besar

### **Option 2: Save as File in `public/qrcodes/`**

```typescript
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'

// Generate dan save ke file
const qrCodePath = `/qrcodes/${serialNumber}.png`
const fullPath = path.join(process.cwd(), 'public', qrCodePath)

await QRCode.toFile(fullPath, verificationUrl)

// Save path to database
await prisma.product.create({
  data: {
    qrCode: qrCodePath, // "/qrcodes/SK-ABC123.png"
  }
})
```

**Keuntungan:** Database lebih kecil  
**Kekurangan:** Harus manage file system

---

## 📤 Upload File ke `public/uploads/`

### Contoh API untuk Upload:

```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }
  
  // Convert to buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  // Save to public/uploads/
  const fileName = `${Date.now()}-${file.name}`
  const filePath = path.join(process.cwd(), 'public/uploads', fileName)
  
  await writeFile(filePath, buffer)
  
  // Return URL
  return NextResponse.json({ 
    url: `/uploads/${fileName}` 
  })
}
```

### Cara Pakai di Frontend:

```tsx
async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  
  const formData = new FormData()
  formData.append('file', file)
  
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  
  const data = await res.json()
  console.log('File uploaded:', data.url) // "/uploads/1234567890-image.jpg"
}
```

---

## 🖼️ Next.js Image Optimization

### **Gunakan `<Image>` component untuk optimasi:**

```tsx
import Image from 'next/image'

// ✅ RECOMMENDED - Auto optimization
<Image 
  src="/images/product.jpg"
  width={800}
  height={600}
  alt="Product"
  priority={true}  // Load first (for above fold)
/>

// ❌ TIDAK DIOPTIMASI
<img src="/images/product.jpg" alt="Product" />
```

**Keuntungan `<Image>`:**
- Lazy loading otomatis
- Resize otomatis
- Format modern (WebP)
- Placeholder blur

---

## 🚀 Best Practices

### **1. Organize by Category**
```
public/
├── images/products/
├── images/banners/
├── images/icons/
├── documents/legal/
└── documents/marketing/
```

### **2. Use Descriptive Names**
```
❌ img1.jpg, doc.pdf
✅ silver-bar-100gr.jpg, terms-and-conditions.pdf
```

### **3. Optimize Images Before Upload**
- Use WebP format
- Compress images (TinyPNG, ImageOptim)
- Max size: 1MB per image

### **4. Security**
```typescript
// Validate file types
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
if (!allowedTypes.includes(file.type)) {
  throw new Error('Invalid file type')
}

// Validate file size
const maxSize = 5 * 1024 * 1024 // 5MB
if (file.size > maxSize) {
  throw new Error('File too large')
}
```

---

## 📊 Comparison Summary

| Aspek | Laravel | Next.js (Project Ini) |
|-------|---------|----------------------|
| **Static Files** | `public/` | `public/` ✅ |
| **Access URL** | `/images/logo.png` | `/images/logo.png` ✅ |
| **User Uploads** | `storage/app/public` | `public/uploads/` |
| **Symlink** | `php artisan storage:link` | Tidak perlu |
| **Image Optimization** | Manual/Package | Built-in `<Image>` |

---

## 💡 Tips untuk Developer

1. **Development:** Files di `public/` bisa langsung diakses
2. **Production:** Files di `public/` akan di-serve as static
3. **Deployment:** Upload folder `public/` ke server
4. **CDN:** Bisa host `public/` di CDN untuk performa lebih baik

---

**Kesimpulan:**  
Di Next.js, **`public/`** = **`public/`** di Laravel! 🎉

Semua file static (gambar, PDF, dll) taruh di folder `public/` dan akses langsung dari root URL.

