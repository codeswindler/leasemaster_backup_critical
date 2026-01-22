import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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
  database: url.pathname.slice(1),
  user: url.username,
  password: url.password,
  ssl: {
    rejectUnauthorized: false
  }
};

const pool = new Pool(config);

async function createAdminUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connected to database');
    
    // Default admin credentials
    const username = 'admin';
    const password = 'admin123'; // Change this in production!
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if admin user already exists
    const checkResult = await client.query(
      'SELECT id, username FROM users WHERE username = $1',
      [username]
    );
    
    if (checkResult.rows.length > 0) {
      console.log(`⚠️  User '${username}' already exists!`);
      console.log(`   User ID: ${checkResult.rows[0].id}`);
      console.log(`\n📝 Existing credentials:`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: (check database or reset)`);
      return;
    }
    
    // Create admin user
    const result = await client.query(
      `INSERT INTO users (id, username, password) 
       VALUES (gen_random_uuid(), $1, $2) 
       RETURNING id, username`,
      [username, hashedPassword]
    );
    
    const user = result.rows[0];
    console.log('\n✅ Admin user created successfully!');
    console.log(`\n📝 Login Credentials:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`\n⚠️  IMPORTANT: Change the password in production!`);
    
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdminUser();

