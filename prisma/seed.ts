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

  // Seed journal articles if none exist (3 company-relevant, simple, fun-to-read)
  const journalCount = await prisma.journal.count();
  if (journalCount === 0) {
    await prisma.journal.createMany({
      data: [
        {
          slug: "why-purity-matters",
          titleId: "Mengapa Kemurnian Logam Mulia Penting",
          titleEn: "Why purity in precious metals matters",
          excerptId: "Dari spektrometri hingga segel QR — bagaimana Silver King memastikan setiap batangan memenuhi standar tertinggi.",
          excerptEn: "From spectrometry to QR seals — how Silver King ensures every bar meets the highest standards.",
          contentId: `<p>Kemurnian bukan sekadar angka di sertifikat. Di Silver King, kami menguji setiap batch dengan spektrometri in-house dan menautkannya ke identitas digital melalui segel QR. Hasilnya: kepercayaan yang bisa Anda verifikasi sendiri.</p><p>Proses ini membuat setiap batangan tidak hanya memenuhi standar industri, tetapi juga memberi Anda cerita yang transparan — dari pemurnian hingga ke tangan Anda.</p>`,
          contentEn: `<p>Purity isn't just a number on a certificate. At Silver King, we test every batch with in-house spectrometry and tie it to a digital identity via QR seals. The result: trust you can verify yourself.</p><p>This process ensures every bar not only meets industry standards but also gives you a transparent story — from refinement to your hands.</p>`,
          publishedAt: new Date(),
          sortOrder: 0,
        },
        {
          slug: "from-ore-to-your-hands",
          titleId: "Dari Bijih ke Tangan Anda",
          titleEn: "From ore to your hands",
          excerptId: "Jejak singkat bagaimana logam mulia Silver King dibuat — dengan kontrol ketat dan dokumentasi yang siap diaudit.",
          excerptEn: "A short trace of how Silver King precious metals are made — with tight controls and audit-ready documentation.",
          contentId: `<p>Setiap batangan Silver King memulai perjalanan dari bahan baku yang dipilih dengan ketat. Jalur fabrikasi kami — untuk emas, perak, dan paladium — dirancang untuk throughput tinggi tanpa mengorbankan kualitas.</p><p>Setelah pengecoran dan finishing, setiap produk mendapat serial unik dan segel QR. Satu pindai dan Anda bisa melihat kemurnian, asal usul, dan riwayat kepemilikan. Semua itu dalam genggaman.</p>`,
          contentEn: `<p>Every Silver King bar starts its journey from carefully selected raw materials. Our fabrication lines — for gold, silver, and palladium — are built for high throughput without compromising quality.</p><p>After casting and finishing, each product gets a unique serial and QR seal. One scan and you can see purity, provenance, and custody history. All in the palm of your hand.</p>`,
          publishedAt: new Date(),
          sortOrder: 1,
        },
        {
          slug: "trust-at-scale",
          titleId: "Kepercayaan dalam Skala Global",
          titleEn: "Trust at scale",
          excerptId: "ISO 9001, jejak audit, dan kemitraan yang transparan — bagaimana kami menjaga kepercayaan dari pabrik ke pelanggan.",
          excerptEn: "ISO 9001, audit trails, and transparent partnerships — how we maintain trust from factory to customer.",
          contentId: `<p>Silver King beroperasi di fasilitas yang diaudit dan berkomitmen pada kepatuhan yang transparan. Setiap perpindahan logam tercatat; setiap pindai QR memperbarui jejak yang dapat diaudit.</p><p>Bagi distributor dan pelanggan akhir, itu berarti ketenangan: Anda tidak hanya membeli logam mulia, tetapi juga cerita yang dapat diverifikasi dan dokumentasi yang siap untuk kepatuhan.</p>`,
          contentEn: `<p>Silver King operates in audited facilities and is committed to transparent compliance. Every metal movement is recorded; every QR scan updates an auditable trail.</p><p>For distributors and end customers, that means peace of mind: you're not just buying precious metal, but a verifiable story and documentation ready for compliance.</p>`,
          publishedAt: new Date(),
          sortOrder: 2,
        },
      ],
    });
    console.log("✨ Seeded 3 journal articles (company insights)");
  }

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
