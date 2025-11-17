const mysql = require('mysql2/promise');

async function createDatabaseIfNotExists() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set');
    return false;
  }

  // Parse DATABASE_URL: mysql://user:password@host:port/database
  const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!urlMatch) {
    console.log('⚠️  Could not parse DATABASE_URL');
    return false;
  }

  const [, user, password, host, port, database] = urlMatch;
  
  console.log(`🔍 Checking database: ${database}`);
  console.log(`   Host: ${host}:${port}`);
  console.log(`   User: ${user}\n`);

  try {
    // Connect to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
    });

    // Check if database exists
    const [databases] = await connection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [database]
    );

    if (databases.length === 0) {
      console.log(`📦 Creating database: ${database}...`);
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ Database "${database}" created successfully!\n`);
    } else {
      console.log(`✅ Database "${database}" already exists\n`);
    }

    await connection.end();
    return true;
  } catch (error) {
    console.error(`❌ Error creating database: ${error.message}`);
    console.log(`⚠️  Will try to continue anyway...\n`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  createDatabaseIfNotExists()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { createDatabaseIfNotExists };

