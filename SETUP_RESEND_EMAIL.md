# Setup Email dengan Resend (Domain Profesional)

Panduan lengkap untuk setup email notification menggunakan Resend dengan domain `cahayasilverking.id`.

---

## 📋 Langkah 1: Daftar & Dapatkan API Key Resend

1. **Buka Resend**: https://resend.com
2. **Daftar/Login** dengan email Anda
3. **Verifikasi email** (cek inbox)
4. **Buka Dashboard** → **API Keys**
5. **Klik "Create API Key"**
6. **Beri nama**: `Silver King Production`
7. **Copy API Key** (format: `re_xxxxxxxxxxxxx`)
   - ⚠️ **PENTING**: Copy dan simpan dengan aman, hanya muncul sekali!

---

## 🌐 Langkah 2: Setup Domain di Resend

### 2.1 Tambahkan Domain

1. Di Resend Dashboard, buka **"Domains"**
2. Klik **"Add Domain"**
3. Masukkan domain: `cahayasilverking.id`
4. Klik **"Add Domain"**

### 2.2 Setup DNS Records

Resend akan memberikan **4 DNS records** yang perlu ditambahkan:

#### **Record 1: SPF (TXT)**
```
Type: TXT
Name: @ (atau cahayasilverking.id)
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600 (atau default)
```

#### **Record 2: DKIM (TXT)**
```
Type: TXT
Name: resend._domainkey
Value: (akan diberikan oleh Resend, panjang sekali)
TTL: 3600
```

