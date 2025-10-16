import type { Config } from "drizzle-kit";

const url = process.env.NEON_DATABASE_URL || "";

export default {
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
} satisfies Config;
