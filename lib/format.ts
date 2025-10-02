import { UTCDate } from "@date-fns/utc";
import { format } from "date-fns";

export function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const utc = new UTCDate(d);
    // Example: Oct. 2, 2025 18:45:05 UTC
    return format(utc, "MMM. d, yyyy HH:mm:ss 'UTC'");
  } catch {
    return iso;
  }
}

export function formatRegistrant(reg: {
  organization: string;
  country: string;
  state?: string;
}) {
  const org = (reg.organization || "").trim();
  const country = (reg.country || "").trim();
  const state = (reg.state || "").trim();
  const parts = [] as string[];
  if (org) parts.push(org);
  const loc = [state, country].filter(Boolean).join(", ");
  if (loc) parts.push(loc);
  if (parts.length === 0) return "Unavailable";
  return parts.join(" — ");
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

export function equalHostname(a: string, b: string): boolean {
  try {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  } catch {
    return a === b;
  }
}
