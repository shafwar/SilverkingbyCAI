# 🎥 Panduan Upload & Gunakan Video di Silver King by CAI

Panduan lengkap untuk upload dan menggunakan video di project ini.

---

## 📁 Folder untuk Video

```
public/
└── videos/
    ├── products/      ← Video demo produk silver/gold
    ├── tutorials/     ← Video tutorial cara pakai website
    └── promotional/   ← Video promosi/marketing
```

---

## 🚀 Cara Upload Video

### **1. Manual Upload (Copy File)**

Cara paling simple:

```bash
# Copy video ke folder yang sesuai
cp video-anda.mp4 public/videos/products/

# Atau drag & drop file ke folder public/videos/products/
```

### **2. Via API (Programmatic)**

Untuk upload lewat code:

```typescript
// Frontend Component
async function uploadVideo(file: File, category: string) {
  const formData = new FormData()
  formData.append('video', file)
  formData.append('category', category) // products, tutorials, promotional
  
  const response = await fetch('/api/upload-video', {
    method: 'POST',
    body: formData
  })
  
  const data = await response.json()
  return data // { url: "/videos/products/12345-video.mp4" }
}
```

---

## 🎬 Cara Pakai Video di Website

### **1. Video Player Biasa**

```tsx
// src/app/products/[id]/page.tsx
export default function ProductPage() {
  return (
    <div>
      <h1>Silver Bar 100gr</h1>
      
      <video 
        width="100%" 
        controls
        poster="/images/video-thumbnail.jpg"
      >
        <source 
          src="/videos/products/silver-bar-demo.mp4" 
          type="video/mp4" 
        />
        Video tidak support di browser Anda.
      </video>
    </div>
  )
}
```

### **2. Background Video (Hero Section)**

```tsx
// src/app/page.tsx
export default function HomePage() {
  return (
    <div className="relative h-screen">
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/hero-background.mp4" type="video/mp4" />
      </video>
      
      {/* Content di atas video */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <h1 className="text-white text-6xl">Silver King by CAI</h1>
      </div>
    </div>
  )
}
```

### **3. Video Gallery**

```tsx
const videos = [
  { 
    id: 1, 
    title: 'Proses Pembuatan', 
    url: '/videos/products/pembuatan-silver.mp4',
    thumbnail: '/images/thumbnails/pembuatan.jpg'
  },
  { 
    id: 2, 
    title: 'Tutorial Verifikasi', 
    url: '/videos/tutorials/cara-verifikasi.mp4',
    thumbnail: '/images/thumbnails/verifikasi.jpg'
  },
]

export default function VideoGallery() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {videos.map(video => (
        <div key={video.id}>
          <h3>{video.title}</h3>
          <video 
            width="100%" 
            controls 
            poster={video.thumbnail}
          >
            <source src={video.url} type="video/mp4" />
          </video>
        </div>
      ))}
    </div>
  )
}
```

---

## 📊 Rekomendasi Video

### **Format & Codec:**
- **Format:** MP4 (paling compatible)
- **Video Codec:** H.264
- **Audio Codec:** AAC
- **Container:** MP4

### **Resolusi & Size:**

| Jenis Video | Resolusi | Max Size | Use Case |
|-------------|----------|----------|----------|
| Product Demo | 1080p (1920x1080) | 50MB | Detail produk |
| Tutorial | 720p (1280x720) | 30MB | Cara pakai |
| Background | 720p | 10MB | Hero section |
| Thumbnail | 480p (854x480) | 5MB | Preview |

### **Durasi:**
- Product Demo: 30-60 detik
- Tutorial: 1-3 menit
- Background Loop: 10-20 detik
- Promotional: 30-90 detik

---

## 🛠️ Compress Video Sebelum Upload

### **Option 1: FFmpeg (Command Line)**

```bash
# Install FFmpeg
brew install ffmpeg  # macOS
# atau download dari https://ffmpeg.org/

# Compress video ke 720p
ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -crf 23 -c:a aac output.mp4

# Compress lebih kecil lagi
ffmpeg -i input.mp4 -vf scale=854:480 -c:v libx264 -crf 28 -c:a aac output-small.mp4

# Remove audio (untuk background video)
ffmpeg -i input.mp4 -an -vf scale=1280:720 output-noaudio.mp4
```

### **Option 2: Online Tools**

- **CloudConvert:** https://cloudconvert.com/mp4-converter
- **Clipchamp:** https://clipchamp.com/
- **Online-Convert:** https://www.online-convert.com/

### **Option 3: Desktop Apps**

- **HandBrake** (Free, Mac/Win) - https://handbrake.fr/
- **Shotcut** (Free, Open Source)
- **Adobe Media Encoder** (Paid)

---

## 💡 Best Practices

### **✅ DO:**

