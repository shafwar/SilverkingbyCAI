import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "mysql://root:@localhost:3306/silverkingbycai"
    }
  }
});

async function main() {
  console.log("🌱 Starting database seed...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@silverking.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@silverking.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created:", admin.email);

  // Create staff user
  const staffPassword = await bcrypt.hash("staff123", 10);
  
  const staff = await prisma.user.upsert({
    where: { email: "staff@silverking.com" },
    update: {},
    create: {
      name: "Staff User",
      email: "staff@silverking.com",
      password: staffPassword,
      role: "STAFF",
    },
  });

  console.log("✅ Staff user created:", staff.email);
  
  console.log("\n📋 Login Credentials:");
  console.log("════════════════════════════════════════");
  console.log("Admin:");
  console.log("  Email: admin@silverking.com");
  console.log("  Password: admin123");
  console.log("\nStaff:");
  console.log("  Email: staff@silverking.com");
  console.log("  Password: staff123");
  console.log("════════════════════════════════════════\n");

  console.log("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

