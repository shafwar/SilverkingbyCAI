# 🎥 Folder Videos

Folder ini untuk menyimpan semua file video yang digunakan di website.

## 📁 Struktur:

```
public/videos/
├── products/        # Video demo produk
├── tutorials/       # Video tutorial penggunaan
└── promotional/     # Video promosi/marketing
```

## 🎬 Format Video yang Disupport:

- ✅ **MP4** (H.264) - Recommended (compatible semua browser)
- ✅ **WebM** (VP8/VP9) - Alternatif modern
- ✅ **OGG** (Theora) - Legacy support
- ⚠️ **MOV** - Perlu convert ke MP4 dulu

## 📊 Rekomendasi Ukuran:

| Tipe Video | Resolusi | Max Size | Bitrate |
|------------|----------|----------|---------|
| Product Demo | 1080p (1920x1080) | 50MB | 5 Mbps |
| Tutorial | 720p (1280x720) | 30MB | 3 Mbps |
| Background | 720p | 10MB | 2 Mbps |
| Thumbnail | 480p (854x480) | 5MB | 1 Mbps |

## 🔗 Cara Akses Video:

### **1. Video Player HTML5:**

```tsx
export default function ProductVideo() {
  return (
    <video 
      width="100%" 
      height="auto" 
      controls
      poster="/images/video-thumbnail.jpg"
    >
      <source src="/videos/products/silver-bar-demo.mp4" type="video/mp4" />
      <source src="/videos/products/silver-bar-demo.webm" type="video/webm" />
      Your browser does not support the video tag.
    </video>
  )
}
```

### **2. Background Video:**

```tsx
export default function HeroWithVideo() {
  return (
    <div className="relative">
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="w-full h-screen object-cover"
      >
        <source src="/videos/hero-background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 flex items-center justify-center">
        <h1>Content Over Video</h1>
      </div>
    </div>
  )
}
```

### **3. Lazy Load Video:**

```tsx
'use client'
import { useEffect, useRef } from 'react'

export default function LazyVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && videoRef.current) {
            videoRef.current.play()
          } else if (videoRef.current) {
            videoRef.current.pause()
          }
        })
      },
      { threshold: 0.5 }
    )
    
    if (videoRef.current) {
      observer.observe(videoRef.current)
    }
    
    return () => observer.disconnect()
  }, [])
  
  return (
    <video ref={videoRef} muted loop playsInline>
      <source src={src} type="video/mp4" />
    </video>
  )
}
```

## 📤 API Upload Video:

```typescript
// src/app/api/upload-video/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('video') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }
    
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid video format' }, { status: 400 })
    }
    
    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })
    }
    
    // Convert to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Generate filename
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`
    const filePath = path.join(process.cwd(), 'public/videos/products', fileName)
    
    // Save file
    await writeFile(filePath, buffer)
    
    // Return URL
    return NextResponse.json({ 
      success: true,
      url: `/videos/products/${fileName}`,
      size: file.size,
      type: file.type
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

## 🎨 Form Upload di Frontend:

```tsx
'use client'
import { useState } from 'react'

export default function VideoUploadForm() {
  const [uploading, setUploading] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('video', file)
      
      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (data.success) {
        setVideoUrl(data.url)
        alert('Video uploaded successfully!')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div>
      <input 
        type="file" 
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleUpload}
        disabled={uploading}
      />
      
      {uploading && <p>Uploading...</p>}
      
      {videoUrl && (
        <video width="100%" controls>
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}
    </div>
  )
}
```

## 💡 Tips Optimasi Video:

### **1. Compress Video Sebelum Upload:**

Gunakan tools:
- **FFmpeg:** `ffmpeg -i input.mp4 -c:v libx264 -crf 23 output.mp4`
- **HandBrake:** GUI tool untuk compress
- **Online:** CloudConvert, Clipchamp

### **2. Multiple Quality (Adaptive Streaming):**

```tsx
<video controls>
  <source src="/videos/product-720p.mp4" type="video/mp4" />
  <source src="/videos/product-480p.mp4" type="video/mp4" />
  <source src="/videos/product-360p.mp4" type="video/mp4" />
</video>
```

### **3. Lazy Loading:**

```tsx
<video loading="lazy" preload="none">
  <source src="/videos/product.mp4" type="video/mp4" />
</video>
```

### **4. Poster Image:**

```tsx
<video 
  poster="/images/video-thumbnails/product-thumbnail.jpg"
  controls
>
  <source src="/videos/product.mp4" type="video/mp4" />
</video>
```

## 🚀 Best Practices:

1. ✅ **Always provide poster image** (thumbnail)
2. ✅ **Use MP4 format** (H.264 codec)
3. ✅ **Compress videos** before upload
4. ✅ **Add loading="lazy"** for below-fold videos
5. ✅ **Use preload="none"** to save bandwidth
6. ✅ **Add fallback text** for unsupported browsers
7. ❌ **Avoid autoplay with sound** (bad UX)
8. ❌ **Don't use videos as background** on mobile (too heavy)

## 📱 Mobile Optimization:

```tsx
export default function ResponsiveVideo() {
  return (
    <video 
      controls
      playsInline // Important for iOS!
      preload="metadata"
    >
      {/* Desktop version (higher quality) */}
      <source 
        src="/videos/product-1080p.mp4" 
        type="video/mp4" 
        media="(min-width: 1024px)"
      />
      
      {/* Mobile version (lower quality) */}
      <source 
        src="/videos/product-480p.mp4" 
        type="video/mp4"
      />
    </video>
  )
}
```

## 🎯 Use Cases di Project Silver King:

1. **Product Demo Videos:**
   - Path: `public/videos/products/`
   - Show: Proses pembuatan silver bar

2. **Tutorial Videos:**
   - Path: `public/videos/tutorials/`
   - Show: Cara scan QR code, cara verifikasi

3. **Background Hero:**
   - Path: `public/videos/`
   - File: `hero-background.mp4` (max 10MB)

4. **Testimonial Videos:**
   - Path: `public/videos/testimonials/`
   - Show: Customer testimonials

## 🔒 Security:

```typescript
// Validate before upload
const allowedFormats = ['video/mp4', 'video/webm']
const maxSize = 100 * 1024 * 1024 // 100MB

if (!allowedFormats.includes(file.type)) {
  throw new Error('Invalid format')
}

if (file.size > maxSize) {
  throw new Error('File too large')
}

// Sanitize filename
const safeFileName = file.name
  .replace(/[^a-zA-Z0-9.-]/g, '-')
  .toLowerCase()
```

## 📈 Performance Monitoring:

```typescript
// Track video performance
<video
  onLoadStart={() => console.log('Video loading started')}
  onCanPlay={() => console.log('Video can play')}
  onError={(e) => console.error('Video error:', e)}
>
  <source src="/videos/product.mp4" />
</video>
```

---

**Kesimpulan:**  
Video upload ke folder **`public/videos/`** dan akses dengan `/videos/nama-file.mp4`