1. **Compress sebelum upload** - Hemat bandwidth
2. **Provide thumbnail** (poster image)
3. **Add controls** - User bisa play/pause
4. **Use lazy loading** - Video cuma load saat terlihat
5. **Multiple quality** - 1080p, 720p, 480p
6. **Add fallback text** - Untuk browser lama

### **❌ DON'T:**

1. **Jangan autoplay dengan suara** - Annoying!
2. **Jangan upload video > 100MB** - Terlalu berat
3. **Jangan pakai video di mobile background** - Kill battery
4. **Jangan lupa compress** - Video mentah terlalu besar

---

## 🎨 Component Upload Video (Ready to Use)

Saya buatkan component siap pakai:

```tsx
// src/components/forms/VideoUploadForm.tsx
'use client'
import { useState } from 'react'

interface VideoUploadFormProps {
  category?: 'products' | 'tutorials' | 'promotional'
  onSuccess?: (url: string) => void
}

export default function VideoUploadForm({ 
  category = 'products',
  onSuccess 
}: VideoUploadFormProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState('')
  
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate
    if (file.size > 100 * 1024 * 1024) {
      setError('File terlalu besar (max 100MB)')
      return
    }
    
    if (!file.type.startsWith('video/')) {
      setError('File harus video')
      return
    }
    
    setUploading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('video', file)
      formData.append('category', category)
      
      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (data.success) {
        setVideoUrl(data.data.url)
        onSuccess?.(data.data.url)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      setError('Upload error. Please try again.')
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div className="luxury-card">
      <h3 className="text-xl font-bold text-luxury-gold mb-4">
        Upload Video ({category})
      </h3>
      
      <input 
        type="file" 
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleUpload}
        disabled={uploading}
        className="luxury-input mb-4"
      />
      
      {uploading && (
        <div className="text-luxury-gold">
          Uploading... Please wait
        </div>
      )}
      
      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}
      
      {videoUrl && (
        <div className="mt-4">
          <p className="text-green-500 mb-2">✅ Upload Success!</p>
          <video width="100%" controls>
            <source src={videoUrl} type="video/mp4" />
          </video>
          <p className="text-luxury-silver mt-2 text-sm">
            URL: {videoUrl}
          </p>
        </div>
      )}
    </div>
  )
}
```

---

## 📱 Responsive Video

```tsx
export default function ResponsiveVideo({ src }: { src: string }) {
  return (
    <div className="relative" style={{ paddingTop: '56.25%' /* 16:9 */ }}>
      <video
        className="absolute top-0 left-0 w-full h-full"
        controls
        playsInline
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  )
}
```

---

## 🔐 Security

API upload video sudah include:

✅ **Authentication** - Hanya admin/staff yang bisa upload  
✅ **File Type Validation** - Cuma terima MP4, WebM, MOV  
✅ **File Size Limit** - Max 100MB  
✅ **Filename Sanitization** - Remove special chars  

---

## 🎯 Use Cases di Project

### **1. Product Demo**

```
File: public/videos/products/silver-bar-100gr-demo.mp4
Page: /dashboard/products (add product)
Show: Cara produk dibuat, detail texture
```

### **2. Cara Verifikasi QR**

```
File: public/videos/tutorials/cara-scan-qr.mp4
Page: /verify atau /about
Show: Tutorial scan QR code
```

### **3. Hero Background**

```
File: public/videos/hero-background.mp4
Page: Homepage
Show: Video background luxury (loop, no sound)
```

### **4. Testimonial**

```
File: public/videos/testimonials/customer-review.mp4
Page: /about atau homepage
Show: Customer testimony
```

---

## 📊 Performance Tips

### **1. Lazy Load:**

```tsx
<video loading="lazy" preload="none">
  <source src="/videos/product.mp4" />
</video>
```

### **2. Intersection Observer:**

Load video hanya saat visible di screen:

```tsx
'use client'
import { useEffect, useRef } from 'react'

export default function LazyVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && videoRef.current) {
          videoRef.current.play()
        }
      })
    })
    
    if (videoRef.current) observer.observe(videoRef.current)
    return () => observer.disconnect()
  }, [])
  
  return (
    <video ref={videoRef} muted loop playsInline>
      <source src={src} type="video/mp4" />
    </video>
  )
}
```

---

## 🚀 Quick Start

1. **Prepare Video:**
   - Compress ke 720p atau 1080p
   - Max 50MB
   - Format MP4

2. **Upload:**
   - Copy ke `public/videos/products/`
   - Atau pakai API `/api/upload-video`

3. **Pakai di Page:**
   ```tsx
   <video controls>
     <source src="/videos/products/your-video.mp4" />
   </video>
   ```

---

**Done! Video siap dipakai! 🎬**

