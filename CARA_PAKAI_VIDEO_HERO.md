# 🎬 Cara Pakai Video di Hero Section

Panduan lengkap step-by-step untuk upload dan pakai video background di hero section.

---

## 📍 Langkah 1: Upload Video ke Folder

### **Lokasi Upload:**
```
public/videos/hero/
```

### **Cara Upload:**

#### **Option A: Drag & Drop (Termudah)**

1. Buka project di VS Code/Cursor
2. Lihat sidebar kiri, expand folder: `public` → `videos` → `hero`
3. Drag video Anda dari Downloads/Desktop ke folder `hero`
4. Rename jadi: `hero-background.mp4`

#### **Option B: Terminal**

```bash
# Navigate ke folder project
cd /Users/macbookpro2019/SilverkingbyCAI

# Copy video dari Downloads
cp ~/Downloads/video-anda.mp4 public/videos/hero/hero-background.mp4
```

#### **Option C: Finder/Explorer**

1. Klik kanan folder `public/videos/hero` di VS Code
2. Pilih "Reveal in Finder" (Mac) atau "Show in Explorer" (Windows)
3. Copy paste video Anda ke folder ini
4. Rename jadi `hero-background.mp4`

---

## 📏 Langkah 2: Persiapan Video (Optional tapi Recommended)

### **Cek Ukuran File:**

```bash
# Check file size
ls -lh public/videos/hero/hero-background.mp4
```

**Jika > 10MB, compress dulu!**

### **Compress Video:**

```bash
# Install FFmpeg (sekali aja)
brew install ffmpeg  # macOS
# atau download dari: https://ffmpeg.org/

# Compress video (no audio, optimized)
ffmpeg -i public/videos/hero/hero-background.mp4 \
  -vf "scale=1920:1080" \
  -c:v libx264 \
  -crf 28 \
  -an \
  -movflags +faststart \
  public/videos/hero/hero-background-compressed.mp4

# Gunakan file compressed
mv public/videos/hero/hero-background-compressed.mp4 public/videos/hero/hero-background.mp4
```

---

## 🎨 Langkah 3: Pakai di Homepage

### **Edit File: `src/app/page.tsx`**

Ganti homepage yang lama dengan yang pakai video:

```tsx
"use client";

import HeroWithVideo from "@/components/layout/HeroWithVideo";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Sparkles, Award } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-luxury-black">
      {/* Hero Section dengan Video Background */}
      <HeroWithVideo
        videoSrc="/videos/hero/hero-background.mp4"
        fallbackImage="/images/hero-fallback.jpg"
        title="Silver King by CAI"
        subtitle="The Art of Precious Metal Perfection"
        overlayOpacity={0.6}
      >
        {/* Buttons di bawah subtitle */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/verify" className="luxury-button inline-flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Verify Product
          </Link>
          <Link
            href="/about"
            className="px-6 py-3 bg-luxury-black border-2 border-luxury-gold text-luxury-gold font-semibold rounded-lg hover:bg-luxury-gold hover:text-luxury-black transition-all duration-300"
          >
            Learn More
          </Link>
        </div>
      </HeroWithVideo>

      {/* Features Section (tetap seperti biasa) */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="luxury-card text-center"
            >
              <Shield className="w-16 h-16 text-luxury-gold mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-bold text-luxury-gold mb-3">
                Verified Authenticity
              </h3>
              <p className="text-luxury-silver">
                Each product comes with a unique QR code for instant verification.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="luxury-card text-center"
            >
              <Sparkles className="w-16 h-16 text-luxury-gold mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-bold text-luxury-gold mb-3">
                Premium Quality
              </h3>
              <p className="text-luxury-silver">
                99.99% purity guarantee on all our precious metal products.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="luxury-card text-center"
            >
              <Award className="w-16 h-16 text-luxury-gold mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-bold text-luxury-gold mb-3">
                Luxury Craftsmanship
              </h3>
              <p className="text-luxury-silver">
                Custom designs make every piece a work of art.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-luxury-silver/10 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center text-luxury-silver">
          <p className="text-sm">© {new Date().getFullYear()} Silver King by CAI</p>
          <p className="text-xs mt-2 text-luxury-silver/60">
            The Art of Precious Metal Perfection
          </p>
        </div>
      </footer>
    </div>
  );
}
```

