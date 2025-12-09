/**
 * Script to test database schema and verify rootKeyHash and rootKey fields exist
 * Run with: railway run --service MySQL node scripts/test-db-schema.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testDatabaseSchema() {
  try {
    console.log("🔍 Testing database schema...\n");

    // Test 1: Check if GramProductItem table exists and has required fields
    console.log("1. Checking GramProductItem schema...");
    const sampleItem = await prisma.gramProductItem.findFirst({
      select: {
        id: true,
        uniqCode: true,
        serialCode: true,
        rootKeyHash: true,
        rootKey: true,
        createdAt: true,
      },
    });

    if (sampleItem) {
      console.log("✅ GramProductItem table exists");
      console.log("   Sample item:", {
        id: sampleItem.id,
        uniqCode: sampleItem.uniqCode,
        serialCode: sampleItem.serialCode,
        hasRootKeyHash: !!sampleItem.rootKeyHash,
        hasRootKey: !!sampleItem.rootKey,
        rootKeyHashLength: sampleItem.rootKeyHash?.length || 0,
      });
    } else {
      console.log("⚠️  GramProductItem table exists but no items found");
      console.log("   This is OK if no batches have been created yet");
    }

    // Test 2: Check latest batch
    console.log("\n2. Checking latest GramProductBatch...");
    const latestBatch = await prisma.gramProductBatch.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          take: 5,
          select: {
            id: true,
            uniqCode: true,
            serialCode: true,
            rootKeyHash: true,
            rootKey: true,
          },
        },
      },
    });

    if (latestBatch) {
      console.log("✅ Latest batch found:", {
        id: latestBatch.id,
        name: latestBatch.name,
        quantity: latestBatch.quantity,
        itemCount: latestBatch.items.length,
      });

      if (latestBatch.items.length > 0) {
        console.log("\n   Sample items from latest batch:");
        latestBatch.items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.serialCode}`, {
            uniqCode: item.uniqCode,
            hasRootKeyHash: !!item.rootKeyHash,
            hasRootKey: !!item.rootKey,
            rootKey: item.rootKey || "N/A",
          });
        });
      }
    } else {
      console.log("⚠️  No batches found");
    }

    // Test 3: Count total items
    console.log("\n3. Counting total GramProductItems...");
    const totalItems = await prisma.gramProductItem.count();
    console.log(`   Total items: ${totalItems}`);

    // Test 4: Check items with rootKeyHash
    const itemsWithHash = await prisma.gramProductItem.count({
      where: { rootKeyHash: { not: null } },
    });
    console.log(`   Items with rootKeyHash: ${itemsWithHash}`);

    // Test 5: Check items with rootKey (plain text)
    const itemsWithPlainKey = await prisma.gramProductItem.count({
      where: { rootKey: { not: null } },
    });
    console.log(`   Items with rootKey (plain text): ${itemsWithPlainKey}`);

    console.log("\n✅ Database schema test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error testing database schema:", error);
    if (error.message.includes("rootKeyHash")) {
      console.error("\n⚠️  CRITICAL: rootKeyHash field not found!");
      console.error("   Please run: railway run --service MySQL npx prisma migrate deploy");
    } else if (error.message.includes("rootKey")) {
      console.error("\n⚠️  CRITICAL: rootKey field not found!");
      console.error("   Please run: railway run --service MySQL npx prisma migrate deploy");
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseSchema();
