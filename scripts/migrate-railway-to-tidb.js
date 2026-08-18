#!/usr/bin/env node
/**
 * migrate-railway-to-tidb.js
 * 
 * Script ini berjalan di dalam Railway container (via `railway run`)
 * sehingga bisa mengakses mysql.railway.internal secara langsung.
 * 
 * Cara pakai:
 *   railway run --service SilverkingbyCAI node scripts/migrate-railway-to-tidb.js
 */

const { PrismaClient } = require('@prisma/client');

const SOURCE_URL = process.env.DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL || 
  'mysql://28W1TMCs9KdURyk.root:sMCHjbMu7351UeXk@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict';

if (!SOURCE_URL) {
  console.error('❌ DATABASE_URL not found. Run this via: railway run --service SilverkingbyCAI node scripts/migrate-railway-to-tidb.js');
  process.exit(1);
}

console.log('📡 Source:', SOURCE_URL.replace(/:([^:@]+)@/, ':****@'));
console.log('🎯 Target:', TARGET_URL.replace(/:([^:@]+)@/, ':****@'));
console.log('');

const sourcePrisma = new PrismaClient({
  datasources: { db: { url: SOURCE_URL } }
});

const targetPrisma = new PrismaClient({
  datasources: { db: { url: TARGET_URL } }
});

const MODELS = [
  { name: 'user', deps: [] },
  { name: 'serticardConfig', deps: [] },
  { name: 'serticardUploadedTemplate', deps: ['serticardConfig'] },
  { name: 'contentEntry', deps: [] },
  { name: 'pageMedia', deps: [] },
  { name: 'pageSection', deps: [] },
  { name: 'journal', deps: [] },
  { name: 'distributor', deps: [] },
  { name: 'feedback', deps: [] },
  { name: 'product', deps: [] },
  { name: 'qrRecord', deps: ['product'] },
  { name: 'productDeleteBatch', deps: [] },
  { name: 'productDeleteHistory', deps: ['productDeleteBatch'] },
  { name: 'cmsProduct', deps: [] },
  { name: 'merchandiseItem', deps: [] },
  { name: 'gramProductBatch', deps: [] },
  { name: 'gramProductItem', deps: ['gramProductBatch'] },
  { name: 'qRScanLog', deps: [] },
  { name: 'gramQRScanLog', deps: [] },
  { name: 'scanLogSummary', deps: [] },
  { name: 'qrZipDownloadJob', deps: [] },
  { name: 'qrZipDownloadCache', deps: ['qrZipDownloadJob'] },
  { name: 'serticardZipRenderIssue', deps: [] },
  { name: 'qrZipBundleState', deps: [] },
  { name: 'qrZipDownloadAudit', deps: [] },
];

async function migrateTable(modelName) {
  const srcDelegate = sourcePrisma[modelName];
  const tgtDelegate = targetPrisma[modelName];

  if (!srcDelegate || !tgtDelegate) {
    console.log(`  ⚠️  Skipping [${modelName}] - delegate not found`);
    return 0;
  }

  const total = await srcDelegate.count();
  if (total === 0) {
    console.log(`  ✅ [${modelName}] - empty table, skipping`);
    return 0;
  }

  // Clear target
  try { await tgtDelegate.deleteMany({}); } catch (e) {}

  let migrated = 0;
  const CHUNK = 500;

  for (let skip = 0; skip < total; skip += CHUNK) {
    const rows = await srcDelegate.findMany({ skip, take: CHUNK });
    if (rows.length > 0) {
      // Insert in batches of 100 for TiDB compatibility
      for (let b = 0; b < rows.length; b += 100) {
        const batch = rows.slice(b, b + 100);
        await tgtDelegate.createMany({ data: batch, skipDuplicates: true });
      }
      migrated += rows.length;
      process.stdout.write(`  📦 [${modelName}] ${migrated}/${total} rows transferred...\r`);
    }
  }

  console.log(`  ✅ [${modelName}] ${migrated} rows migrated!               `);
  return migrated;
}

async function main() {
  console.log('🚀 Starting Full Database Migration: Railway MySQL → TiDB Cloud\n');
  console.log('═'.repeat(60));

  // Test connections
  try {
    await sourcePrisma.$queryRaw`SELECT 1`;
    console.log('✅ Source (Railway MySQL) - Connected');
  } catch (e) {
    console.error('❌ Source connection failed:', e.message);
    process.exit(1);
  }

  try {
    await targetPrisma.$queryRaw`SELECT 1`;
    console.log('✅ Target (TiDB Cloud)    - Connected\n');
  } catch (e) {
    console.error('❌ Target connection failed:', e.message);
    process.exit(1);
  }

  console.log('═'.repeat(60));

  let totalMigrated = 0;

  for (const { name } of MODELS) {
    try {
      const count = await migrateTable(name);
      totalMigrated += count;
    } catch (err) {
      console.error(`  ❌ [${name}] ERROR:`, err.message);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`🎉 MIGRATION COMPLETE!`);
  console.log(`   Total rows migrated: ${totalMigrated}`);
  console.log('═'.repeat(60));

  // Verify
  console.log('\n📊 Verification - TiDB Cloud row counts:');
  const counts = {};
  for (const { name } of MODELS) {
    try {
      const tgtDelegate = targetPrisma[name];
      if (tgtDelegate) {
        counts[name] = await tgtDelegate.count();
      }
    } catch (e) {}
  }
  console.table(counts);

  await sourcePrisma.$disconnect();
  await targetPrisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
