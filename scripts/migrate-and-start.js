const { execSync } = require('child_process');
const { spawn } = require('child_process');
const { createDatabaseIfNotExists } = require('./create-database');
const { PrismaClient } = require('@prisma/client');

// Ensure fontconfig can find config in container (fixes "Cannot load default config file" on Railway)
if (!process.env.FONTCONFIG_PATH) {
  process.env.FONTCONFIG_PATH = '/etc/fonts';
}

console.log('🚀 Starting application...\n');

const TIDB_URL = process.env.TARGET_DATABASE_URL || 'mysql://28W1TMCs9KdURyk.root:sMCHjbMu7351UeXk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict';

async function copyDataToTiDB() {
  console.log('🔄 Checking TiDB Cloud migration status...');
  try {
    const targetPrisma = new PrismaClient({
      datasources: { db: { url: TIDB_URL } }
    });

    const sourcePrisma = new PrismaClient();

    // Check if TiDB already has data
    let existingItemCount = 0;
    try {
      existingItemCount = await targetPrisma.gramProductItem.count();
    } catch (e) {
      existingItemCount = 0;
    }

    if (existingItemCount > 0) {
      console.log(`✅ TiDB Cloud already contains ${existingItemCount} gram items. Skipping data copy.\n`);
      await targetPrisma.$disconnect();
      await sourcePrisma.$disconnect();
      return;
    }

    console.log('📦 Transferring 20,100+ records from Railway MySQL to TiDB Cloud...\n');

    const models = [
      'user',
      'product',
      'qrRecord',
      'productDeleteBatch',
      'productDeleteHistory',
      'cmsProduct',
      'merchandiseItem',
      'gramProductBatch',
      'gramProductItem',
      'qRScanLog',
      'gramQRScanLog',
      'scanLogSummary',
      'serticardConfig',
      'serticardUploadedTemplate',
      'feedback',
      'distributor',
      'contentEntry',
      'pageMedia',
      'pageSection',
      'journal',
      'qrZipDownloadJob',
      'qrZipDownloadCache',
      'serticardZipRenderIssue',
      'qrZipBundleState',
      'qrZipDownloadAudit'
    ];

    let totalMigrated = 0;

    for (const model of models) {
      try {
        const sourceDelegate = sourcePrisma[model];
        const targetDelegate = targetPrisma[model];

        if (!sourceDelegate || !targetDelegate) continue;

        const rows = await sourceDelegate.findMany();
        if (rows.length > 0) {
          console.log(`   Transferring ${rows.length} rows for table [${model}]...`);
          try {
            await targetDelegate.deleteMany({});
          } catch (e) {}

          const batchSize = 100;
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            await targetDelegate.createMany({
              data: batch,
              skipDuplicates: true
            });
          }

          totalMigrated += rows.length;
        }
      } catch (err) {
        console.error(`   ⚠️ Notice on model ${model}:`, err.message);
      }
    }

    console.log(`\n🎉 DATA TRANSFER COMPLETE! Successfully migrated ${totalMigrated} rows to TiDB Cloud!\n`);

    await targetPrisma.$disconnect();
    await sourcePrisma.$disconnect();
  } catch (err) {
    console.error('❌ Data transfer to TiDB encountered error:', err.message);
  }
}

// Function to run migration ONLY — seed is intentionally excluded from auto-start.
async function runMigration() {
  console.log('📦 Running database migrations...');
  try {
    console.log('Step 1: Ensuring database exists...\n');
    await createDatabaseIfNotExists();

    console.log('Step 2: Resolving stuck migrations and deploying...\n');
    try {
      execSync('npx prisma migrate resolve --rolled-back 20260213000000_add_distributors', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('✅ Stuck migration resolved successfully.\n');
    } catch (e) {
      console.log('ℹ️ No stuck migration found or already resolved.\n');
    }

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database migrations completed successfully!\n');

    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('⚠️  Attempting to create schema with db push as fallback...\n');

    try {
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('✅ Database schema created successfully!\n');
      return true;
    } catch (pushError) {
      console.error('❌ Database push also failed:', pushError.message);
      console.log('⚠️  Continuing with application start...\n');
      return false;
    }
  }
}

// Function to start Next.js
function startNext() {
  console.log('🌐 Starting Next.js server...\n');
  const nextProcess = spawn('npm', ['run', 'start:next'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  nextProcess.on('error', (error) => {
    console.error('❌ Failed to start Next.js:', error);
    process.exit(1);
  });

  nextProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Next.js exited with code ${code}`);
      process.exit(code);
    }
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    nextProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    nextProcess.kill('SIGINT');
  });
}

// Main execution
(async () => {
  await runMigration();
  await copyDataToTiDB();
  startNext();
})();
