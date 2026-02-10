/**
 * Verifikasi purge untuk semua bulan (Nov, Des, Jan) via API
 * 
 * Jalankan: node scripts/verify-purge-all-months.js
 * Pastikan .env punya NEXTAUTH_SECRET dan DATABASE_URL
 * 
 * Script ini akan memanggil API endpoint untuk verifikasi mendalam
 */

require("dotenv").config();

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@silverking.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

async function login() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        redirect: "false",
        json: "true",
      }),
    });

    if (!res.ok) {
      throw new Error(`Login failed: ${res.status}`);
    }

    const cookies = res.headers.get("set-cookie");
    return cookies;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

async function verifyMonth(month, year, cookies) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/admin/verify-purge-deep?month=${month}&year=${year}`,
      {
        headers: {
          Cookie: cookies || "",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Error verifying ${month}/${year}:`, error);
    return null;
  }
}

async function main() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  DEEP ANALYSIS: VERIFIKASI PURGE LOGS (VIA API)           ║");
  console.log("║  November, Desember 2025 & Januari 2026                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`👤 Admin Email: ${ADMIN_EMAIL}\n`);

  console.log("🔐 Logging in...");
  const cookies = await login();
  if (!cookies) {
    console.error("❌ Failed to login. Please check credentials.");
    process.exit(1);
  }
  console.log("✅ Login successful\n");

  const months = [
    { month: 11, year: 2025, label: "November 2025" },
    { month: 12, year: 2025, label: "Desember 2025" },
    { month: 1, year: 2026, label: "Januari 2026" },
  ];

  const results = [];

  for (const { month, year, label } of months) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`VERIFIKASI: ${label}`);
    console.log(`${"=".repeat(60)}\n`);

    const result = await verifyMonth(month, year, cookies);
    if (!result) {
      console.log(`❌ Failed to verify ${label}`);
      continue;
    }

    console.log(`📅 Periode: ${result.period.start} s/d ${result.period.end}\n`);

    console.log("1️⃣  COUNT QUERY (Prisma):");
    console.log(`   Page 1: ${result.verification.prismaCount.page1}`);
    console.log(`   Page 2: ${result.verification.prismaCount.page2}`);
    console.log(`   Total: ${result.verification.prismaCount.total}`);
    console.log(`   Status: ${result.verification.prismaCount.total === 0 ? "✅ KOSONG" : "❌ MASIH ADA"}\n`);

    console.log("2️⃣  COUNT QUERY (Raw SQL):");
    console.log(`   Page 1: ${result.verification.rawSqlCount.page1}`);
    console.log(`   Page 2: ${result.verification.rawSqlCount.page2}`);
    console.log(`   Total: ${result.verification.rawSqlCount.total}`);
    console.log(`   Status: ${result.verification.rawSqlCount.total === 0 ? "✅ KOSONG" : "❌ MASIH ADA"}\n`);

    console.log("3️⃣  IP ADDRESSES CHECK:");
    console.log(`   Page 1 dengan IP: ${result.verification.ipAddresses.page1.length}`);
    console.log(`   Page 2 dengan IP: ${result.verification.ipAddresses.page2.length}`);
    console.log(`   Total dengan IP: ${result.verification.ipAddresses.totalFound}`);
    if (result.verification.ipAddresses.totalFound > 0) {
      console.log(`   ⚠️  DITEMUKAN IP ADDRESSES:`);
      [...result.verification.ipAddresses.page1, ...result.verification.ipAddresses.page2].forEach((log) => {
        console.log(`      - ID: ${log.id}, IP: ${log.ip}, Date: ${log.scannedAt}`);
      });
    }
    console.log(`   Status: ${result.verification.ipAddresses.totalFound === 0 ? "✅ TIDAK ADA IP" : "❌ MASIH ADA IP"}\n`);

    console.log("4️⃣  SCANLOGSUMMARY:");
    console.log(`   Rekapan dibuat: ${result.status.hasSummary ? "✅ YA" : "❌ TIDAK"}`);
    console.log(`   Jumlah rekapan: ${result.verification.summary.recordCount}`);
    console.log(`   Total scans di rekapan: ${result.verification.summary.totalScans}\n`);

    console.log("5️⃣  R2 CSV FILE:");
    console.log(`   CSV di R2: ${result.status.hasR2File ? "✅ YA" : "❌ TIDAK"}`);
    if (result.status.hasR2File) {
      console.log(`   Filename: ${result.verification.r2Csv.filename}`);
      console.log(`   Key: ${result.verification.r2Csv.key}`);
      if (result.verification.r2Csv.downloadUrl) {
        console.log(`   Download URL: ${result.verification.r2Csv.downloadUrl.substring(0, 80)}...`);
      }
    }
    console.log();

    console.log("6️⃣  RINGKASAN:");
    console.log(`   Database kosong: ${result.status.isDatabaseEmpty ? "✅ YA" : "❌ TIDAK"}`);
    console.log(`   Tidak ada IP: ${result.status.hasNoIP ? "✅ YA" : "❌ TIDAK"}`);
    console.log(`   Rekapan dibuat: ${result.status.hasSummary ? "✅ YA" : "⚠️  BELUM"}`);
    console.log(`   CSV di R2: ${result.status.hasR2File ? "✅ YA" : "⚠️  BELUM"}`);
    console.log(`\n   ${result.conclusion}\n`);

    results.push({ ...result, label });
  }

  // FINAL SUMMARY
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  RINGKASAN AKHIR - SEMUA BULAN                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  results.forEach((result) => {
    const status = result.status.fullyPurged
      ? "✅ PURGE LENGKAP"
      : result.status.isDatabaseEmpty && result.status.hasNoIP
      ? "⚠️  PURGE SEBAGIAN"
      : "❌ BELUM PURGE";
    console.log(`${result.label}: ${status}`);
    console.log(`  - Database: ${result.verification.prismaCount.total} logs`);
    console.log(`  - IP addresses: ${result.verification.ipAddresses.totalFound} records`);
    console.log(`  - Rekapan: ${result.status.hasSummary ? "✅" : "❌"} (${result.verification.summary.recordCount} records)`);
    console.log(`  - CSV R2: ${result.status.hasR2File ? "✅" : "❌"}`);
    console.log();
  });

  const allFullyPurged = results.every((r) => r.status.fullyPurged);
  const allDatabaseEmpty = results.every((r) => r.status.isDatabaseEmpty && r.status.hasNoIP);

  console.log("╔════════════════════════════════════════════════════════════╗");
  if (allFullyPurged) {
    console.log("║  ✅ KESIMPULAN: SEMUA BULAN SUDAH DI-PURGE LENGKAP        ║");
    console.log("║     - Database kosong untuk semua bulan                   ║");
    console.log("║     - Tidak ada IP addresses tersisa                      ║");
    console.log("║     - Rekapan sudah dibuat                                ║");
    console.log("║     - CSV tersimpan di R2                                 ║");
  } else if (allDatabaseEmpty) {
    console.log("║  ⚠️  KESIMPULAN: DATABASE KOSONG TAPI PURGE BELUM LENGKAP ║");
    console.log("║     - Database kosong untuk semua bulan ✅               ║");
    console.log("║     - Tidak ada IP addresses ✅                            ║");
    console.log("║     - Beberapa rekapan/CSV mungkin belum dibuat           ║");
  } else {
    console.log("║  ❌ KESIMPULAN: MASIH ADA DATA DI DATABASE                ║");
    console.log("║     - Beberapa bulan masih memiliki logs                  ║");
    console.log("║     - Perlu dilakukan purge ulang                         ║");
  }
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");
}

main().catch((e) => {
  console.error("\n❌ ERROR:", e);
  process.exit(1);
});
