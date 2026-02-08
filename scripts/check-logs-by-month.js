/**
 * Cek jumlah scan logs per bulan (November & Desember 2025)
 * Jalankan: node scripts/check-logs-by-month.js
 * Pastikan .env punya DATABASE_URL
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function getMonthRange(month, year) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

async function main() {
  const months = [
    { month: 11, year: 2025, label: "November 2025" },
    { month: 12, year: 2025, label: "Desember 2025" },
    { month: 1, year: 2026, label: "Januari 2026" },
  ];

  console.log("=== Cek Scan Logs per Bulan ===\n");

  for (const { month, year, label } of months) {
    const { start, end } = getMonthRange(month, year);

    const [page1Count, page2Count] = await Promise.all([
      prisma.qRScanLog.count({
        where: { scannedAt: { gte: start, lte: end } },
      }),
      prisma.gramQRScanLog.count({
        where: { scannedAt: { gte: start, lte: end } },
      }),
    ]);

    const total = page1Count + page2Count;
    const status = total > 0 ? "✅ ADA DATA" : "❌ KOSONG";
    console.log(`${label}:`);
    console.log(`  Page 1 (QRScanLog): ${page1Count}`);
    console.log(`  Page 2 (GramQRScanLog): ${page2Count}`);
    console.log(`  Total: ${total} ${status}\n`);
  }

  console.log("Selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
