// Alternative database connection using standard pg driver
// Use this if the WebSocket connection continues to fail
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if we're using SQLite (for local development)
const isSQLite = process.env.DATABASE_URL.startsWith('file:');

let pool: any;
let db: any;

if (isSQLite) {
  throw new Error("This alternative connection file is for PostgreSQL only. Use the original db.ts for SQLite.");
} else {
  // Use standard pg driver for PostgreSQL
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  db = drizzle(pool, { schema });
}

export { pool, db };


