# 🚨 Troubleshooting Guide - Silver King by CAI

## ⚠️ PENTING: Jangan Sampai Error Lagi!

Dokumen ini berisi solusi untuk semua masalah yang pernah terjadi dan cara mencegahnya.

---

## 🔧 Masalah #1: Page Blank / White Screen

### Gejala:
- Browser menampilkan halaman putih/kosong
- Hanya navbar link yang terlihat
- Background hitam tidak muncul
- No hero section content

### Root Cause:
1. **Hydration Mismatch** - SSR render berbeda dengan client render
2. **Conditional rendering** dengan `if (!mounted) return` 
3. **Session storage** di-access sebelum hydration

### ✅ Solution (PERMANENT):
```tsx
// ❌ JANGAN SEPERTI INI:
if (!isClient) {
  return <div>Loading...</div>; // Hydration mismatch!
}

// ✅ YANG BENAR:
return (
  <>
    {!splashComplete && <SplashScreen />}
    <main className={splashComplete ? "opacity-100" : "opacity-0"}>
      <Navbar />
      <HeroSection />
    </main>
  </>
);
```

**Kenapa ini benar?**
- SSR dan client render struktur HTML yang **SAMA**
- Semua component selalu render
- Hanya visibility yang berubah (opacity)
- No hydration mismatch!

---

## 🔧 Masalah #2: Middleware Error (node-gyp-build)

### Gejala:
```
TypeError: Cannot read properties of undefined (reading 'modules')
- node-gyp-build error
```

### Root Cause:
- NextAuth v5 middleware menggunakan Edge Runtime
- Edge Runtime tidak support native Node modules (bcrypt, node-gyp-build)

### ✅ Solution (PERMANENT):
```tsx
// src/middleware.ts
export function middleware(request: NextRequest) {
  // Simple pass-through
  return NextResponse.next();
}

// Auth check dipindah ke client-side:
// src/app/dashboard/page.tsx
const { data: session, status } = useSession();

useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/dashboard/login");
  }
}, [status, router]);
```

---

## 🔧 Masalah #3: Tailwind CSS Not Working

### Gejala:
- Styles tidak apply
- Compilation error
- `Unknown utility class`

### Root Cause:
- Tailwind v4 incompatible dengan current setup
- PostCSS config salah

### ✅ Solution (PERMANENT):
```bash
# package.json
"tailwindcss": "^3.4.18"  # LOCKED VERSION

# postcss.config.mjs
export default {
  plugins: {
    tailwindcss: {},      # NOT @tailwindcss/postcss
    autoprefixer: {},
  },
};
```

**Prevent:**
```bash
# JANGAN update Tailwind tanpa testing!
npm update # ❌
npm install tailwindcss@latest # ❌

# Yang benar:
# Check package.json, version harus 3.4.18
```

---

## 🔧 Masalah #4: Build Errors After `npm run build`

### Gejala:
- `npm run dev` works ✅
- `npm run build` fails ❌
- Production styling missing

### Root Cause:
1. ESLint errors blocking build
2. Type errors
3. Cached build artifacts

### ✅ Solution (PERMANENT):

#### Step 1: Clear Cache
```bash
rm -rf .next node_modules/.cache
```

#### Step 2: Fix Common Issues
```json
// .eslintrc.json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "react/no-unescaped-entities": "off",
    "@next/next/no-img-element": "off"
  }
}
```

#### Step 3: Rebuild
```bash
npm run build
npm start
```

---

## 🔧 Masalah #5: Animations Not Working / FOUC

### Gejala:
- Text muncul sebentar lalu hilang
- Animasi tidak smooth
- Flash of Unstyled Content

### Root Cause:
- GSAP initial state tidak set sebelum paint
- `useEffect` vs `useLayoutEffect` timing

### ✅ Solution (PERMANENT):
```tsx
// ❌ JANGAN:
useEffect(() => {
  gsap.set(element, { opacity: 0 }); // Too late!
  gsap.to(element, { opacity: 1 });
}, []);

// ✅ YANG BENAR:
useLayoutEffect(() => {
  // Set initial state BEFORE paint
  gsap.set(element, { opacity: 0 });
}, []);

useEffect(() => {
  // Run animation AFTER paint
  gsap.to(element, { opacity: 1 });
}, []);
```

