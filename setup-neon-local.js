import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

// Parse the connection string
const url = new URL(databaseUrl);
const config = {
  host: url.hostname,
  port: parseInt(url.port || '5432'),
  database: url.pathname.slice(1), // Remove leading '/'
  user: url.username,
  password: url.password,
  ssl: {
    rejectUnauthorized: false // Required for Neon
  }
};

// Add query parameters if present
if (url.searchParams.has('sslmode')) {
  config.ssl = { rejectUnauthorized: url.searchParams.get('sslmode') === 'require' };
}

console.log('🔌 Connecting to Neon PostgreSQL...');
console.log(`   Host: ${config.host}`);
console.log(`   Database: ${config.database}`);

const pool = new Pool(config);

async function setupDatabase() {
  let client;
  try {
    // Test connection
    client = await pool.connect();
    console.log('✅ Connected to database successfully!');

    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '0000_amusing_doctor_spectrum.sql');
    console.log(`\n📄 Reading migration file: ${migrationPath}`);
    
    let migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Clean up the SQL - remove statement-breakpoint comments
    migrationSQL = migrationSQL.replace(/--> statement-breakpoint\n/g, '');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`\n🚀 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await client.query(statement + ';');
          console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
        } catch (error) {
          // Ignore "already exists" errors
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.code === '42P07') { // relation already exists
            console.log(`⚠️  Statement ${i + 1}/${statements.length} - Table/constraint already exists (skipping)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📊 Verifying tables...');
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log(`\n✅ Found ${tables.length} tables:`);
    tables.forEach(table => console.log(`   - ${table}`));
    
    const expectedTables = [
      'bulk_messages', 'charge_codes', 'house_types', 'invoice_items',
      'invoices', 'leases', 'message_recipients', 'messages',
      'payments', 'properties', 'tenants', 'units', 'users', 'water_readings'
    ];
    
    const missingTables = expectedTables.filter(t => !tables.includes(t));
    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('\n🎉 All tables created successfully!');
    }

  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

setupDatabase();


