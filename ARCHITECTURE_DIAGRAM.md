# QR Download Architecture Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN PANEL - FRONTEND                      │
│                  (React + Framer Motion + TypeScript)           │
└─────────────────────────────────────────────────────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │  QrPreviewGrid Component │
                    │  - Modal with QR Preview │
                    │  - Dropdown Menu UI      │
                    │  - Download Functions    │
                    └──────────────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │   Download Button Click  │
                    │   (handleDownload)       │
                    └──────────────────────────┘
                           ▼          ▼
            ┌──────────────────┬──────────────────┐
            ▼                  ▼                  ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ Template     │  │ Original QR  │  │ QR Only      │
     │ Download     │  │ Download     │  │ Fetch        │
     │ (Existing)   │  │ (NEW!)       │  │              │
     └──────────────┘  └──────────────┘  └──────────────┘
            │                  │                  │
            │                  │                  │
            ▼                  ▼                  ▼
     API Endpoint:    API Endpoint:    API Endpoint:
     /api/qr/        /api/qr/         /api/qr/
     [serial]/       [serial]/        [serial]/
     download        download-        qr-only
                     original
            │                  │                  │
            │                  │                  │
            ▼                  ▼                  ▼
     ┌──────────────────────────────────────────────────┐
     │           BACKEND - API ROUTES                   │
     │              (Next.js API Routes)                │
     └──────────────────────────────────────────────────┘
            │                  │                  │
            │                  │                  │
            ├─────────────────▼┬─────────────────┤
            │                  │                 │
            ▼                  ▼                 ▼
     ┌────────────┐     ┌────────────┐    ┌────────────┐
     │ Auth Check │────▶│ Auth Check │   │ Auth Check │
     │ Admin Only │     │ Admin Only │   │            │
     └────────────┘     └────────────┘   └────────────┘
            │                  │
            ▼                  ▼
     ┌────────────┐     ┌────────────┐
     │  Fetch    │     │  Fetch    │
     │  Product  │     │  Product  │
     │  Data     │     │  Data     │
     └────────────┘     └────────────┘
            │                  │
            ▼                  ▼
     ┌────────────┐     ┌────────────────┐
     │  Generate │     │  Generate      │
     │  PDF with │     │  PNG with      │
     │  Template │     │  Canvas API    │
     └────────────┘     └────────────────┘
            │                  │
            │                  ▼
            │           ┌────────────────┐
            │           │  Canvas Setup  │
            │           │  - White BG    │
            │           │  - 480x620px   │
            │           └────────────────┘
            │                  │
            │                  ▼
            │           ┌────────────────┐
            │           │  Draw Elements │
            │           │  - Title text  │
            │           │  - QR image    │
            │           │  - Serial text │
            │           └────────────────┘
            │                  │
            │                  ▼
            │           ┌────────────────┐
            │           │  Convert to    │
            │           │  PNG Buffer    │
            │           └────────────────┘
            │                  │
            └──────────┬───────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │   Set Response Headers   │
            │   - Content-Type: image  │
            │   - Content-Disposition  │
            │   - Cache-Control        │
            │   - Pragma               │
            │   - Expires              │
            └──────────────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │   Return PNG/PDF Blob    │
            │   (Buffer Stream)        │
            └──────────────────────────┘
                       │
                       │
                       ▼
     ┌─────────────────────────────────────────────────┐
     │            FRONTEND - Download Handler         │
     │  (handleDownload / handleDownloadOriginal)      │
     └─────────────────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │  Receive Blob Response   │
            │  - Check blob.size > 0   │
            │  - Extract filename      │
            │  - Create Object URL     │
            └──────────────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │  Create Download Link    │
            │  <a href={url}           │
            │     download={filename}> │
            └──────────────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │  Trigger Download        │
            │  link.click()            │
            │  Cleanup: revokeURL      │
            └──────────────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │  Show Toast Notification │
            │  Success / Error Message │
            │  Close Dropdown Menu     │
            └──────────────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │  File Downloaded to      │
            │  User's Downloads Folder │
            │  ✅ Success!             │
            └──────────────────────────┘
