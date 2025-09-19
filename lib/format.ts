export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
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
