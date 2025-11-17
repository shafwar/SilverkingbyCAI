const { execSync } = require('child_process');
const { spawn } = require('child_process');

console.log('🚀 Starting application...\n');

// Function to run migration
async function runMigration() {
  console.log('📦 Running database migrations...');
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database migrations completed successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('⚠️  Continuing with application start (migrations may be applied later)...\n');
    // Don't fail the entire startup if migration fails
    // This allows the app to start even if DB is temporarily unavailable
    return false;
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

