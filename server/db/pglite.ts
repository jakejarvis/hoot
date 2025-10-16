import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/server/db/schema";

// Dynamic import via require pattern is recommended in community examples
// to access drizzle-kit/api in Vitest.
const { pushSchema } =
  require("drizzle-kit/api") as typeof import("drizzle-kit/api");

export async function makePGliteDb() {
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
