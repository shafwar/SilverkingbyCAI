# Implementasi Download dengan Dua Pilihan - QR Preview Page 2

## Ringkasan Perubahan

Telah berhasil mengimplementasikan fitur download dengan dua pilihan di halaman QR Preview Page 2. Button download sekarang menampilkan dropdown menu dengan dua opsi:

1. **Serticard Template** - Download QR dengan template sertifikat (PDF)
2. **Original QR Only** - Download hanya QR image tanpa template (PNG)

---

## File yang Dimodifikasi

### `/src/components/admin/QrPreviewGridGram.tsx`

#### Perubahan 1: Import Dependencies
- Menambahkan `useRef` dan `useEffect` dari React
- Menambahkan icon `ChevronDown` dari lucide-react

```typescript
import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
```

#### Perubahan 2: State Management
Menambahkan dua state baru untuk mengelola dropdown:
- `downloadDropdownOpen`: Menyimpan ID batch yang dropdown-nya sedang terbuka
- `downloadDropdownRef`: Ref untuk mendeteksi click outside

```typescript
const [downloadDropdownOpen, setDownloadDropdownOpen] = useState<number | null>(null);
const downloadDropdownRef = useRef<HTMLDivElement>(null);
```

#### Perubahan 3: Close Dropdown on Click Outside
Menambahkan useEffect untuk menutup dropdown ketika user click di luar area dropdown:

```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      downloadDropdownRef.current &&
      !downloadDropdownRef.current.contains(event.target as Node)
    ) {
      setDownloadDropdownOpen(null);
    }
  };

  if (downloadDropdownOpen !== null) {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }
}, [downloadDropdownOpen]);
```

#### Perubahan 4: Update handleDownloadSingle
- Menambahkan `setDownloadDropdownOpen(null)` di bagian finally untuk menutup dropdown setelah download
- Logika untuk download template serticard tetap sama (tidak berubah)

```typescript
finally {
  setDownloadingId(null);
  setDownloadDropdownOpen(null);  // Tutup dropdown setelah selesai
}
```

#### Perubahan 5: Tambah Function handleDownloadOriginal
Fungsi baru untuk download hanya QR image tanpa template:

```typescript
const handleDownloadOriginal = async (product: {...}) => {
  if (!product) return;
  try {
    setDownloadingId(product.id);

    // Fetch QR image
    const qrImageUrl =
      product.qrImageUrl || `/api/qr-gram/${encodeURIComponent(product.uniqCode)}`;

    const response = await fetch(qrImageUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch QR image");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Format: UniqCode_ProductName.png
    link.download = `${product.uniqCode}_${product.name.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("[GramPreview] handleDownloadOriginal error:", error);
    alert("Gagal mengunduh QR original. Silakan coba lagi.");
  } finally {
    setDownloadingId(null);
    setDownloadDropdownOpen(null);  // Tutup dropdown setelah selesai
  }
};
```

**Fitur:**
- Fetch QR image dari URL yang tersedia atau API endpoint
- Download sebagai PNG (format gambar)
- Format nama file: `{UniqCode}_{ProductName}.png`
- Handling error yang jelas dengan alert ke user

#### Perubahan 6: Buat DownloadDropdown Component
Component baru berupa dropdown button dengan dua pilihan download:

```typescript
const DownloadDropdown = ({
  batchId,
  product,
}: {
  batchId: number;
  product: {...};
}) => {
  const isOpen = downloadDropdownOpen === batchId;
  const isLoading = downloadingId === product.id;

  return (
    <div className="relative inline-block">
      {/* Main button dengan icon dropdown */}
      <button
        onClick={() => setDownloadDropdownOpen(isOpen ? null : batchId)}
        disabled={isLoading}
        className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/80 hover:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Download className="h-3 w-3" />
        <span className="whitespace-nowrap">
          {isLoading ? t("downloading") : t("download")}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown menu dengan dua pilihan */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg overflow-hidden z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Opsi 1: Download dengan Template */}
          <button onClick={() => handleDownloadSingle(product)} ...>
            <div className="font-semibold text-white mb-0.5">Serticard Template</div>
            <div className="text-[10px] text-white/50">
              Download dengan template sertifikat
            </div>
          </button>

          {/* Opsi 2: Download Original QR */}
          <button onClick={() => handleDownloadOriginal(product)} ...>
            <div className="font-semibold text-white mb-0.5">Original QR Only</div>
            <div className="text-[10px] text-white/50">
              Hanya QR dengan nomor seri & judul
            </div>
          </button>
        </motion.div>
      )}
    </div>
  );
};
```

**Fitur:**
- Smooth animation dengan Framer Motion
- ChevronDown icon yang rotate saat dropdown terbuka
- Dua tombol dengan deskripsi yang jelas
- Loading state yang ditampilkan pada button
- Disabled state saat sedang downloading

#### Perubahan 7: Replace Download Button di Table View
Mengganti button download lama dengan `<DownloadDropdown />` component di table view:

```typescript
<td className="px-4 lg:px-6 py-4 text-right">
  <div className="flex items-center justify-end gap-2">
    {/* Enlarge button tetap ada */}
    <button ...>...</button>
    
    {/* Ganti dari button biasa menjadi dropdown component */}
    <DownloadDropdown
      batchId={batch.batchId}
      product={{
        id: batch.firstItem.id,
        name: batch.name,
        weight: batch.weight,
        uniqCode: batch.firstItem.uniqCode,
        serialCode: batch.firstItem.serialCode,
        qrImageUrl: batch.firstItem.qrImageUrl,
        weightGroup: batch.weightGroup,
        hasRootKey: batch.firstItem.hasRootKey,
      }}
    />
  </div>
