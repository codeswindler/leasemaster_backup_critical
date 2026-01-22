import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env file');
    process.exit(1);
  }

  console.log('🔄 Testing connection to Neon database...');
  console.log('📍 Connection string:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Test basic connection
    console.log('🔌 Attempting to connect...');
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    
    console.log('✅ Connection successful!');
    console.log('⏰ Server time:', result.rows[0].current_time);
    console.log('🗄️  PostgreSQL version:', result.rows[0].version.split(',')[0]);
    
    // Check if tables exist
    console.log('\n🔍 Checking for tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found. You need to run the migration SQL in Neon console.');
      console.log('📄 Migration file: migrations/0000_amusing_doctor_spectrum.sql');
    } else {
      console.log(`✅ Found ${tables.rows.length} tables:`);
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('ETIMEDOUT') || error.message.includes('ENETUNREACH')) {
      console.log('\n🔥 Network Issue Detected:');
      console.log('   - Your network cannot reach Neon servers');
      console.log('   - Possible causes:');
      console.log('     • Firewall blocking port 5432');
      console.log('     • ISP blocking PostgreSQL connections');
      console.log('     • Corporate network restrictions');
      console.log('     • Antivirus blocking the connection');
      console.log('\n💡 Solution:');
      console.log('   1. Run the migration SQL directly in Neon Console');
      console.log('   2. Check your firewall settings');
      console.log('   3. Try using a VPN');
      console.log('   4. Contact your network administrator');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();

