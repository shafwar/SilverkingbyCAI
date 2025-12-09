const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verify() {
  try {
    console.log("🔍 Verifying database schema...\n");

    // Check if we can query GramProductItem with rootKeyHash
    const count = await prisma.gramProductItem.count();
    console.log(`✅ GramProductItem table accessible. Total items: ${count}`);

    if (count > 0) {
      const sample = await prisma.gramProductItem.findFirst({
        select: {
          id: true,
          uniqCode: true,
          serialCode: true,
          rootKeyHash: true,
          rootKey: true,
        },
      });

      console.log("\n📋 Sample item:");
      console.log(`   ID: ${sample.id}`);
      console.log(`   UniqCode: ${sample.uniqCode}`);
      console.log(`   SerialCode: ${sample.serialCode}`);
      console.log(`   Has rootKeyHash: ${!!sample.rootKeyHash}`);
      console.log(`   Has rootKey: ${!!sample.rootKey}`);
      console.log(`   RootKeyHash length: ${sample.rootKeyHash?.length || 0}`);

      if (!sample.rootKeyHash) {
        console.error("\n❌ ERROR: rootKeyHash field missing!");
        process.exit(1);
      }

      if (!sample.rootKey) {
        console.warn("\n⚠️  WARNING: rootKey (plain text) field missing!");
        console.warn("   This is OK for old items, but new items should have it.");
      }
    }

    console.log("\n✅ Database schema verification successful!");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("rootKeyHash")) {
      console.error("\n⚠️  CRITICAL: rootKeyHash field not found in database!");
      console.error("   Run: railway run npx prisma migrate deploy");
      process.exit(1);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
