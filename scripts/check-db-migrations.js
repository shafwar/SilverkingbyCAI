// Simple script to check database migration status
// Usage: railway run node scripts/check-db-migrations.js

const { PrismaClient } = require("@prisma/client");

async function checkMigrations() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Checking database migrations...\n");

    // Try to query GramProductItem with rootKeyHash field
    // If this works, the migration was applied successfully
    const testQuery = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'GramProductItem' 
      AND COLUMN_NAME IN ('rootKeyHash', 'rootKey', 'serialCode')
      ORDER BY COLUMN_NAME
    `;

    console.log("✅ Database columns found:");
    testQuery.forEach((col) => {
      console.log(`   - ${col.COLUMN_NAME}`);
    });

    const hasRootKeyHash = testQuery.some((col) => col.COLUMN_NAME === "rootKeyHash");
    const hasRootKey = testQuery.some((col) => col.COLUMN_NAME === "rootKey");
    const hasSerialCode = testQuery.some((col) => col.COLUMN_NAME === "serialCode");

    console.log("\n📊 Migration Status:");
    console.log(`   rootKeyHash: ${hasRootKeyHash ? "✅ Applied" : "❌ Missing"}`);
    console.log(`   rootKey: ${hasRootKey ? "✅ Applied" : "❌ Missing"}`);
    console.log(`   serialCode: ${hasSerialCode ? "✅ Applied" : "❌ Missing"}`);

    if (!hasRootKeyHash || !hasRootKey || !hasSerialCode) {
      console.error("\n❌ Some migrations are missing!");
      console.error("   Run: railway run npx prisma migrate deploy");
      process.exit(1);
    }

    // Check item count
    const itemCount = await prisma.gramProductItem.count();
    console.log(`\n📦 Total GramProductItem records: ${itemCount}`);

    if (itemCount > 0) {
      const itemsWithHash = await prisma.gramProductItem.count({
        where: { rootKeyHash: { not: null } },
      });
      const itemsWithPlainKey = await prisma.gramProductItem.count({
        where: { rootKey: { not: null } },
      });

      console.log(`   Items with rootKeyHash: ${itemsWithHash}`);
      console.log(`   Items with rootKey (plain): ${itemsWithPlainKey}`);
    }

    console.log("\n✅ All migrations verified successfully!");
  } catch (error) {
    console.error("\n❌ Error checking migrations:", error.message);

    if (error.message.includes("rootKeyHash") || error.message.includes("Unknown column")) {
      console.error("\n⚠️  CRITICAL: Database schema is out of sync!");
      console.error("   Run: railway run npx prisma migrate deploy");
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrations();
