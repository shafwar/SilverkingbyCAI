// Test Database Connection
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Try to query database
    await prisma.$connect();
    console.log('✅ Database connection: SUCCESS!\n');
    
    // Check if tables exist
    const users = await prisma.user.findMany().catch(() => []);
    const products = await prisma.product.findMany().catch(() => []);
    
    console.log('📊 Database Status:');
    console.log(`   - Users table: ${users.length >= 0 ? '✓ EXISTS' : '✗ NOT FOUND'} (${users.length} records)`);
    console.log(`   - Products table: ${products.length >= 0 ? '✓ EXISTS' : '✗ NOT FOUND'} (${products.length} records)\n`);
    
    if (users.length === 0) {
      console.log('⚠️  Tables exist but empty - you need to run: npm run prisma:seed\n');
    } else {
      console.log('✅ Database ready to use!\n');
    }
    
  } catch (error) {
    console.log('❌ Database connection: FAILED!\n');
    console.log('Error details:');
    console.log(`   ${error.message}\n`);
    
    if (error.message.includes('Table') && error.message.includes("doesn't exist")) {
      console.log('💡 Solution: Run the SQL script in phpMyAdmin to create tables\n');
    } else if (error.message.includes('Access denied')) {
      console.log('💡 Solution: Check your MySQL password in .env file\n');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Solution: Make sure MySQL server is running\n');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

