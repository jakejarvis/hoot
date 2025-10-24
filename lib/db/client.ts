import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/lib/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Throw at import time so we fail fast on misconfiguration in server-only context
  throw new Error("DATABASE_URL is not set");
}

// Local dev: route WebSockets via the Neon wsproxy on localhost:5433
if (connectionString.includes("localhost")) {
  const { WebSocket } = await import("ws");
  neonConfig.webSocketConstructor = WebSocket;
  // Tell the driver how to build the wsproxy URL from the DB host
  // With DATABASE_URL using host=localhost, this becomes "localhost:5433/v1"
  neonConfig.wsProxy = (host) => `${host}:5433/v1`;
  neonConfig.useSecureWebSocket = false; // ws:// not wss://
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
