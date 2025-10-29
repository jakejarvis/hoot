import { Redis } from "@upstash/redis";

// Uses KV_REST_API_URL and KV_REST_API_TOKEN set by Vercel integration
export const redis = Redis.fromEnv({
  // Enable automatic pipelining for commands within same event loop tick
  enableAutoPipelining: true,
});

/**
 * Return a single string from any number of strings joined by colons
 */
export function ns(...parts: string[]): string {
  return parts.join(":");
}
