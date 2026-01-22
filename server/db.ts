import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

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
  // Use SQLite for local development
  const sqlite = new Database(process.env.DATABASE_URL.replace('file:', ''));
  db = drizzleSQLite(sqlite, { schema });
} else {
  // Use Neon for production
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { pool, db };
