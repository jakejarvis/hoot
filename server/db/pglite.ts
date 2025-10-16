import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/server/db/schema";

export async function makePGliteDb() {
  // Dynamic import via require pattern is recommended in community examples
  // to access drizzle-kit/api in Vitest.
  const { pushSchema } = await import("drizzle-kit/api");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const { apply } = await pushSchema(
    schema,
    // biome-ignore lint/suspicious/noExplicitAny: ignore type mismatch
    db as any,
  );
  await apply();
  return { db, client };
}
