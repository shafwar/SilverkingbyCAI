# 🔍 Analisis 502 Error: Public Folder Exclusion

**Date**: February 11, 2026  
**Problematic Commit**: `d871437` - "fix: simplify public folder exclusion - all assets from R2"  
**Stable Commit**: `7a58ba2` - "fix: ensure top items always show dropdown below"

---

## 🐛 Root Cause Analysis

### **Masalah**: 502 Bad Gateway Error

**Penyebab**: Excluding seluruh `public/` folder dari Docker image menyebabkan beberapa file yang masih diakses langsung dari public folder menjadi tidak tersedia, mengakibatkan 502 error.

---

## 🔎 File-File yang Masih Menggunakan Public Folder Langsung

### 1. **CertificateCard.tsx**
```typescript
// Line 128
<Image
  src="/images/sertificate.jpeg"  // ❌ Direct path, tidak menggunakan R2
  ...
/>
```
**Masalah**: File `certificate.jpeg` tidak tersedia jika public folder di-exclude.

### 2. **HeroWithVideo.tsx**
```typescript
// Line 21
fallbackImage = "/images/hero-fallback.jpg",  // ❌ Direct path
```
**Masalah**: Fallback image tidak tersedia jika public folder di-exclude.

### 3. **QrPreviewGrid.tsx**
```typescript
// Line 267, 284, 326, 396, 417, 474
const localFrontPath = v ? `/${v.localBase}/...` : "/images/serticard/Serticard-01.png";
const localBackPath = v ? `/${v.localBase}/...` : "/images/serticard/Serticard-02.png";
```
**Masalah**: Default serticard templates tidak tersedia jika public folder di-exclude.

### 4. **qr.ts (QR Generation)**
```typescript
// Line 56
// We use LucidaSans from /public/fonts for QR rendering.
registerFont(path.join(process.cwd(), "public", "fonts", "LucidaSans-Regular.ttf"), {
  family: "LucidaSans",
});
```
**Masalah**: Font file tidak tersedia untuk QR generation jika public folder di-exclude.

### 5. **Layout Metadata**
```typescript
// src/app/layout.tsx - Line 19
const logoUrl = getAbsoluteImageUrl("/images/cai-logo.png", metadataBase);
```
**Masalah**: Logo mungkin tidak tersedia jika R2 tidak configured atau fallback ke local path.

---

## ✅ Solusi yang Aman

### **Opsi 1: Partial Exclusion (RECOMMENDED)**
Exclude hanya file besar, keep file essential:

```dockerignore
# Exclude large media files but keep essential files
public/videos/**
public/images/**/*.jpg
public/images/**/*.jpeg
public/images/**/*.png
!public/images/serticard/**
!public/fonts/**
!public/favicon.ico
```

**Keuntungan**:
- File essential tetap tersedia
- Build context masih lebih kecil (exclude videos dan large images)
- Tidak ada breaking changes

### **Opsi 2: Migrate All to R2 (LONG TERM)**
Update semua file untuk menggunakan R2 URL:

1. Update `CertificateCard.tsx`:
   ```typescript
   src={getR2UrlClient("/images/sertificate.jpeg")}
   ```

2. Update `HeroWithVideo.tsx`:
   ```typescript
   fallbackImage={getR2UrlClient("/images/hero-fallback.jpg")}
   ```

3. Update `QrPreviewGrid.tsx`:
   ```typescript
   const localFrontPath = v ? `/${v.localBase}/...` : getR2UrlClient("/images/serticard/Serticard-01.png");
   ```

4. Update `qr.ts`:
   - Upload font ke R2 atau bundle font dalam code
   - Load font dari R2 atau use system font

**Keuntungan**:
- Semua assets dari R2/CDN
- Build context sangat kecil
- Better performance (CDN)

**Kerugian**:
- Perlu update banyak file
- Perlu upload semua assets ke R2 terlebih dahulu

---

## 🎯 Rekomendasi: Hybrid Approach

### **Solusi Aman untuk Sekarang**:

1. **Exclude hanya file besar**:
   ```dockerignore
   # Exclude large videos (71MB)
   public/videos/**
   
   # Exclude large images (keep only essential)
   public/images/**/*.jpg
   public/images/**/*.jpeg
   !public/images/serticard/**
   !public/images/cai-logo.png
   !public/images/sertificate.jpeg
   !public/images/hero-fallback.jpg
   
   # Keep fonts (needed for QR generation)
   !public/fonts/**
   
   # Keep favicon
   !public/favicon.ico
   ```

2. **Gradually migrate to R2**:
   - Upload large videos ke R2
   - Update video references ke R2 URL
   - Upload large images ke R2
   - Update image references ke R2 URL
   - Keep essential files (fonts, serticard templates) di public folder

---

## 📊 Comparison

| Approach | Build Size | Breaking Changes | Migration Effort |
|----------|------------|------------------|------------------|
| **Current (Full Exclusion)** | -97MB | ❌ Yes (502 error) | None |
| **Partial Exclusion** | -70MB | ✅ No | Low |
| **Full R2 Migration** | -97MB | ✅ No | High |

---

## ✅ Action Plan

1. ✅ **Rollback ke commit stabil** (`7a58ba2`)
2. ✅ **Simpan commit bermasalah ke branch** (`problematic-public-folder-exclusion`)
3. 🔄 **Implement Partial Exclusion** (exclude hanya large files)
4. 🔄 **Test deployment**
5. 🔄 **Gradually migrate to R2** (long term)

---

**Status**: ✅ ANALISIS COMPLETE  
**Next Step**: Implement Partial Exclusion approach
