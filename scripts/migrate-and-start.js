const { execSync } = require('child_process');
const { spawn } = require('child_process');

// Ensure fontconfig can find config in container
if (!process.env.FONTCONFIG_PATH) {
  process.env.FONTCONFIG_PATH = '/etc/fonts';
}

console.log('🚀 Starting application...\n');

// Function to ensure database schema is in sync (safe on TiDB Cloud)
async function runMigration() {
  console.log('📦 Verifying TiDB database schema...');
  try {
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database schema verified!\n');
    return true;
  } catch (error) {
    console.error('⚠️ Schema verification notice:', error.message);
    return false;
  }
}

// Function to start Next.js
function startNext() {
  const maxMemory = process.env.NODE_MAX_OLD_SPACE_SIZE || '512';
  // Build NODE_OPTIONS: pass heap limit + expose-gc so routes can trigger GC after large allocations
  const baseNodeOptions = (process.env.NODE_OPTIONS || '').replace(/--max-old-space-size=\d+/g, '').trim();
  const nodeOptions = `${baseNodeOptions} --max-old-space-size=${maxMemory} --expose-gc`.trim();

  console.log(`🌐 Starting Next.js server (${maxMemory}MB heap, expose-gc enabled)...\n`);

  const env = { ...process.env, NODE_OPTIONS: nodeOptions };

  // Spawn node directly to ensure NODE_OPTIONS is inherited by the Next.js process.
  // Using 'npm run start:next' via shell can silently drop the env in some Railway/nixpacks setups.
  const nextBin = require('path').join(process.cwd(), 'node_modules', '.bin', 'next');
  const nextProcess = spawn(process.execPath, [nextBin, 'start'], {
    stdio: 'inherit',
    env,
    shell: false,
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
  startNext();
})();
