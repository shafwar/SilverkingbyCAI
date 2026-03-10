import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateAndStoreQR } from "../src/lib/qr";
import { getVerifyUrl } from "../src/utils/constants";

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

  // Seed distributors if none exist (runs every time seed runs, idempotent)
  const distributorCount = await prisma.distributor.count();
  if (distributorCount === 0) {
    await prisma.distributor.createMany({
      data: [
        {
          distributorName: "Youceu",
          storeName: "Toko Kang Emas",
          address:
            "Jl. Ahmad Yani No.161, Sumur Bandung – Kebon Pisang, Kosambi, Bandung",
          city: "Bandung",
          phone: "082297131527",
          mapLink: "https://maps.app.goo.gl/xBZELvl6oLOztuFlJ",
          status: "ACTIVE",
        },
        {
          distributorName: "Tasik",
          storeName: "Info menyusul",
          address: "Detail alamat dan kontak menyusul",
          city: "Tasikmalaya",
          phone: "-",
          mapLink: null,
          status: "ACTIVE",
        },
      ],
    });
    console.log("✨ Seeded 2 distributors (Bandung + Tasik placeholder)");
  }

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

    // Use centralized function to get verify URL
    const verifyUrl = getVerifyUrl(item.serialCode);
    const { url } = await generateAndStoreQR(item.serialCode, verifyUrl, item.name);

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