```

---

## 📊 Data Flow Diagram

### Template Download Flow
```
User
  │
  ├─► Open QR Preview
  │
  ├─► Click on QR Code
  │
  ├─► Modal Opens (shows QR)
  │
  ├─► Click "Download with Template"
  │
  ├─► handleDownload(product)
  │       │
  │       ├─► Load Front Template (R2 or local)
  │       ├─► Load Back Template (R2 or local)
  │       ├─► Load QR Code Image
  │       │
  │       ├─► Create Canvas (Front)
  │       ├─► Draw Template + QR + Text
  │       ├─► Create Canvas (Back)
  │       ├─► Draw Back Template
  │       │
  │       ├─► Generate PDF (both pages)
  │       └─► Trigger Download
  │
  └─► File Downloaded
      (QR-SERIAL-NAME.pdf)
```

### Original Download Flow
```
User
  │
  ├─► Open QR Preview
  │
  ├─► Click on QR Code
  │
  ├─► Modal Opens (shows QR)
  │
  ├─► Click "Download Original"
  │
  ├─► handleDownloadOriginal(product)
  │       │
  │       ├─► Fetch from /api/qr/[serialCode]/download-original
  │       │
  │       └─► Server:
  │           ├─► Check Auth (Admin)
  │           ├─► Get Product Info
  │           ├─► Fetch QR Image
  │           ├─► Create Canvas (480x620px)
  │           ├─► Draw Title (28px, bold)
  │           ├─► Draw QR (400x400px)
  │           ├─► Draw Serial (18px, monospace)
  │           ├─► Convert to PNG
  │           └─► Return with headers
  │
  │       ├─► Receive Blob
  │       ├─► Extract Filename
  │       ├─► Create Object URL
  │       └─► Trigger Download
  │
  └─► File Downloaded
      (QR-Original-SERIAL-NAME.png)
```

---

## 🔐 Security Flow

```
Request
  │
  ├─► Check NextAuth Session
  │
  ├─► Verify User Role = "ADMIN"
  │   │
  │   ├─► True ─────────────────────┐
  │   │                             │
  │   └─► False ────────────────────┼──► Return 401 Unauthorized
  │                                 │
  ├─► Validate Serial Code          │
  │   ├─► Normalize (toUpperCase)   │
  │   ├─► Check Length > 3          │
  │   │                             │
  │   ├─► Valid ────────────────────┤
  │   │                             │
  │   └─► Invalid ─────────────────┐├──► Return Error
  │                                 ││
  ├─► Query Database                ││
  │   ├─► Product Found ────────────┤
  │   │                             │
  │   └─► Not Found ───────────────┐├──► Return 404
  │                                 ││
  ├─► Process Request               │
  │   ├─► Generate Image            │
  │   ├─► Validate Output           │
  │   │                             │
  │   ├─► Success ──────────────────┤
  │   │                             │
  │   └─► Failed ──────────────────┐├──► Return 500 + Error
  │                                 ││
  └─► Send Response                 │
      ├─► Set Headers               │
      ├─► Set Cache-Control        │
      └─► Stream File to Client    │
                                    │
                                ✅ Secure!
