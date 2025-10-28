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
