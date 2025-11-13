# 🎬 Hero Background Videos

Folder ini khusus untuk video background di Hero Section (landing page).

## 📁 Tempat Upload Video Hero Background:

**TARUH VIDEO ANDA DI SINI:** `public/videos/hero/`

## 📋 Rekomendasi Spesifikasi:

### **Video Hero Background Ideal:**

| Property | Value | Alasan |
|----------|-------|--------|
| **Format** | MP4 (H.264) | Compatible semua browser |
| **Resolusi** | 1920x1080 (1080p) | Full HD, tidak blur |
| **Durasi** | 10-20 detik | Loop seamless |
| **File Size** | Max 10MB | Loading cepat |
| **FPS** | 30 fps | Smooth motion |
| **Audio** | Tidak ada (remove) | Background tidak perlu audio |
| **Bitrate** | 2-3 Mbps | Balance quality & size |

### **Nama File Contoh:**
- ✅ `hero-background.mp4` (main video)
- ✅ `hero-background-mobile.mp4` (optimized untuk mobile)
- ✅ `hero-fallback.jpg` (fallback image jika video gagal)

## 🎨 Cara Pakai di Homepage:

File yang sudah saya buat: `src/components/layout/HeroWithVideo.tsx`

```tsx
import HeroWithVideo from '@/components/layout/HeroWithVideo'

export default function HomePage() {
  return (
    <div>
      <HeroWithVideo 
        videoSrc="/videos/hero/hero-background.mp4"
        fallbackImage="/images/hero-fallback.jpg"
        title="Silver King by CAI"
        subtitle="The Art of Precious Metal Perfection"
      />
      
      {/* Content lainnya */}
    </div>
  )
}
```

## 📥 Cara Upload Video:

### **Option 1: Drag & Drop (Paling Mudah)**

1. Buka folder project di Finder/Explorer
2. Navigate ke: `public/videos/hero/`
3. Drag & drop video Anda ke folder ini
4. Rename jadi `hero-background.mp4`

### **Option 2: Terminal/Command Line**

```bash
# Copy video dari Downloads
cp ~/Downloads/your-video.mp4 public/videos/hero/hero-background.mp4

# Atau move
mv ~/Downloads/your-video.mp4 public/videos/hero/hero-background.mp4
```

### **Option 3: Via Code Editor (VS Code/Cursor)**

1. Right-click folder `public/videos/hero/`
2. Pilih "Reveal in Finder" / "Show in Explorer"
3. Copy paste video Anda
4. Rename jadi `hero-background.mp4`

## 🛠️ Compress Video Sebelum Upload:

### **FFmpeg (Command Line):**

```bash
# Install FFmpeg dulu
brew install ffmpeg  # macOS

# Compress video untuk hero background (no audio, 720p, 10MB max)
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080" \
  -c:v libx264 \
  -crf 28 \
  -an \
  -movflags +faststart \
  output.mp4

# Compress lebih aggressive (720p, smaller file)
ffmpeg -i input.mp4 \
  -vf "scale=1280:720" \
  -c:v libx264 \
  -crf 30 \
  -an \
  -movflags +faststart \
  output-mobile.mp4
```

**Penjelasan:**
- `-vf "scale=1920:1080"` - Resize ke 1080p
- `-c:v libx264` - Codec H.264
- `-crf 28` - Quality (23=high, 28=good, 30=lower)
- `-an` - Remove audio
- `-movflags +faststart` - Fast web streaming

### **Online Tools (Tanpa Install):**

1. **CloudConvert** - https://cloudconvert.com/mp4-converter
   - Upload video
   - Set quality: Medium
   - Remove audio: Yes
   - Download

2. **Clideo** - https://clideo.com/compress-video
   - Auto compress
   - Good balance

## 🎯 Tips Video Hero Background:

### **✅ DO:**

1. **Loop Seamless** - Awal dan akhir sama untuk loop mulus
2. **Slow Motion** - Video lambat lebih elegan
3. **No Audio** - Background video tidak perlu suara
4. **Compress Well** - Max 10MB untuk loading cepat
5. **Add Overlay** - Pakai dark overlay agar text terlihat
6. **Provide Fallback** - Image backup jika video gagal load
7. **Lazy Load on Mobile** - Atau pakai image saja di mobile

### **❌ DON'T:**

1. **Jangan terlalu cepat** - Bikin pusing
2. **Jangan terlalu terang** - Text jadi tidak terbaca
3. **Jangan autoplay dengan suara** - Annoying!
4. **Jangan > 10MB** - Lama loading
5. **Jangan high motion** - Distract dari content

## 📱 Mobile Optimization:

Untuk mobile, lebih baik pakai:
- Image static (lebih ringan)
- Video compressed lebih kecil (720p, 5MB max)
- Atau disable video di mobile

Component `HeroWithVideo` sudah handle ini otomatis!

## 🎨 Ide Konten Video Hero:

### **Untuk Silver King by CAI:**

1. **Close-up Silver/Gold Texture**
   - Macro shot silver bar surface
   - Gold coins slowly rotating
   - Metal reflection & shine

2. **Production Process**
   - Slow motion liquid metal pouring
   - Cooling process
   - Stamping/engraving process

3. **Product Showcase**
   - Products elegantly displayed
   - Rotating on turntable
   - Dramatic lighting

4. **Abstract Luxury**
   - Gold particles floating
   - Metallic liquid waves
   - Geometric patterns with gold/silver

## 🔗 Resources Video Stock (Jika Perlu):

**Gratis:**
- Pexels Videos: https://www.pexels.com/videos/
- Pixabay: https://pixabay.com/videos/
- Coverr: https://coverr.co/

**Search keywords:**
- "gold metal background"
- "silver texture"
- "luxury abstract"
- "metallic surface"
- "precious metal"

## 📊 Testing:

Setelah upload, test di:

1. **Desktop** - Chrome, Firefox, Safari
2. **Mobile** - iOS Safari, Android Chrome
3. **Slow Connection** - Throttle network di DevTools
4. **No Video Support** - Disable video, check fallback image

---

**Sekarang tinggal upload video Anda ke folder ini!** 🚀

Path: `public/videos/hero/hero-background.mp4`

