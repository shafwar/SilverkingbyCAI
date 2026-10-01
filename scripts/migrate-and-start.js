const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure fontconfig can find config in container
if (!process.env.FONTCONFIG_PATH) {
  process.env.FONTCONFIG_PATH = '/etc/fonts';
}

// Critical for Docker / Railway: Force binding to 0.0.0.0
// In Linux containers, process.env.HOSTNAME defaults to the container ID (e.g. "railway-xxx").
// Next.js standalone reads process.env.HOSTNAME. If set to the container ID,
// the server binds exclusively to an internal hostname instead of 0.0.0.0,
// causing connection refused (502 Bad Gateway) from Railway's reverse proxy.
process.env.HOSTNAME = '0.0.0.0';
const port = process.env.PORT || '3000';
process.env.PORT = port;

console.log('🚀 Starting application...\n');

// Function to start Next.js immediately (instant port binding in < 300ms)
function startNext() {
  const maxMemory = process.env.NODE_MAX_OLD_SPACE_SIZE || '384';
  const baseNodeOptions = (process.env.NODE_OPTIONS || '').replace(/--max-old-space-size=\d+/g, '').trim();
  const nodeOptions = `${baseNodeOptions} --max-old-space-size=${maxMemory} --expose-gc`.trim();

  console.log(`🌐 Starting Next.js server on 0.0.0.0:${port} (${maxMemory}MB heap, expose-gc enabled)...`);

  const env = {
    ...process.env,
    HOSTNAME: '0.0.0.0',
    PORT: port,
    NODE_OPTIONS: nodeOptions,
  };

  const standaloneServer = path.join(process.cwd(), '.next', 'standalone', 'server.js');
  let nextProcess;

  if (fs.existsSync(standaloneServer)) {
    console.log('⚡ Using Next.js standalone server mode');
    nextProcess = spawn(process.execPath, [standaloneServer], {
      stdio: 'inherit',
      env,
    });
  } else {
    console.log('⚡ Standalone server not found, falling back to standard next start');
    nextProcess = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', port], {
      stdio: 'inherit',
      env,
    });
  }

  nextProcess.on('error', (error) => {
    console.error('❌ Failed to start Next.js:', error);
    process.exit(1);
  });

  nextProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Next.js exited with code ${code}`);
      process.exit(code || 1);
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

  return nextProcess;
}

// Function to ensure database schema is in sync (safe on TiDB Cloud)
// Runs asynchronously in background: NEVER blocks HTTP port binding
function runMigrationAsync() {
  if (process.env.AUTO_MIGRATE === 'false') {
    console.log('⏭️ AUTO_MIGRATE=false: Skipping background schema sync.\n');
    return;
  }

  console.log('📦 Starting background TiDB database schema verification...');
  
  const migrationProcess = spawn('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    stdio: 'inherit',
    env: process.env,
  });

  // Safety timeout: 45 seconds max so process never hangs in background
  const timeout = setTimeout(() => {
    console.warn('⚠️ Background schema verification timed out after 45s (non-fatal)');
    migrationProcess.kill('SIGKILL');
  }, 45000);

  migrationProcess.on('close', (code) => {
    clearTimeout(timeout);
    if (code === 0) {
      console.log('✅ Background database schema verified successfully!\n');
    } else {
      console.warn(`⚠️ Background schema verification exited with code ${code} (non-fatal)\n`);
    }
  });

  migrationProcess.on('error', (err) => {
    clearTimeout(timeout);
    console.warn('⚠️ Background schema verification notice:', err.message);
  });
}

// Main execution:
// 1. Start Next.js immediately to open HTTP port in < 300ms (zero-downtime, no 502)
startNext();

// 2. Run schema verification asynchronously in the background after server is listening
setTimeout(() => {
  runMigrationAsync();
}, 1500);
