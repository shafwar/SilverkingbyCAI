# Public Folder - Static Assets

Folder ini untuk menyimpan semua file static yang bisa diakses langsung dari browser.

## 📁 Struktur Folder:

```
public/
├── images/          # Gambar produk, logo, banner
├── documents/       # PDF, dokumen
├── qrcodes/         # QR codes yang di-generate (opsional)
├── uploads/         # File upload dari user
├── favicon.ico      # Icon website
└── robots.txt       # SEO robots
```

## 🔗 Cara Akses:

File di folder `public/` bisa diakses langsung dari root URL.

### Contoh:

**File:** `public/images/logo.png`  
**URL:** `http://localhost:3000/images/logo.png`

**File:** `public/documents/catalog.pdf`  
**URL:** `http://localhost:3000/documents/catalog.pdf`

**File:** `public/qrcodes/product-123.png`  
**URL:** `http://localhost:3000/qrcodes/product-123.png`

## 💡 Tips:

1. **Jangan** simpan file sensitif di sini (bisa diakses publik)
2. **Untuk gambar kecil** (< 50KB), bisa juga di `src/assets/` dan import di component
3. **Untuk QR codes**, bisa disimpan sebagai base64 di database atau di folder ini
4. **Untuk upload files**, pastikan validasi ukuran dan tipe file

## 🖼️ Cara Pakai di Code:

### React Component:
```jsx
import Image from 'next/image'

// Direct path dari public folder
<Image src="/images/logo.png" width={200} height={100} alt="Logo" />

// Atau dengan tag img biasa
<img src="/documents/catalog.pdf" />

// Background CSS
<div style={{ backgroundImage: 'url(/images/banner.jpg)' }}>
```

### CSS:
```css
.hero {
  background-image: url(/images/hero-bg.jpg);
}
```

## 🚀 Best Practices:

- Gunakan Next.js `<Image>` component untuk optimasi otomatis
- Compress gambar sebelum upload
- Gunakan lazy loading untuk gambar besar
- Organize files by category (images, docs, etc)

