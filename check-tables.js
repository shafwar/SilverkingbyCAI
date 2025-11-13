require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTables() {
  try {
    // Raw query to check tables
    const tables = await prisma.$queryRawUnsafe(
      'SHOW TABLES FROM silverkingbycai'
    );
    
    console.log('📋 Tables in database silverkingbycai:');
    console.log(tables);
    
    if (tables.length === 0) {
      console.log('\n❌ Database kosong! Tabel belum dibuat.');
      console.log('💡 Buka phpMyAdmin dan jalankan SQL script yang sudah dibuat.\n');
    } else {
      console.log('\n✅ Tabel sudah ada!');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();

