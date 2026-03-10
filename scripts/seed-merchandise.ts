#!/usr/bin/env ts-node
/**
 * Seed MerchandiseItem with the 15 default images (Polo, T-Shirt & Cap, Knitware).
 * Run after merchandise:compress-upload so R2 has the files.
 * Uses same key pattern as compress-and-upload-merchandise.ts.
 */

import * as dotenv from "dotenv";
import * as path from "path";

const projectRoot = process.cwd();
[".env", ".env.local"].forEach((f) => {
  const p = path.join(projectRoot, f);
  try {
    require("fs").existsSync(p) && dotenv.config({ path: p });
  } catch {
    // ignore
  }
});

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const R2_BASE = (process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/$/, "");

const ITEMS: { category: string; keySuffix: string }[] = [
  { category: "polo", keySuffix: "polo-1-polo-1" },
  { category: "polo", keySuffix: "polo-2-polo-2" },
  { category: "polo", keySuffix: "polo-3-polo-3" },
  { category: "polo", keySuffix: "polo-4-polo-4" },
  { category: "tshirt_cap", keySuffix: "tshirt_cap-1-t-shirt-&-cap-1" },
  { category: "tshirt_cap", keySuffix: "tshirt_cap-2-t-shirt-&-cap-2" },
  { category: "tshirt_cap", keySuffix: "tshirt_cap-3-t-shirt-&-cap-3" },
  { category: "tshirt_cap", keySuffix: "tshirt_cap-4-t-shirt-&-cap-4" },
  { category: "tshirt_cap", keySuffix: "tshirt_cap-5-t-shirt-&-cap-5" },
  { category: "tshirt_cap", keySuffix: "tshirt_cap-6-t-shirt-&-cap-6" },
  { category: "knitware", keySuffix: "knitware-1-knitware-1" },
  { category: "knitware", keySuffix: "knitware-2-knitware-2" },
  { category: "knitware", keySuffix: "knitware-3-knitware-3" },
  { category: "knitware", keySuffix: "knitware-4-knitware-4" },
  { category: "knitware", keySuffix: "knitware-5-knitware-5" },
];

async function main() {
  if (!R2_BASE) {
    console.error("Set R2_PUBLIC_URL or NEXT_PUBLIC_R2_PUBLIC_URL in .env.local");
    process.exit(1);
  }

  const existing = await prisma.merchandiseItem.count();
  if (existing > 0) {
    console.log(`MerchandiseItem already has ${existing} records. Skip seed or delete first.`);
    process.exit(0);
  }

  for (let i = 0; i < ITEMS.length; i++) {
    const { category, keySuffix } = ITEMS[i];
    const imageUrl = `${R2_BASE}/static/images/merchandise/${keySuffix}.jpg`;
    await prisma.merchandiseItem.create({
      data: { category, imageUrl, sortOrder: i },
    });
  }
  console.log(`Seeded ${ITEMS.length} merchandise items.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
