#!/usr/bin/env ts-node
/**
 * Verify Railway Environment Variables
 * This script checks if all required environment variables are set correctly
 */

const requiredVars = {
  // Database
  DATABASE_URL: {
    required: true,
    description: "MySQL database connection string",
    validate: (val: string) => val.startsWith("mysql://"),
  },
  
  // Authentication
  NEXTAUTH_SECRET: {
    required: true,
    description: "NextAuth secret key for session encryption",
    validate: (val: string) => val.length >= 32,
  },
  NEXTAUTH_URL: {
    required: true,
    description: "Base URL for NextAuth callbacks",
    validate: (val: string) => val.startsWith("https://"),
  },
  
  // Application
  NEXT_PUBLIC_APP_URL: {
    required: true,
    description: "Public application URL for QR code generation",
    validate: (val: string) => val.startsWith("https://") && val.includes("cahayasilverking.id"),
  },
  NODE_ENV: {
    required: true,
    description: "Node environment",
    validate: (val: string) => val === "production",
  },
  RAILWAY_ENVIRONMENT: {
    required: true,
    description: "Railway environment indicator",
    validate: (val: string) => val === "production" || val === "true",
  },
  
  // R2 Storage (for QR codes)
  R2_ENDPOINT: {
    required: true,
    description: "Cloudflare R2 endpoint URL",
    validate: (val: string) => val.includes("r2.cloudflarestorage.com"),
  },
  R2_BUCKET: {
    required: true,
    description: "R2 bucket name",
    validate: (val: string) => val.length > 0,
  },
  R2_ACCESS_KEY_ID: {
    required: true,
    description: "R2 access key ID",
    validate: (val: string) => val.length >= 20,
  },
  R2_SECRET_ACCESS_KEY: {
    required: true,
    description: "R2 secret access key",
    validate: (val: string) => val.length >= 40,
  },
  R2_PUBLIC_URL: {
    required: true,
    description: "Public URL for R2 assets",
    validate: (val: string) => val.startsWith("https://"),
  },
  NEXT_PUBLIC_R2_PUBLIC_URL: {
    required: true,
    description: "Public R2 URL for client-side access",
    validate: (val: string) => val.startsWith("https://"),
  },
};

const optionalVars = {
  NEXT_PUBLIC_ENABLE_DASHBOARD_MOCKS: {
    description: "Enable dashboard mocks (should be false in production)",
    validate: (val: string) => val === "false" || val === "true",
  },
};

function main() {
  console.log("🔍 Verifying Railway Environment Variables...\n");
  
  const missing: string[] = [];
  const invalid: Array<{ var: string; reason: string }> = [];
  const valid: string[] = [];
  
  // Check required variables
  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    
    if (!value) {
      if (config.required) {
        missing.push(varName);
        console.log(`❌ ${varName}: MISSING - ${config.description}`);
      }
    } else {
      if (config.validate(value)) {
        valid.push(varName);
        // Mask sensitive values
        const displayValue = varName.includes("SECRET") || varName.includes("KEY") || varName.includes("PASSWORD")
          ? `${value.substring(0, 8)}...`
          : value.length > 60
          ? `${value.substring(0, 60)}...`
          : value;
        console.log(`✅ ${varName}: OK - ${displayValue}`);
      } else {
        invalid.push({ var: varName, reason: `Validation failed: ${config.description}` });
        console.log(`⚠️  ${varName}: INVALID - ${config.description}`);
      }
    }
  }
  
  // Check optional variables
  console.log("\n📋 Optional Variables:");
  for (const [varName, config] of Object.entries(optionalVars)) {
    const value = process.env[varName];
    if (value) {
      if (config.validate(value)) {
        console.log(`✅ ${varName}: ${value}`);
      } else {
        console.log(`⚠️  ${varName}: ${value} (validation failed)`);
      }
    } else {
      console.log(`⚪ ${varName}: Not set (optional)`);
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary:");
  console.log(`✅ Valid: ${valid.length}/${Object.keys(requiredVars).length}`);
  console.log(`❌ Missing: ${missing.length}`);
  console.log(`⚠️  Invalid: ${invalid.length}`);
  
  if (missing.length > 0) {
    console.log("\n❌ Missing Variables:");
    missing.forEach(v => console.log(`   - ${v}`));
  }
  
  if (invalid.length > 0) {
    console.log("\n⚠️  Invalid Variables:");
    invalid.forEach(({ var: v, reason }) => console.log(`   - ${v}: ${reason}`));
  }
  
  if (missing.length === 0 && invalid.length === 0) {
    console.log("\n✅ All required environment variables are set correctly!");
    return 0;
  } else {
    console.log("\n❌ Some environment variables need attention.");
    return 1;
  }
}

if (require.main === module) {
  process.exit(main());
}

export { main };

