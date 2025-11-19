#!/usr/bin/env ts-node
/**
 * Script to verify R2 configuration
 */

import * as dotenv from "dotenv";
import { S3Client, ListBucketsCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("🔍 Verifying R2 Configuration");
  console.log("================================\n");

  // Check environment variables
  const requiredVars = {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  };

  console.log("📋 Environment Variables:");
  let allPresent = true;
  for (const [key, value] of Object.entries(requiredVars)) {
    if (value) {
      if (key === "R2_SECRET_ACCESS_KEY") {
        console.log(
          `   ✅ ${key}: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`
        );
      } else {
        console.log(`   ✅ ${key}: ${value}`);
      }
    } else {
      console.log(`   ❌ ${key}: MISSING`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    console.error("\n❌ Missing required environment variables!");
    process.exit(1);
  }

  console.log(
    `\n🌐 Public URL: ${process.env.R2_PUBLIC_URL || "Not set (will use R2.dev subdomain)"}`
  );

  // Test connection
  console.log("\n🔌 Testing R2 Connection...");
  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: true,
    });

    const targetBucket = process.env.R2_BUCKET_NAME || "";

    // Try to access the specific bucket directly (more permissive than ListBuckets)
    console.log(`   Testing access to bucket: ${targetBucket}...`);

    try {
      // Try HeadBucket - checks if we can access the bucket
      const headCommand = new HeadBucketCommand({ Bucket: targetBucket });
      await client.send(headCommand);
      console.log("   ✅ Bucket access successful!");
      console.log(`   ✅ Bucket "${targetBucket}" is accessible`);
    } catch (headError: any) {
      // If HeadBucket fails, try ListBuckets as fallback
      if (headError.name === "NotFound" || headError.$metadata?.httpStatusCode === 404) {
        console.log(`   ⚠️  Bucket "${targetBucket}" not found`);
        console.log("   💡 Make sure the bucket name is correct and exists in Cloudflare R2");
      } else if (headError.name === "AccessDenied" || headError.$metadata?.httpStatusCode === 403) {
        // Try ListBuckets to see if we have any access
        try {
          const listCommand = new ListBucketsCommand({});
          const response = await client.send(listCommand);
          console.log("   ⚠️  Cannot access bucket directly, but credentials are valid");
          console.log(`   ✅ Found ${response.Buckets?.length || 0} accessible bucket(s)`);

          const bucketExists = response.Buckets?.some((bucket) => bucket.Name === targetBucket);

          if (bucketExists) {
            console.log(`   ✅ Bucket "${targetBucket}" exists in your account`);
            console.log("   ⚠️  But API token may not have permission for this specific bucket");
          } else {
            console.log(`   ⚠️  Bucket "${targetBucket}" not found in accessible buckets`);
            console.log(
              `   💡 Available buckets: ${response.Buckets?.map((b) => b.Name).join(", ") || "None"}`
            );
          }
        } catch (listError: any) {
          throw headError; // Use the original error
        }
      } else {
        throw headError;
      }
    }

    console.log("\n✨ Configuration test completed!");
    console.log(
      "   💡 If you see warnings above, check API token permissions in Cloudflare Dashboard"
    );
  } catch (error: any) {
    console.error("\n❌ Connection failed!");
    console.error(`   Error: ${error.message || error}`);

    if (error.message?.includes("SSL") || error.message?.includes("handshake")) {
      console.error("\n💡 SSL Error detected. Possible causes:");
      console.error("   1. Check if R2_ACCOUNT_ID is correct");
      console.error("   2. Check if credentials are valid");
      console.error("   3. Check internet connection");
      console.error("   4. Try updating Node.js to latest version");
    }

    if (error.message?.includes("Access Denied") || error.message?.includes("403")) {
      console.error("\n💡 Access Denied. Possible causes:");
      console.error("   1. Check if R2_ACCESS_KEY_ID is correct");
      console.error("   2. Check if R2_SECRET_ACCESS_KEY is correct");
      console.error("   3. Verify API token has correct permissions");
    }

    process.exit(1);
  }
}

main();
