const { execSync } = require('child_process');
const { spawn } = require('child_process');
const { createDatabaseIfNotExists } = require('./create-database');

// Ensure fontconfig can find config in container (fixes "Cannot load default config file" on Railway)
if (!process.env.FONTCONFIG_PATH) {
  process.env.FONTCONFIG_PATH = '/etc/fonts';
}

console.log('🚀 Starting application...\n');

// Function to run migration ONLY — seed is intentionally excluded from auto-start.
// Seed used to delete all data on first run, which is dangerous in production.
// To reset admin user: railway run node scripts/reset-admin.js
// To seed manually:    railway run npm run prisma:seed
async function runMigration() {
  console.log('📦 Running database migrations...');
  try {
    // First ensure database exists
    console.log('Step 1: Ensuring database exists...\n');
    await createDatabaseIfNotExists();

    // Resolve any stuck migrations (safe — only marks as rolled-back, no data change)
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

    // Deploy pending migrations (safe — only applies schema changes, never deletes rows)
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

  // Handle graceful shutdown
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
  startNext();
})();

