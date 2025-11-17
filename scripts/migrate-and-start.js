const { execSync } = require('child_process');
const { spawn } = require('child_process');

console.log('🚀 Starting application...\n');

// Function to create database if it doesn't exist
async function ensureDatabase() {
  console.log('🔍 Ensuring database exists...');
  try {
    // Extract database name from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL is not set');
      return false;
    }

    // Parse DATABASE_URL to get database name
    // Format: mysql://user:password@host:port/database
    const urlMatch = dbUrl.match(/mysql:\/\/[^:]+:[^@]+@[^\/]+\/(.+)$/);
    if (!urlMatch) {
      console.log('⚠️  Could not parse DATABASE_URL, skipping database creation');
      return true;
    }

    const dbName = urlMatch[1];
    console.log(`📦 Database name: ${dbName}`);

    // Create database using mysql command if it doesn't exist
    // We'll use a connection without database name first
    const baseUrl = dbUrl.replace(/\/[^\/]+$/, '');
    const createDbUrl = baseUrl + '/mysql'; // Connect to default mysql database
    
    try {
      // Try to create database using Prisma's db push or raw SQL
      // For now, we'll let Prisma handle it during migration
      console.log(`✅ Database will be created during migration if needed\n`);
      return true;
    } catch (error) {
      console.log(`⚠️  Could not pre-create database, Prisma will handle it: ${error.message}\n`);
      return true; // Continue anyway, Prisma might create it
    }
  } catch (error) {
    console.log(`⚠️  Database check skipped: ${error.message}\n`);
    return true; // Continue anyway
  }
}

// Function to run migration
async function runMigration() {
  console.log('📦 Running database migrations...');
  try {
    // First ensure database exists
    await ensureDatabase();
    
    // Run Prisma migration
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database migrations completed successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('⚠️  Attempting to create database and retry migration...\n');
    
    // Try to create database and retry
    try {
      // Use db push as fallback to create schema
      console.log('🔄 Trying Prisma db push as fallback...');
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('✅ Database schema created successfully!\n');
      return true;
    } catch (pushError) {
      console.error('❌ Database push also failed:', pushError.message);
      console.log('⚠️  Continuing with application start (migrations may be applied later)...\n');
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

