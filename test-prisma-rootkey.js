const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testRootKeyHash() {
  try {
    console.log("🔍 Testing Prisma Client recognition of rootKeyHash...\n");

    // Try to access the model definition
    const modelFields = Object.keys(prisma.gramProductItem.fields || {});
    console.log("📋 Available fields in GramProductItem model:");
    modelFields.forEach((field) => {
      console.log(`   - ${field}`);
    });

    // Check if rootKeyHash is in the fields
    if (modelFields.includes("rootKeyHash")) {
      console.log("\n✅ rootKeyHash field is recognized by Prisma Client!");
    } else {
      console.log("\n❌ rootKeyHash field is NOT recognized by Prisma Client!");
      console.log("💡 Need to regenerate Prisma Client.");
    }

    // Try a simple query to see if it works
    console.log("\n🔍 Testing query with rootKeyHash...");
    const testItem = await prisma.gramProductItem.findFirst({
      select: {
        id: true,
        uniqCode: true,
        serialCode: true,
        rootKeyHash: true, // This should work if Prisma recognizes it
      },
    });

    if (testItem) {
      console.log("✅ Query successful! Sample item:");
      console.log(`   - ID: ${testItem.id}`);
      console.log(`   - UniqCode: ${testItem.uniqCode}`);
      console.log(`   - SerialCode: ${testItem.serialCode}`);
      console.log(
        `   - RootKeyHash: ${testItem.rootKeyHash ? testItem.rootKeyHash.substring(0, 20) + "..." : "NULL"}`
      );
    } else {
      console.log("ℹ️  No items found in database (this is OK if table is empty)");
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("rootKeyHash")) {
      console.error("\n💡 Prisma Client does not recognize rootKeyHash field!");
      console.error("💡 Solution: Regenerate Prisma Client with: npx prisma generate");
    }
  } finally {
    await prisma.$disconnect();
  }
}

testRootKeyHash();