---

## 📋 Checklist: Sebelum Deploy

Jalankan checklist ini SETIAP KALI sebelum commit/deploy:

```bash
# 1. Clear cache
rm -rf .next node_modules/.cache

# 2. Test dev mode
npm run dev
# ✅ Check: Homepage loads
# ✅ Check: Splash screen animates (first visit)
# ✅ Check: Hero section appears after splash
# ✅ Check: Stats counter animates
# ✅ Check: All 5 statistics visible

# 3. Test build mode
npm run build
npm start
# ✅ Check: Build succeeds (no errors)
# ✅ Check: All pages load
# ✅ Check: Styles apply correctly
# ✅ Check: Animations work

# 4. Test different browsers
# ✅ Chrome
# ✅ Firefox
# ✅ Safari

# 5. Test responsive
# ✅ Mobile (375px)
# ✅ Tablet (768px)
# ✅ Desktop (1920px)
```

---

## 🛠️ Emergency Fix Commands

Kalau website tiba-tiba error, jalankan ini BERURUTAN:

```bash
# 1. Kill all servers
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

# 2. Clear everything
rm -rf .next node_modules/.cache

# 3. Restart
npm run dev

# 4. Kalau masih error, clear sessionStorage:
# Buka browser console:
sessionStorage.clear()
# Refresh page
```

---

## 📦 Dependencies Version Lock

**JANGAN PERNAH UPDATE ini tanpa testing:**

```json
{
  "tailwindcss": "^3.4.18",      // v4 = BREAK!
  "next": "15.1.4",
  "react": "^19.0.0",
  "framer-motion": "^11.15.0",
  "gsap": "^3.12.7"
}
```

---

## 🎯 Best Practices

### 1. Component Structure
```tsx
// ✅ ALWAYS render, control visibility
<div className={show ? "opacity-100" : "opacity-0"}>
  <Content />
</div>

// ❌ NEVER conditional render for animations
{show && <Content />}  // Hydration mismatch risk!
```

### 2. Session Storage
```tsx
// ✅ ALWAYS check typeof window
if (typeof window !== "undefined") {
  sessionStorage.setItem("key", "value");
}

// ❌ NEVER direct access
sessionStorage.setItem("key", "value"); // SSR error!
```

### 3. Animations
```tsx
// ✅ ALWAYS use useLayoutEffect for initial state
useLayoutEffect(() => {
  gsap.set(element, { opacity: 0 });
}, []);

// ✅ ALWAYS use useEffect for animations
useEffect(() => {
  gsap.to(element, { opacity: 1 });
}, []);
```

---

## 📞 Quick Reference

| Error | Fix Command |
|-------|-------------|
| White screen | `rm -rf .next && npm run dev` |
| Hydration error | Check conditional rendering |
| Build fails | Check ESLint, clear cache |
| Styles missing | Verify Tailwind version 3.4.18 |
| Middleware error | Check Edge Runtime compatibility |
| FOUC | Use useLayoutEffect for initial states |

---

## ✅ Current Working State

File structure yang **HARUS TETAP seperti ini**:

```
src/
├── app/
│   ├── page.tsx          ← Main homepage (splash + hero)
│   ├── layout.tsx        ← Root layout
│   └── about/page.tsx    ← About page
├── components/
│   ├── layout/
│   │   └── Navbar.tsx    ← Navigation
│   └── sections/
│       ├── HeroSection.tsx      ← Hero with animations
│       └── SplashScreen.tsx     ← Splash screen
├── middleware.ts         ← Simple pass-through
└── styles/
    └── globals.css       ← Global styles
```

---

## 🚀 Production Deployment

```bash
# 1. Final check
npm run build
npm start

# 2. Test production locally
open http://localhost:3000

# 3. Deploy (Vercel/Netlify)
# Ensure these env vars:
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL

# 4. Post-deploy verification
# ✅ Homepage loads
# ✅ Splash animates correctly
# ✅ All links work
# ✅ Dashboard auth works
```

---

**📝 Notes:**
- Document ini WAJIB dibaca sebelum modify code
- Jangan skip steps di checklist
- Test di local dulu sebelum push ke GitHub
- Kalau ada error baru, UPDATE document ini!

---

**Last Updated:** November 13, 2025
**Status:** ✅ All issues resolved and documented

