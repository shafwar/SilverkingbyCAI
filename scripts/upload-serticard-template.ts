/**
 * Script to upload Serticard template to R2
 * Run with: ts-node --project tsconfig.scripts.json scripts/upload-serticard-template.ts
 */

import { uploadSerticardTemplate } from "../src/lib/qr";

async function main() {
  console.log("Uploading Serticard template to R2...");
  
  const templateUrl = await uploadSerticardTemplate();
  
  if (templateUrl) {
    console.log("✅ Template uploaded successfully!");
    console.log("Template URL:", templateUrl);
  } else {
    console.error("❌ Failed to upload template. Check R2 configuration.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

