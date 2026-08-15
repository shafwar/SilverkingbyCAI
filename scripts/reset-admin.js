/**
 * scripts/reset-admin.js
 *
 * Script AMAN untuk membuat / mereset password admin user di production.
 * TIDAK menghapus Product, QrRecord, GramProductItem, atau data apapun.
 *
 * Cara pakai:
 *   railway run node scripts/reset-admin.js
 *   railway run node scripts/reset-admin.js --email=custom@email.com --password=newpass
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Parse CLI args (--key=value)
function getArg(name, fallback) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : fallback;
}

const ADMIN_EMAIL    = getArg('email',    'admin@silverking.com');
const ADMIN_PASSWORD = getArg('password', 'admin123');

async function resetAdmin() {
  console.log('\n🔧 Silver King — Admin Reset Script');
  console.log('=====================================');

  // 1. Test DB connection
  try {
    await prisma.$connect();
    console.log('✅ Database connection: OK');
  } catch (err) {
    console.error('❌ Cannot connect to database:', err.message);
    console.error('\n💡 Kemungkinan penyebab:');
    console.error('   DATABASE_URL masih menggunakan TCP Proxy yang sudah dihapus');
    console.error('   Fix: Update DATABASE_URL di Railway → Variables ke internal URL');
    process.exit(1);
  }

  // 2. Hash password baru
  console.log(`\n📧 Target email   : ${ADMIN_EMAIL}`);
  console.log('🔑 Hashing password...');
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // 3. Upsert admin — hanya update password jika sudah ada, atau buat baru
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { password: hashedPassword },
    });
    console.log(`✅ Admin password UPDATED untuk: ${ADMIN_EMAIL}`);
  } else {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log(`✅ Admin user DIBUAT: ${ADMIN_EMAIL}`);
  }

  // 4. Verifikasi password berhasil
  const verification = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  const passwordMatch = await bcrypt.compare(ADMIN_PASSWORD, verification.password);

  console.log('\n📊 Verifikasi:');
  console.log(`   User ID       : ${verification.id}`);
  console.log(`   Email         : ${verification.email}`);
  console.log(`   Role          : ${verification.role}`);
  console.log(`   Password valid: ${passwordMatch ? '✅ YES' : '❌ NO — ada masalah!'}`);

  // 5. Cek jumlah data (konfirmasi tidak ada yang terhapus)
  const counts = {
    users:       await prisma.user.count(),
    products:    await prisma.product.count(),
    qrRecords:   await prisma.qrRecord.count(),
    gramBatches: await prisma.gramProductBatch.count(),
    gramItems:   await prisma.gramProductItem.count(),
  };

  console.log('\n📦 Data check (tidak ada yang terhapus):');
  Object.entries(counts).forEach(([k, v]) => console.log(`   ${k.padEnd(16)}: ${v}`));

  console.log('\n🎉 Selesai! Login credentials:');
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('\n⚠️  Harap ganti password setelah berhasil login!\n');
}

resetAdmin()
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
