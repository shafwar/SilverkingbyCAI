const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkGramItemSchema() {
  try {
    console.log("🔍 Checking GramProductItem table schema...\n");

    // Check if rootKeyHash column exists
    const result = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'GramProductItem'
      AND COLUMN_NAME = 'rootKeyHash'
    `);

    if (result.length === 0) {
      console.log("❌ Column rootKeyHash does NOT exist in GramProductItem table!\n");
      console.log("💡 Need to add the column manually or run migration.\n");

      // Show all columns
      const allColumns = await prisma.$queryRawUnsafe(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'GramProductItem'
        ORDER BY ORDINAL_POSITION
      `);

      console.log("📋 Current columns in GramProductItem:");
      allColumns.forEach((col) => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
      });

      return false;
    } else {
      console.log("✅ Column rootKeyHash EXISTS!\n");
      console.log("📋 Column details:");
      result.forEach((col) => {
        console.log(`   - Name: ${col.COLUMN_NAME}`);
        console.log(`   - Type: ${col.DATA_TYPE}`);
        console.log(`   - Nullable: ${col.IS_NULLABLE}`);
        console.log(`   - Default: ${col.COLUMN_DEFAULT || "NULL"}`);
      });
      return true;
    }
  } catch (error) {
    console.error("❌ Error checking schema:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

checkGramItemSchema().then((exists) => {
  process.exit(exists ? 0 : 1);
});
