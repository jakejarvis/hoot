import { ns, redis } from "@/lib/redis";

export async function invalidateReportCache(domain: string): Promise<void> {
  try {
    await redis.del(ns("report", domain.toLowerCase()));
  } catch {}
}