#### **Record 3: DMARC (TXT)**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none;
TTL: 3600
```

#### **Record 4: Domain Verification (TXT)**
```
Type: TXT
Name: @
Value: (kode verifikasi dari Resend)
TTL: 3600
```

### 2.3 Tambahkan DNS Records di Domain Provider

**Cara menambahkan DNS records:**

1. **Login ke domain provider** Anda (misalnya: Namecheap, GoDaddy, Cloudflare, dll)
2. **Buka DNS Management** atau **DNS Settings**
3. **Tambahkan setiap record** sesuai yang diberikan Resend:
   - Klik **"Add Record"** atau **"Add DNS Record"**
   - Pilih **Type**: TXT
   - **Name/Host**: Sesuai instruksi Resend (bisa `@`, `resend._domainkey`, `_dmarc`)
   - **Value**: Copy-paste dari Resend
   - **TTL**: 3600 atau default
   - **Save**

**Contoh di Cloudflare:**
- Type: TXT
- Name: `@` (atau `cahayasilverking.id`)
- Content: `v=spf1 include:_spf.resend.com ~all`
- TTL: Auto

**Contoh di Namecheap:**
- Type: TXT Record
- Host: `@`
- Value: `v=spf1 include:_spf.resend.com ~all`
- TTL: Automatic

### 2.4 Verifikasi Domain

1. **Tunggu 5-15 menit** setelah menambahkan DNS records (propagasi DNS)
2. Kembali ke **Resend Dashboard** → **Domains**
3. Klik **"Verify"** atau refresh halaman
4. Status akan berubah menjadi **"Verified"** (hijau) jika berhasil

**Catatan:**
- DNS propagation bisa memakan waktu hingga 24 jam (biasanya 5-30 menit)
- Jika masih pending, tunggu beberapa saat dan coba verify lagi
- Pastikan semua records sudah ditambahkan dengan benar

---

## ⚙️ Langkah 3: Update Environment Variables

### 3.1 Update `.env` (Local Development)

Buka file `.env` dan isi:

```bash
# Resend Email Configuration
RESEND_API_KEY="re_your_actual_api_key_here"
RESEND_FROM_EMAIL="noreply@cahayasilverking.id"
ADMIN_EMAIL="admin@cahayasilverking.id"
```

**Contoh:**
```bash
RESEND_API_KEY="re_abc123xyz789"
RESEND_FROM_EMAIL="noreply@cahayasilverking.id"
ADMIN_EMAIL="your-email@gmail.com"  # Email Anda yang akan menerima notifikasi
```

### 3.2 Update Railway (Production)

1. **Buka Railway Dashboard**: https://railway.app
2. **Pilih project** Silver King
3. **Buka Variables** tab
4. **Tambahkan variables:**

```bash
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@cahayasilverking.id
ADMIN_EMAIL=your-email@gmail.com
```

Atau via CLI:
```bash
railway variables set RESEND_API_KEY="re_your_api_key"
railway variables set RESEND_FROM_EMAIL="noreply@cahayasilverking.id"
railway variables set ADMIN_EMAIL="your-email@gmail.com"
```

---

## 🧪 Langkah 4: Testing

### 4.1 Test Local

1. **Restart development server:**
   ```bash
   npm run dev
   ```

2. **Submit feedback** dari contact form di website

3. **Cek email:**
   - ✅ **Email Admin**: Notifikasi pesan baru
   - ✅ **Email User**: Auto-reply terima kasih

4. **Cek console log** untuk melihat status:
   ```
   Feedback notification email sent successfully: ...
   Feedback auto-reply email sent successfully: ...
   ```

### 4.2 Test Production

1. **Deploy ke Railway** dengan environment variables yang sudah di-set
2. **Submit feedback** dari production website
3. **Cek email** di inbox

---

## 📊 Monitoring & Analytics

Di Resend Dashboard, Anda bisa:
- **Lihat email yang terkirim** (Emails tab)
- **Cek delivery status** (delivered, bounced, etc.)
- **Lihat analytics** (open rate, click rate)
- **Cek logs** untuk troubleshooting

---

## 🔧 Troubleshooting

### Email tidak terkirim?

1. **Cek API Key:**
   - Pastikan `RESEND_API_KEY` sudah benar di `.env`
   - Pastikan tidak ada spasi atau karakter aneh

2. **Cek Domain Status:**
   - Pastikan domain sudah **Verified** di Resend
   - Cek DNS records sudah benar (bisa pakai tool: https://mxtoolbox.com)

3. **Cek Environment Variables:**
   - Pastikan `RESEND_FROM_EMAIL` menggunakan domain yang sudah verified
   - Format: `noreply@cahayasilverking.id` (bukan `noreply@resend.dev`)

4. **Cek Console Logs:**
   - Lihat error message di console
   - Error umum: "Domain not verified", "Invalid API key"

5. **Test dengan Resend Test Email:**
   - Di Resend Dashboard → **Emails** → **Send Test Email**
   - Pastikan bisa kirim test email dulu

### Domain tidak ter-verify?

1. **Cek DNS Records:**
   - Pastikan semua records sudah ditambahkan
   - Gunakan tool: https://dnschecker.org untuk cek propagation

2. **Tunggu Propagation:**
   - DNS bisa butuh waktu 5-30 menit (kadang hingga 24 jam)
   - Coba verify lagi setelah beberapa saat

3. **Cek Format Records:**
   - Pastikan tidak ada typo
   - Pastikan TTL sudah di-set

---

## 💰 Pricing Resend

- **Free Tier**: 3,000 emails/bulan
- **Pro**: $20/bulan untuk 50,000 emails
- **Enterprise**: Custom pricing

Untuk kebutuhan feedback notification, free tier sudah cukup!

---

## ✅ Checklist Setup

- [ ] Daftar Resend dan dapatkan API Key
- [ ] Tambahkan domain `cahayasilverking.id` di Resend
- [ ] Tambahkan semua DNS records di domain provider
- [ ] Verify domain di Resend (status hijau)
- [ ] Update `.env` dengan API key dan email
- [ ] Update Railway variables untuk production
- [ ] Test kirim email dari local
- [ ] Test kirim email dari production
- [ ] Cek email inbox (admin & user)

---

## 🎉 Selesai!

Setelah semua langkah selesai, sistem email notification akan otomatis:
- ✅ Kirim notifikasi ke admin saat ada feedback baru
- ✅ Kirim auto-reply ke user yang submit feedback
- ✅ Menggunakan domain profesional: `noreply@cahayasilverking.id`

**Email akan terlihat lebih profesional dan terpercaya!** 🚀
