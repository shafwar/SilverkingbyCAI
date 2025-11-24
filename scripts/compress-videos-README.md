# Video Compression Script

Script ini digunakan untuk mengompres video background dengan FFmpeg sambil mempertahankan kualitas visual.

## Fitur

- ✅ **Mempertahankan Kualitas Visual**: Menggunakan CRF (Constant Rate Factor) encoding
- ✅ **Backup Otomatis**: Membuat backup sebelum kompresi
- ✅ **Validasi**: Hanya mengganti file jika hasil kompresi lebih kecil
- ✅ **Safe**: Tidak akan merusak file asli jika kompresi gagal

## Cara Penggunaan

```bash
# Jalankan script
./scripts/compress-videos.sh
```

## Setting Kompresi

- **CRF 22-23**: Kualitas tinggi dengan kompresi optimal untuk web
- **Preset Medium**: Balance antara kecepatan encoding dan kualitas
- **H.264 High Profile**: Kompatibel dengan semua browser modern
- **AAC Audio 128kbps**: Kualitas audio yang baik untuk background video
- **Fast Start**: Video dapat mulai diputar sebelum selesai download

## Hasil

Script akan:
1. Membuat backup di folder `public/videos/hero/backup_YYYYMMDD_HHMMSS/`
2. Mengompres semua video di `public/videos/hero/`
3. Hanya mengganti file asli jika hasil kompresi lebih kecil
4. Menampilkan laporan ukuran sebelum dan sesudah

## Catatan

- Video yang sudah dikompres dengan baik mungkin tidak akan lebih kecil
- Proses kompresi bisa memakan waktu beberapa menit per video
- Pastikan ada cukup space disk untuk backup dan file temporary

