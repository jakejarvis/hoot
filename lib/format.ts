import { UTCDate } from "@date-fns/utc";
import { format } from "date-fns";

export function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const utc = new UTCDate(d);
    // Example: Oct. 2, 2025
    return format(utc, "MMM. d, yyyy");
  } catch {
    return iso;
  }
}

export function formatDateTimeUtc(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const utc = new UTCDate(d);
    // Example: 2025-10-02 14:30:05 UTC
    return format(utc, "yyyy-MM-dd HH:mm:ss 'UTC'");
  } catch {
    return iso;
  }
}

export function formatTtl(ttl: number): string {
  if (!Number.isFinite(ttl) || ttl <= 0) return `${ttl}s`;
  const hours = Math.floor(ttl / 3600);
  const minutes = Math.floor((ttl % 3600) / 60);
  const seconds = ttl % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!hours && !minutes) parts.push(`${seconds}s`);
  return parts.join(" ");
}