---

## 🎛️ Langkah 4: Kustomisasi (Optional)

### **Ubah Opacity Overlay:**

```tsx
<HeroWithVideo
  overlayOpacity={0.4}  // 0 = transparan, 1 = gelap penuh
  // ... props lainnya
/>
```

### **Pakai Video Berbeda untuk Mobile:**

```tsx
<HeroWithVideo
  videoSrc="/videos/hero/hero-background.mp4"        // Desktop
  mobileSrc="/videos/hero/hero-background-mobile.mp4" // Mobile (smaller)
  // ... props lainnya
/>
```

### **Custom Content di Hero:**

```tsx
<HeroWithVideo
  title="Silver King by CAI"
  subtitle="The Art of Precious Metal Perfection"
>
  {/* Isi custom content di sini */}
  <div className="mt-8">
    <p className="text-luxury-silver text-lg mb-4">
      Luxury precious metals since 2024
    </p>
    <button className="luxury-button">
      Get Started
    </button>
  </div>
</HeroWithVideo>
```

---

## ✅ Langkah 5: Test

### **Start Development Server:**

```bash
npm run dev
```

### **Buka Browser:**

```
http://localhost:3000
```

### **Check:**

- ✅ Video playing otomatis
- ✅ Video looping seamless
- ✅ Text terlihat jelas (tidak tertutup video)
- ✅ Smooth scroll indicator
- ✅ Responsive di mobile (fallback image)

---

## 🐛 Troubleshooting

### **Video tidak muncul?**

1. **Cek path video:**
   ```bash
   ls -la public/videos/hero/
   ```
   Pastikan file `hero-background.mp4` ada

2. **Cek format:**
   - Harus MP4 (H.264 codec)
   - Tidak support MOV/AVI mentah

3. **Cek ukuran:**
   ```bash
   ls -lh public/videos/hero/hero-background.mp4
   ```
   Jika > 50MB, compress dulu

4. **Clear cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

### **Video stuck/lag?**

- Compress video ke ukuran lebih kecil
- Reduce resolution ke 720p
- Remove audio (tidak perlu untuk background)

### **Text tidak terlihat?**

- Increase `overlayOpacity` (misal dari 0.5 ke 0.7)
- Atau tambah text shadow di CSS

---

## 📊 Checklist Upload Video

Sebelum upload, pastikan:

- [ ] Format: MP4 (H.264)
- [ ] Resolusi: 1920x1080 atau 1280x720
- [ ] File size: < 10MB (ideal), < 20MB (max)
- [ ] Duration: 10-20 detik untuk seamless loop
- [ ] Audio: Removed (tidak perlu)
- [ ] Location: `public/videos/hero/hero-background.mp4`
- [ ] Fallback image ready: `public/images/hero-fallback.jpg`

---

## 🎯 Hasil Akhir

Setelah selesai, Anda akan punya:

1. ✅ Homepage dengan **full-screen video background**
2. ✅ Text overlay yang **elegan dan readable**
3. ✅ **Smooth scroll indicator**
4. ✅ **Responsive** - video di desktop, image di mobile
5. ✅ **Fast loading** - optimized video
6. ✅ **Professional look** - luxury theme

---

## 🎨 Rekomendasi Konten Video

Untuk Silver King by CAI, bagus kalau videonya:

1. **Close-up texture** silver/gold bars
2. **Slow motion** liquid metal pouring
3. **Rotating product** showcase
4. **Metallic particles** floating (abstract)
5. **Engraving process** close-up

**Search di stock video gratis:**
- Pexels: https://www.pexels.com/search/videos/gold/
- Pixabay: https://pixabay.com/videos/search/silver/

---

**Selesai! Video hero background siap dipakai! 🚀**

Upload video Anda ke: `public/videos/hero/hero-background.mp4`

