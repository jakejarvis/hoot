import { Redis } from "@upstash/redis";

// Uses KV_REST_API_URL and KV_REST_API_TOKEN set by Vercel integration
export const redis = Redis.fromEnv();

export function ns(n: string, id: string): string {
  return `${n}:${id}`;
}
