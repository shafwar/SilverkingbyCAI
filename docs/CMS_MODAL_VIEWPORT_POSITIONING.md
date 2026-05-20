# CMS modal salah posisi + scroll freeze (Products, Distributor, dll.)

Dokumen ini menjelaskan bug yang pernah terjadi pada modal **Edit / New Product** dan **Edit / New Distributor** (dan pola serupa di halaman lain), serta **akar masalah** dan **cara memperbaikinya** jika gejala sama muncul lagi.

---

## Gejala (symptoms)

- Admin klik **Edit** atau **Add product** / **Add distributor** dari bagian bawah halaman (setelah scroll).
- **Kotak form modal tidak tampil di tengah layar**; seolah muncul di **area hero / atas dokumen**, jauh dari posisi scroll user.
- **Scroll halaman terkunci** (`body` di-set `overflow: hidden` untuk modal), sehingga user tidak bisa scroll ke atas untuk melihat form — terasa seperti **freeze**.
- Perilaku sama untuk **buka** dan **tutup** modal: intinya overlay `position: fixed` tidak mengikuti **viewport**, melainkan **layout body/dokumen**.

---

## Akar masalah (root cause)

### 1. `transform` pada `body` (sudah dihapus dari `globals.css`)

Di CSS global, elemen **`body`** memakai **`transform`** (misalnya `transform: translateZ(0)` untuk “GPU layer”).

Menurut spesifikasi CSS: jika **ancestor** punya `transform`, `filter`, atau `perspective` (bukan `none`), elemen keturunan dengan **`position: fixed`** tidak lagi memakai **viewport** sebagai containing block, melainkan ancestor itu.

Karena **`ModalPortal`** me-render anak langsung ke **`document.body`**, modal yang seharusnya **`fixed` mengisi layar** malah **terikat ke `body` yang sudah di-`transform`**. Hasilnya koordinat `top/left` seperti “atas dokumen” (tempat hero), bukan “atas layar yang sedang dilihat user”.

Scroll lock di modal (`overflow: hidden` pada `body`) tetap aktif → user tidak bisa menggeser halaman ke area tempat modal “nyasar”.

### 2. `filter` pada `document.body` atau sisa `filter: blur(0px)`

**`filter`** (termasuk **`blur(0px)`**) pada ancestor juga membuat **containing block** untuk `position: fixed`, sama seperti `transform`. Jika transisi navigasi memasang blur pada **`body`** lalu “membersihkan” dengan **`blur(0px)`**, properti filter **bukan `none`** → video hero fullscreen dan **`HeroEditPortal`** bisa ikut **scroll seperti parallax**.

**Perbaikan:** jangan set `filter` pada `body`; pakai **`backdrop-filter`** pada overlay; cleanup dengan **`removeProperty('filter')`**, bukan `blur(0px)`.

---

## Perbaikan yang sudah diterapkan (reference)

| Area | Perubahan |
|------|-----------|
| `src/styles/globals.css` | **Hapus** `transform: translateZ(0)` (atau transform apa pun) dari **`body`**. Jangan menambahkan kembali tanpa mempertimbangkan modal. |
| `src/components/ui/ModalPortal.tsx` | Kunci scroll ke **`html` + `body`** saat modal terbuka; perkuat wrapper portal (`fixed`, `min-height: 100dvh`, `overscroll-behavior: contain`). |
| `ProductsPageClient` / `DistributorPageClient` (CMS modal) | Backdrop modal: **`fixed inset-0`** + **`overflow-y-auto`** agar form tinggi tetap bisa di-scroll di dalam overlay; hindari offset vertikal besar yang mengganggu centering. |
| `EditableMedia.tsx` | Saat modal tutup, **kembalikan** `document.body.style.overflow` (cleanup `useEffect`). |
| `PageTransitionOverlay.tsx` | **Tanpa** `filter` pada `body`; blur lewat **`backdrop-filter`** pada overlay; **`clearPageTransitionBlurStyles()`** menghapus filter dari section/main tanpa menyisakan `blur(0px)`. |

Commit referensi: `6831bfb` (modal/body transform); perbaikan filter transisi di commit terpisah (lihat git log).

---

## Jika masalah yang sama muncul lagi (checklist)

1. **Cek `body` (dan `html`) di `globals.css` atau CSS lain**  
   - Apakah ada `transform`, `filter`, `perspective` pada `body`?  
   - Jika ya, **hapus dari `body`** atau pindahkan ke wrapper dalam (misalnya div pembungkus konten halaman), **bukan** ke elemen yang menjadi ancestor dari semua portal ke `body`.

2. **Cek `ModalPortal` / `createPortal(..., document.body)`**  
   - Pastikan wrapper luar memakai **`position: fixed`** + **`inset: 0`** (atau `top/left/right/bottom: 0`) relatif viewport **setelah** `body` bersih dari transform.

3. **Cek backdrop dalam modal**  
   - Hindari hanya `absolute inset-0` di dalam kontainer yang salah; untuk aman, backdrop fullscreen bisa **`fixed inset-0`** + **`overflow-y-auto`** bila konten form tinggi.

4. **Cek double scroll-lock**  
   - Beberapa komponen mungkin set `body.style.overflow = 'hidden'` tanpa restore di cleanup; pastikan `useEffect` cleanup mengembalikan nilai sebelumnya.

5. **Quick repro**  
   - Login admin → buka Products → scroll ke grid → klik Edit. Modal harus **di tengah viewport**, scroll background terkunci sampai modal ditutup.

---

## Hal yang tidak boleh dilakukan (regression risk)

- Menambahkan **`transform` pada `body`** “untuk performa” tanpa menguji **semua modal** yang di-portal ke `body`.
- Mem-portal modal ke dalam subtree yang punya **`transform`** / **`filter`** tanpa sadar (efeknya sama: `fixed` “pecah”).

---

## Referensi cepat untuk Cursor / AI

**Keyword:** `fixed modal wrong position`, `modal hero top`, `scroll freeze modal`, `body transform translateZ`, `body filter blur`, `blur(0px) containing block`, `PageTransitionOverlay`, `containing block`, `ModalPortal`, `createPortal body`, `hero video parallax scroll`.

**Inti jawaban:** `position: fixed` + ancestor `body` dengan **`transform`** atau **`filter`** (termasuk `blur(0px)`) → fixed tidak relatif viewport → modal/video hero/admin controls “ikut scroll”. **Solusi:** jangan `transform`/`filter` pada `body`; transisi blur pakai overlay `backdrop-filter`; cleanup filter dengan `removeProperty`; portal modal dengan `fixed` + lock scroll yang benar.
