# 📧 Email Notification Setup - Feedback Form

**Tanggal:** Februari 2026  
**Status:** ✅ READY TO IMPLEMENT

## 🎯 Tujuan

Mengirim email notification otomatis ke admin ketika ada pesan baru dari contact form (Get in Touch).

---

## 📋 Step-by-Step Implementation

### **STEP 1: Pilih Email Service Provider**

Kami akan menggunakan **Resend** karena:
- ✅ Free tier: 3,000 emails/bulan
- ✅ Mudah integrasi dengan Next.js
- ✅ API yang modern dan cepat
- ✅ Good deliverability
- ✅ Support untuk HTML templates

**Alternatif lain:**
- SendGrid (free: 100 emails/hari)
- Mailgun (free: 5,000 emails/bulan)
- Nodemailer + SMTP (Gmail, Outlook, dll)

---

### **STEP 2: Daftar & Setup Resend Account**

1. **Daftar di Resend:**
   - Kunjungi: https://resend.com
   - Sign up dengan email Anda
   - Verifikasi email

2. **Buat API Key:**
   - Login ke dashboard Resend
   - Pergi ke **API Keys** → **Create API Key**
   - Beri nama: `Silver King Production`
   - Copy API key (hanya muncul sekali!)

3. **Verify Domain (Opsional tapi Recommended):**
   - Untuk production, verify domain Anda
   - Tambahkan DNS records yang diberikan Resend
   - Ini meningkatkan deliverability

---

### **STEP 3: Install Dependencies**

```bash
npm install resend
```

---

### **STEP 4: Setup Environment Variables**

Tambahkan ke `.env` (local) dan Railway (production):

```bash
# Resend Email Service
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxx"
ADMIN_EMAIL="admin@cahayasilverking.id"  # Email tujuan untuk notifikasi
FROM_EMAIL="noreply@cahayasilverking.id"  # Email pengirim (harus verified domain atau gunakan onboarding@resend.dev untuk testing)
```

**Untuk Railway:**
```bash
railway variables set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxx"
railway variables set ADMIN_EMAIL="admin@cahayasilverking.id"
railway variables set FROM_EMAIL="noreply@cahayasilverking.id"
```

**Catatan:**
- Untuk testing, gunakan `onboarding@resend.dev` sebagai `FROM_EMAIL`
- Untuk production, verify domain dulu di Resend dashboard

---

### **STEP 5: Buat Email Utility Function**

File: `src/lib/email.ts`

Fungsi ini akan:
- Mengirim email notification ke admin
- Handle error dengan baik
- Support HTML template

---

### **STEP 6: Update API Route**

File: `src/app/api/feedback/route.ts`

Setelah feedback berhasil disimpan ke database, kirim email notification.

---

### **STEP 7: Testing**

1. **Test di Local:**
   ```bash
   npm run dev
   ```
   - Submit form di `/contact`
   - Cek email admin

2. **Test di Production:**
   - Deploy ke Railway
   - Submit form di production
   - Cek email admin

---

## 🔒 Security Best Practices

1. **Jangan hardcode API keys** - selalu gunakan environment variables
2. **Rate limiting** - Resend sudah handle, tapi bisa tambahkan di API route
3. **Validate input** - sudah ada di API route
4. **Error handling** - jangan expose error details ke client

---

## 📊 Monitoring & Logging

- Resend dashboard menyediakan analytics:
  - Email sent
  - Delivery rate
  - Open rate (jika enable tracking)
  - Bounce rate

---

## 🚨 Troubleshooting

### Email tidak terkirim?
1. Cek API key di environment variables
2. Cek Resend dashboard untuk error logs
3. Pastikan `FROM_EMAIL` sudah verified (atau gunakan `onboarding@resend.dev` untuk testing)
4. Cek spam folder

### Rate limit exceeded?
- Free tier: 3,000 emails/bulan
- Upgrade ke paid plan jika perlu lebih

---

## 📝 Next Steps (Optional Enhancements)

1. **Email Template yang lebih fancy:**
   - HTML template dengan branding
   - Responsive design
   - Dark mode support

2. **Auto-reply ke user:**
   - Kirim email konfirmasi ke user yang submit form
   - "Terima kasih, pesan Anda telah diterima"

3. **Email Digest:**
   - Kirim summary harian/mingguan semua feedback
   - Bukan real-time notification

4. **Email Threading:**
   - Reply langsung dari email
   - Update status di database

---

## ✅ Checklist Implementation

- [ ] Daftar Resend account
- [ ] Buat API key
- [ ] Install `resend` package
- [ ] Setup environment variables
- [ ] Buat email utility function
- [ ] Update API route
- [ ] Test di local
- [ ] Deploy ke production
- [ ] Test di production
- [ ] Monitor email delivery

---

## 📚 Resources

- Resend Documentation: https://resend.com/docs
- Resend API Reference: https://resend.com/docs/api-reference
- Next.js Email Guide: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#sending-emails
