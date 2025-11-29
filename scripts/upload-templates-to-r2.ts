/**
 * Script to upload Serticard templates to R2
 * Run: npx ts-node scripts/upload-templates-to-r2.ts
 */

import { uploadSerticardTemplates } from "../src/lib/qr";
import { fileExistsInR2 } from "../src/lib/r2-client";

async function main() {
  console.log("🚀 Starting template upload to R2...\n");

  // Check if templates already exist
  console.log("🔍 Checking if templates already exist in R2...");
  const frontExists = await fileExistsInR2("templates/serticard-01.png");
  const backExists = await fileExistsInR2("templates/serticard-02.png");

  if (frontExists && backExists) {
    console.log("✅ Templates already exist in R2:");
    console.log("   - templates/serticard-01.png");
    console.log("   - templates/serticard-02.png");
    console.log("\n💡 Skipping upload. Templates are already in R2.");
    return;
  }

  if (frontExists) {
    console.log("⚠️  Front template already exists, but back template is missing.");
  } else if (backExists) {
    console.log("⚠️  Back template already exists, but front template is missing.");
  }

  // Upload templates
  console.log("\n📤 Uploading templates to R2...");
  try {
    const { frontUrl, backUrl } = await uploadSerticardTemplates();

    if (frontUrl && backUrl) {
      console.log("\n✅ Upload successful!");
      console.log("   Front template:", frontUrl);
      console.log("   Back template:", backUrl);
      console.log("\n✨ Templates are now available in R2 and will be used in production.");
    } else {
      console.error("\n❌ Upload failed!");
      console.error("   Front URL:", frontUrl || "null");
      console.error("   Back URL:", backUrl || "null");
      console.error("\n💡 Check R2 configuration in environment variables.");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("\n❌ Error uploading templates:", error.message);
    console.error("\n💡 Make sure:");
    console.error("   1. R2 environment variables are set correctly");
    console.error("   2. Template files exist in public/images/serticard/");
    console.error("   3. R2 bucket has write permissions");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