```

---

## 🎯 Component Interaction Diagram

```
┌─────────────────────────────────────────────────┐
│          QrPreviewGrid Component                │
├─────────────────────────────────────────────────┤
│                                                 │
│  State:                                         │
│  ├─ selected: Product | null                   │
│  ├─ isDownloading: boolean                     │
│  ├─ isDownloadMenuOpen: boolean ◄─── NEW       │
│  └─ downloadMenuRef: React.Ref ◄─── NEW        │
│                                                 │
│  Functions:                                    │
│  ├─ handleDownload(product)                   │
│  ├─ handleDownloadOriginal(product) ◄─ NEW     │
│  ├─ handleDownloadAll()                       │
│  └─ handleOpenDownloadMenu()                  │
│                                                 │
│  Render:                                       │
│  ├─ Product Grid/Table                        │
│  │  └─ Click → setSelected(product)           │
│  │            → Modal opens                   │
│  │                                             │
│  ├─ Modal ◄──────────────────┐                │
│  │  ├─ QR Image Display      │                │
│  │  ├─ Serial Code           │                │
│  │  │                         │                │
│  │  └─ Download Menu Dropdown │                │
│  │     ├─ Button              │                │
│  │     │  └─ Click            │                │
│  │     │     └─ toggleMenu()  │                │
│  │     │                      │                │
│  │     └─ Menu Items          │                │
│  │        ├─ Download Template│                │
│  │        │  └─ handleDownload│                │
│  │        │     └─ Close menu │                │
│  │        │                  │                │
│  │        └─ Download Original│                │
│  │           └─ handleDownload│                │
│  │              Original()    │                │
│  │              └─ Close menu │                │
│  │                            │                │
│  └────────────────────────────┘                │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📱 UI Component Hierarchy

```
Modal
├─ Close Button
│
├─ QR Code Image
│  └─ img[src="/api/qr/[serialCode]"]
│     └─ Fallback: Add timestamp query
│
├─ Serial Code Display
│  └─ font-mono text-white/70
│
└─ Download Menu Container ◄─── ref={downloadMenuRef}
   │
   ├─ Main Button
   │  ├─ Download Icon
   │  ├─ Text Label
   │  ├─ Chevron Icon (rotates)
   │  └─ onClick → toggleMenu()
   │
   └─ Dropdown Menu (AnimatePresence)
      │
      ├─ Menu Item 1
      │  ├─ Checkbox Icon
      │  ├─ Title: "Download with Template"
      │  ├─ Description: "QR code with cert template"
      │  └─ onClick → handleDownload()
      │
      ├─ Divider
      │
      └─ Menu Item 2
         ├─ Checkbox Icon
         ├─ Title: "Download Original"
         ├─ Description: "QR code with title and serial"
         └─ onClick → handleDownloadOriginal()
```

---

## 🔄 State Management Flow

```
Initial State:
{
  selected: null,
  isDownloading: false,
  isDownloadMenuOpen: false,
  downloadMenuRef: <ref>
}

User Clicks QR:
├─ setSelected(product)
│  └─ State → selected = product
│            → Modal visible

User Clicks Download Button:
├─ setIsDownloadMenuOpen(true)
│  └─ State → isDownloadMenuOpen = true
│            → Dropdown shows with animation

User Selects Template Option:
├─ handleDownload(product)
│  ├─ setIsDownloading(true) ─ State → isDownloading = true
│  ├─ [API Call] ─────────────┐
│  │                           │ Async Processing
│  │ [Download Complete] ◄─────┘
│  ├─ setIsDownloading(false) ─ State → isDownloading = false
│  ├─ setIsDownloadMenuOpen(false) ─ State → close menu
│  └─ toast.success(message)

User Selects Original Option:
├─ handleDownloadOriginal(product)
│  ├─ setIsDownloading(true) ─ State → isDownloading = true
│  ├─ [API Call] ─────────────┐
│  │                           │ Async Processing
│  │ [Download Complete] ◄─────┘
│  ├─ setIsDownloading(false) ─ State → isDownloading = false
│  ├─ setIsDownloadMenuOpen(false) ─ State → close menu
│  └─ toast.success(message)
```

---

## 🌐 API Endpoints Map

