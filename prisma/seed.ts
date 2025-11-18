import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateAndStoreQR } from "../src/lib/qr";

const prisma = new PrismaClient();

const products = [
  { name: "Silver King Bar 250gr", weight: 250, serialCode: "SKA000001" },
  { name: "Silver King Bar 100gr", weight: 100, serialCode: "SKP000001" },
  { name: "Silver King Bar 50gr", weight: 50, serialCode: "SKN000001" },
  { name: "Silver King Bar 25gr", weight: 25, serialCode: "SKC000001" },
  { name: "Silver King Bar 10gr", weight: 10, serialCode: "SKI000001" },
  { name: "Silver King Bar 5gr", weight: 5, serialCode: "SKT000001" },
];

async function main() {
  console.log("🌱 Starting Silver King seed…");

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@silverking.com" },
  });

  if (!existingAdmin) {
    // Only delete and recreate if admin doesn't exist (first time seed)
    await prisma.qRScanLog.deleteMany();
    await prisma.qrRecord.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash("admin123", 12);

    await prisma.user.create({
      data: {
        email: "admin@silverking.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("✅ Admin account created: admin@silverking.com / admin123");
  } else {
    console.log("✅ Admin account already exists: admin@silverking.com / admin123");
    
    // Check if products exist
    const productCount = await prisma.product.count();
    if (productCount > 0) {
      console.log(`✅ Database already seeded with ${productCount} products`);
      return; // Exit early if already seeded
    }
  }

  for (const item of products) {
    const product = await prisma.product.create({
      data: {
        name: item.name,
        weight: item.weight,
        serialCode: item.serialCode,
      },
    });

    // Use production URL from environment or default to Railway URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://silverkingbycai-production.up.railway.app";
    const verifyUrl = `${baseUrl}/verify/${item.serialCode}`;
    const { url } = await generateAndStoreQR(item.serialCode, verifyUrl);

    await prisma.qrRecord.create({
      data: {
        productId: product.id,
        serialCode: item.serialCode,
        qrImageUrl: url,
      },
    });

    console.log(`✨ Seeded product ${item.serialCode}`);
  }

  console.log("🎉 Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