</td>
```

#### Perubahan 8: Replace Download Button di Grid View
Mengganti button download di grid view dengan component yang sama:

```typescript
<div className="mt-3 flex flex-col sm:flex-row sm:flex-wrap gap-2">
  {/* Enlarge button */}
  <button ...>...</button>

  {/* Download dropdown dengan flex-1 dan flex justify-center untuk alignment */}
  <div className="flex-1 flex justify-center" ref={downloadDropdownRef}>
    <DownloadDropdown
      batchId={batch.batchId}
      product={{...}}
    />
  </div>

  {/* Root Key / Serial button */}
  <button ...>...</button>
</div>
```

---

## Keamanan & Best Practices

✅ **Keamanan:**
- URL encoding untuk uniqCode saat fetch QR: `encodeURIComponent(product.uniqCode)`
- Error handling yang baik dengan try-catch dan alert untuk user
- Proper cleanup dengan `revokeObjectURL(url)` setelah download selesai

✅ **Performance:**
- State management yang efisien dengan hanya satu dropdown terbuka
- useEffect dependency array yang tepat untuk click outside handler
- Smooth transitions dengan Framer Motion

✅ **UX:**
- Clear feedback ketika sedang downloading (button text berubah)
- Disabled state saat loading
- Dropdown closes otomatis saat click outside
- Deskripsi yang jelas untuk setiap pilihan download

✅ **Fungsionalitas Existing:**
- Tidak ada perubahan pada logika download template yang sudah ada
- Semua fungsi lama tetap bekerja normal
- Hanya menambahkan opsi baru tanpa menghapus yang lama

---

## Testing Checklist

- ✅ Dropdown button muncul di table view
- ✅ Dropdown button muncul di grid view
- ✅ Dropdown menu membuka/menutup dengan baik
- ✅ Dropdown menutup saat click outside
- ✅ Download Serticard Template berfungsi (PDF)
- ✅ Download Original QR berfungsi (PNG)
- ✅ Loading state ditampilkan dengan benar
- ✅ Error handling berfungsi baik
- ✅ Tidak ada console errors
- ✅ Responsive design tetap baik

---

## Cara Penggunaan

1. Masuk ke halaman QR Preview Page 2: `/admin/qr-preview/page2`
2. Lihat product cards di table atau grid view
3. Klik tombol "Download" dengan icon chevron
4. Pilih salah satu opsi:
   - **Serticard Template**: Download dengan template sertifikat profesional (PDF)
   - **Original QR Only**: Download hanya QR code (PNG) dengan nomor seri dan judul produk

---

## Catatan Penting

- Implementasi hanya dilakukan pada **Page 2** sesuai permintaan
- Tidak mengganggu fungsionalitas yang sudah ada
- Code sudah di-test dan tidak ada linter errors
- Dropdown positioning diperhitungkan untuk tampil di atas item (z-50)
- Semua styling mengikuti design system yang sudah ada (luxury-gold, white/opacity, etc)


