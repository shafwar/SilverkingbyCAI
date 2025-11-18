const { execSync } = require('child_process');
const { spawn } = require('child_process');
const { createDatabaseIfNotExists } = require('./create-database');

console.log('🚀 Starting application...\n');

// Function to run seed
async function runSeed() {
  console.log('🌱 Running database seed...');
  try {
    execSync('npm run prisma:seed', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database seed completed successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.log('⚠️  Continuing without seed (database may already be seeded)...\n');
    return false;
  }
}

// Function to run migration
async function runMigration() {
  console.log('📦 Running database migrations...');
  try {
    // First ensure database exists
    console.log('Step 1: Ensuring database exists...\n');
    await createDatabaseIfNotExists();
    
    // Run Prisma migration
    console.log('Step 2: Running Prisma migrations...\n');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database migrations completed successfully!\n');
    
    // Run seed after migration
    console.log('Step 3: Seeding database...\n');
    await runSeed();
    
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
      
      // Try to seed after push
      await runSeed();
      
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