```
/api/qr/
│
├─ [serialCode]/
│  │
│  ├─ route.ts (GET)
│  │  └─ Returns QR with title + serial
│  │     Endpoint: /api/qr/GKMI1ZUX1I4BIX
│  │
│  ├─ qr-only/route.ts (GET)
│  │  └─ Returns QR image only (no text)
│  │     Endpoint: /api/qr/GKMI1ZUX1I4BIX/qr-only
│  │
│  ├─ download/route.ts (GET)
│  │  └─ Returns PDF with template (EXISTING)
│  │     Endpoint: /api/qr/GKMI1ZUX1I4BIX/download
│  │     File: QR-GKMI1ZUX1I4BIX-ProductName.pdf
│  │
│  ├─ download-pdf/route.ts (GET)
│  │  └─ Alternative PDF endpoint
│  │
│  └─ download-original/route.ts (GET) ◄─── NEW!
│     └─ Returns PNG with title + QR + serial
│        Endpoint: /api/qr/GKMI1ZUX1I4BIX/download-original
│        File: QR-Original-GKMI1ZUX1I4BIX-ProductName.png
│
├─ download-all-pdf/route.ts
├─ download-all-png/route.ts
├─ download-multiple-pdf/route.ts
├─ download-selected-png/route.ts
└─ download-single-pdf/route.ts
```

---

## 📦 Canvas Generation (Original Mode)

```
Step 1: Create Canvas
┌─────────────────────────────────┐
│ Width: 480px                    │
│ Height: 620px                   │
│ Background: #FFFFFF             │
└─────────────────────────────────┘
         │
         ▼
Step 2: Draw Title (28px, bold)
┌─────────────────────────────────┐
│   Silver King 250 Gr            │ ◄─── Auto-wrap text
│                                 │      Centered
│                                 │
└─────────────────────────────────┘
         │
         ▼
Step 3: Draw QR Code (400x400px)
┌─────────────────────────────────┐
│                                 │
│   ┌─────────────────────────┐   │
│   │ ████████████████████░░  │   │
│   │ ██        ░░░░░░░░░░░░  │   │
│   │ ██ ░░░░░░ ░░ ░░ ░░░░░░  │   │ ◄─── Centered
│   │ ██ ░░ ░░░ ░░░░░░░░░░░░  │   │      QR image
│   │ ██ ░░░░░░ ░░░░░░░░░░░░  │   │
│   │ ████████████████████████  │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
         │
         ▼
Step 4: Draw Serial (18px, monospace)
┌─────────────────────────────────┐
│                                 │
│   GKMI1ZUX1I4BIX                │ ◄─── Courier New
│                                 │      Centered
│                                 │
└─────────────────────────────────┘
         │
         ▼
Step 5: Convert to PNG Buffer
┌─────────────────────────────────┐
│ PNG Buffer (85KB average)       │
│ RGBA 32-bit color              │
└─────────────────────────────────┘
         │
         ▼
Result: Ready for Download!
```

---

## 🚦 Error Handling Flow

```
Try Block:
│
├─ Fetch Product Data
│  │
│  └─► Error: Product not found
│      └─► Catch Block → 404 Error
│
├─ Load Images
│  │
│  ├─► Front Template Error
│  │   └─► Try Local Fallback
│  │       └─► Still Error? → 500 Error
│  │
│  ├─► Back Template Error
│  │   └─► Try Local Fallback
│  │       └─► Still Error? → 500 Error
│  │
│  └─► QR Image Error
│      └─► Catch Block → 500 Error
│
├─ Canvas Operations
│  │
│  ├─► Get Context Error
│  │   └─► Catch Block → 500 Error
│  │
│  ├─► Draw Image Error (tainted canvas)
│  │   └─► Reload without crossOrigin
│  │       └─► Retry drawing
│  │
│  └─► Text Rendering Error
│      └─► Catch Block → 500 Error
│
├─ File Generation
│  │
│  └─► Buffer Size = 0
│      └─► Catch Block → Error
│
└─► Response Sent
    ├─► Success: PNG/PDF blob
    └─► Error: Error message

Frontend Catch:
│
├─ Check Response Status
│  ├─► 401: Unauthorized
│  ├─► 404: Product not found
│  ├─► 500: Server error
│  └─► Network error
│
├─ Show Toast Error Message
│
└─ Log to Console for debugging
```

---

**Architecture Last Updated**: 2024
**Complexity**: Medium
**Scalability**: High
**Performance**: Optimized ✅

