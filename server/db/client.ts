import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  // Soft warn; local dev may not have PG configured yet.
  console.warn('[db] DATABASE_URL is not set. Database features will be disabled.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optional tuning; safe defaults
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool);

export type DbClient = typeof db;
