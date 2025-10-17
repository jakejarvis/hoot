import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/server/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Throw at import time so we fail fast on misconfiguration in server-only context
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
