/**
 * DEEP ANALYSIS: Verifikasi bahwa logs November, Desember, dan Januari
 * benar-benar sudah dihapus dari database
 * 
 * Jalankan: node scripts/verify-purge-deep-analysis.js
 * Pastikan .env punya DATABASE_URL dan R2 credentials
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Import R2 client functions
const {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "silverking-assets";
const R2_ENDPOINT = R2_ACCOUNT_ID
  ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : null;

const r2Client = R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    })
  : null;

function getMonthRange(month, year) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

async function checkR2File(filename) {
  if (!r2Client) {
    return { exists: false, error: "R2 client not configured" };
  }

  try {
    const key = `reports/scan-logs/${filename}`;
    await r2Client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
    return { exists: true, key };
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return { exists: false, key: `reports/scan-logs/${filename}` };
    }
    return { exists: false, error: error.message };
  }
}

async function verifyMonth(month, year, label) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`VERIFIKASI MENDALAM: ${label}`);
  console.log(`${"=".repeat(60)}\n`);

  const { start, end } = getMonthRange(month, year);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  console.log(`📅 Periode: ${startISO} s/d ${endISO}\n`);

  // 1. COUNT QUERY - Cek jumlah total logs
  console.log("1️⃣  COUNT QUERY - Jumlah total logs:");
  const [page1Count, page2Count] = await Promise.all([
    prisma.qRScanLog.count({
      where: { scannedAt: { gte: start, lte: end } },
    }),
    prisma.gramQRScanLog.count({
      where: { scannedAt: { gte: start, lte: end } },
    }),
  ]);

  console.log(`   Page 1 (QRScanLog): ${page1Count}`);
  console.log(`   Page 2 (GramQRScanLog): ${page2Count}`);
  console.log(`   Total: ${page1Count + page2Count}`);
  console.log(`   Status: ${page1Count === 0 && page2Count === 0 ? "✅ KOSONG" : "❌ MASIH ADA DATA"}\n`);

  // 2. DETAILED QUERY - Cek apakah ada data dengan IP addresses
  console.log("2️⃣  DETAILED QUERY - Cek data dengan IP addresses:");
  const [page1WithIP, page2WithIP] = await Promise.all([
    prisma.qRScanLog.findMany({
      where: {
        scannedAt: { gte: start, lte: end },
        ip: { not: null },
      },
      select: {
        id: true,
        ip: true,
        scannedAt: true,
      },
      take: 5, // Limit untuk performance
    }),
    prisma.gramQRScanLog.findMany({
      where: {
        scannedAt: { gte: start, lte: end },
        ip: { not: null },
      },
      select: {
        id: true,
        ip: true,
        scannedAt: true,
      },
      take: 5,
    }),
  ]);

  console.log(`   Page 1 dengan IP: ${page1WithIP.length} records`);
  if (page1WithIP.length > 0) {
    console.log(`   ⚠️  DITEMUKAN IP ADDRESSES:`);
    page1WithIP.forEach((log) => {
      console.log(`      - ID: ${log.id}, IP: ${log.ip}, Date: ${log.scannedAt}`);
    });
  }
  console.log(`   Page 2 dengan IP: ${page2WithIP.length} records`);
  if (page2WithIP.length > 0) {
    console.log(`   ⚠️  DITEMUKAN IP ADDRESSES:`);
    page2WithIP.forEach((log) => {
      console.log(`      - ID: ${log.id}, IP: ${log.ip}, Date: ${log.scannedAt}`);
    });
  }
  console.log(`   Status: ${page1WithIP.length === 0 && page2WithIP.length === 0 ? "✅ TIDAK ADA IP" : "❌ MASIH ADA IP"}\n`);

  // 3. RAW SQL QUERY - Double check dengan raw SQL
  console.log("3️⃣  RAW SQL QUERY - Double check dengan query langsung:");
  const [rawPage1, rawPage2] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM QRScanLog
      WHERE scannedAt >= ${start}
        AND scannedAt <= ${end}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM GramQRScanLog
      WHERE scannedAt >= ${start}
        AND scannedAt <= ${end}
    `,
  ]);

  const rawPage1Count = Number(rawPage1[0]?.count || 0);
  const rawPage2Count = Number(rawPage2[0]?.count || 0);
  console.log(`   Page 1 (Raw SQL): ${rawPage1Count}`);
  console.log(`   Page 2 (Raw SQL): ${rawPage2Count}`);
  console.log(`   Total (Raw SQL): ${rawPage1Count + rawPage2Count}`);
  console.log(`   Status: ${rawPage1Count === 0 && rawPage2Count === 0 ? "✅ KOSONG" : "❌ MASIH ADA DATA"}\n`);

  // 4. CHECK SCANLOGSUMMARY - Cek apakah rekapan sudah dibuat
  console.log("4️⃣  SCANLOGSUMMARY - Cek rekapan bulanan:");
  const summaries = await prisma.scanLogSummary.findMany({
    where: {
      date: {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0),
      },
    },
  });

  console.log(`   Jumlah rekapan: ${summaries.length}`);
  if (summaries.length > 0) {
    const totalScans = summaries.reduce((sum, s) => sum + s.totalScans, 0);
    console.log(`   Total scans di rekapan: ${totalScans}`);
    console.log(`   ✅ REKAPAN SUDAH DIBUAT`);
  } else {
    console.log(`   ⚠️  REKAPAN BELUM DIBUAT`);
  }
  console.log();

  // 5. CHECK R2 CSV FILE - Cek apakah CSV sudah di-upload ke R2
  console.log("5️⃣  R2 CSV FILE - Cek file CSV di R2:");
  const filename = `${year}-${String(month).padStart(2, "0")}.csv`;
  const r2Check = await checkR2File(filename);
  if (r2Check.exists) {
    console.log(`   ✅ CSV ditemukan di R2: ${r2Check.key}`);
  } else {
    console.log(`   ${r2Check.error ? "❌" : "⚠️"} CSV ${r2Check.error ? `tidak ditemukan: ${r2Check.error}` : `tidak ditemukan di: ${r2Check.key}`}`);
  }
  console.log();

  // 6. FINAL VERIFICATION SUMMARY
  console.log("6️⃣  RINGKASAN VERIFIKASI:");
  const isDatabaseEmpty = page1Count === 0 && page2Count === 0 && rawPage1Count === 0 && rawPage2Count === 0;
  const hasNoIP = page1WithIP.length === 0 && page2WithIP.length === 0;
  const hasSummary = summaries.length > 0;
  const hasR2File = r2Check.exists;

  console.log(`   Database kosong: ${isDatabaseEmpty ? "✅ YA" : "❌ TIDAK"}`);
  console.log(`   Tidak ada IP: ${hasNoIP ? "✅ YA" : "❌ TIDAK"}`);
  console.log(`   Rekapan dibuat: ${hasSummary ? "✅ YA" : "⚠️  BELUM"}`);
  console.log(`   CSV di R2: ${hasR2File ? "✅ YA" : "⚠️  BELUM"}`);

  const fullyPurged = isDatabaseEmpty && hasNoIP && hasSummary && hasR2File;
  const partiallyPurged = isDatabaseEmpty && hasNoIP;

  console.log(`\n   ${"─".repeat(50)}`);
  if (fullyPurged) {
    console.log(`   ✅ STATUS: PURGE LENGKAP & VERIFIED`);
    console.log(`      - Database kosong`);
    console.log(`      - Tidak ada IP addresses`);
    console.log(`      - Rekapan sudah dibuat`);
    console.log(`      - CSV tersimpan di R2`);
  } else if (partiallyPurged) {
    console.log(`   ⚠️  STATUS: PURGE SEBAGIAN`);
    console.log(`      - Database kosong ✅`);
    console.log(`      - Tidak ada IP addresses ✅`);
    if (!hasSummary) console.log(`      - Rekapan belum dibuat ⚠️`);
    if (!hasR2File) console.log(`      - CSV belum di R2 ⚠️`);
  } else {
    console.log(`   ❌ STATUS: PURGE BELUM LENGKAP`);
    console.log(`      - Database masih ada data: ${page1Count + page2Count} records`);
    if (!hasNoIP) console.log(`      - Masih ada IP addresses: ${page1WithIP.length + page2WithIP.length} records`);
  }
  console.log(`   ${"─".repeat(50)}\n`);

  return {
    month,
    year,
    label,
    isDatabaseEmpty,
    hasNoIP,
    hasSummary,
    hasR2File,
    fullyPurged,
    page1Count,
    page2Count,
    rawPage1Count,
    rawPage2Count,
    page1WithIP: page1WithIP.length,
    page2WithIP: page2WithIP.length,
    summariesCount: summaries.length,
  };
}

async function main() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  DEEP ANALYSIS: VERIFIKASI PURGE LOGS                     ║");
  console.log("║  November, Desember 2025 & Januari 2026                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const months = [
    { month: 11, year: 2025, label: "November 2025" },
    { month: 12, year: 2025, label: "Desember 2025" },
    { month: 1, year: 2026, label: "Januari 2026" },
  ];

  const results = [];

  for (const { month, year, label } of months) {
    const result = await verifyMonth(month, year, label);
    results.push(result);
  }

  // FINAL SUMMARY
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  RINGKASAN AKHIR - SEMUA BULAN                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  results.forEach((result) => {
    const status = result.fullyPurged
      ? "✅ PURGE LENGKAP"
      : result.isDatabaseEmpty && result.hasNoIP
      ? "⚠️  PURGE SEBAGIAN"
      : "❌ BELUM PURGE";
    console.log(`${result.label}: ${status}`);
    console.log(`  - Database: ${result.page1Count + result.page2Count} logs`);
    console.log(`  - IP addresses: ${result.page1WithIP + result.page2WithIP} records`);
    console.log(`  - Rekapan: ${result.summariesCount > 0 ? "✅" : "❌"}`);
    console.log(`  - CSV R2: ${result.hasR2File ? "✅" : "❌"}`);
    console.log();
  });

  const allFullyPurged = results.every((r) => r.fullyPurged);
  const allDatabaseEmpty = results.every((r) => r.isDatabaseEmpty && r.hasNoIP);

  console.log("╔════════════════════════════════════════════════════════════╗");
  if (allFullyPurged) {
    console.log("║  ✅ KESIMPULAN: SEMUA BULAN SUDAH DI-PURGE LENGKAP        ║");
    console.log("║     - Database kosong untuk semua bulan                   ║");
    console.log("║     - Tidak ada IP addresses tersisa                      ║");
    console.log("║     - Rekapan sudah dibuat                                ║");
    console.log("║     - CSV tersimpan di R2                                 ║");
  } else if (allDatabaseEmpty) {
    console.log("║  ⚠️  KESIMPULAN: DATABASE KOSONG TAPI PURGE BELUM LENGKAP ║");
    console.log("║     - Database kosong untuk semua bulan ✅                 ║");
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

main()
  .catch((e) => {
    console.error("\n❌ ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
