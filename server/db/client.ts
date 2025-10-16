import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Reuse fetch connections across invocations (Vercel/Edge safe)
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Throw at import time so we fail fast on misconfiguration in server-only context
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(connectionString);
export const db = drizzle(sql);
