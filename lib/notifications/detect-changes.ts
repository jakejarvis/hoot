import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { domainSnapshots } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import type { Section } from "@/lib/schemas";

const log = logger({ module: "change-detection" });
export interface ChangeDetection {
  type:
    | "nameserver_changed"
    | "certificate_changed"
    | "hosting_changed"
    | "dns_changed";
  before: unknown;
  after: unknown;
}

/**
 * Detect changes between previous and current snapshots
 */
export function detectChanges(
  section: Section,
  previous: unknown,
  current: unknown,
): ChangeDetection[] {
  if (!previous || !current) return [];

  const changes: ChangeDetection[] = [];

  try {
    switch (section) {
      case "dns": {
        // Compare nameservers
        const prevNs = extractNameservers(previous);
        const currNs = extractNameservers(current);
        if (!arraysEqual(prevNs, currNs)) {
          changes.push({
            type: "nameserver_changed",
            before: prevNs,
            after: currNs,
          });
        }
        break;
      }

      case "certificates": {
        // Compare cert validity dates and issuer
        const prevCerts = extractCertInfo(previous);
        const currCerts = extractCertInfo(current);
        if (!certificatesEqual(prevCerts, currCerts)) {
          changes.push({
            type: "certificate_changed",
            before: prevCerts,
            after: currCerts,
          });
        }
        break;
      }

      case "hosting": {
        // Compare hosting provider
        const prevHost = extractProvider(previous);
        const currHost = extractProvider(current);
        if (prevHost !== currHost) {
          changes.push({
            type: "hosting_changed",
            before: prevHost,
            after: currHost,
          });
        }
        break;
      }

      // Skip registration and seo - less critical for change notifications
      default:
        break;
    }
  } catch (error) {
    log.error("Error detecting changes", {
      section,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return changes;
}

/**
 * Extract nameservers from DNS data
 */
function extractNameservers(data: unknown): string[] {
  try {
    if (typeof data !== "object" || data === null) return [];
    const ns = (data as { nameservers?: unknown }).nameservers;
    if (Array.isArray(ns)) {
      return ns.filter((n): n is string => typeof n === "string").sort();
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Extract certificate information from certificates array
 */
function extractCertInfo(data: unknown): {
  validFrom: string | null;
  validTo: string | null;
  issuer: string | null;
} {
  try {
    // getCertificates returns an array directly
    if (Array.isArray(data) && data[0]) {
      const cert = data[0];
      if (typeof cert !== "object" || cert === null) {
        return { validFrom: null, validTo: null, issuer: null };
      }
      const c = cert as {
        validFrom?: unknown;
        validTo?: unknown;
        issuer?: unknown;
      };
      return {
        validFrom: typeof c.validFrom === "string" ? c.validFrom : null,
        validTo: typeof c.validTo === "string" ? c.validTo : null,
        issuer: typeof c.issuer === "string" ? c.issuer : null,
      };
    }
    return { validFrom: null, validTo: null, issuer: null };
  } catch {
    return { validFrom: null, validTo: null, issuer: null };
  }
}

/**
 * Extract provider name from hosting data
 */
function extractProvider(data: unknown): string | null {
  try {
    if (typeof data !== "object" || data === null) return null;
    const provider = (data as { provider?: unknown }).provider;
    return typeof provider === "string" ? provider : null;
  } catch {
    return null;
  }
}

/**
 * Compare two arrays for equality (order-insensitive)
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Compare certificate info for changes
 */
function certificatesEqual(
  a: {
    validFrom: string | null;
    validTo: string | null;
    issuer: string | null;
  },
  b: {
    validFrom: string | null;
    validTo: string | null;
    issuer: string | null;
  },
): boolean {
  return (
    a.validFrom === b.validFrom &&
    a.validTo === b.validTo &&
    a.issuer === b.issuer
  );
}

/**
 * Save a snapshot for change detection
 * Keeps only the last 2 snapshots per domain+type
 */
export async function saveSnapshot(
  domainId: string,
  section: Section,
  data: unknown,
): Promise<void> {
  try {
    // Insert new snapshot
    await db.insert(domainSnapshots).values({
      domainId,
      snapshotType: section,
      snapshotData: data as Record<string, unknown>,
    });

    log.debug("Saved snapshot", { domainId, section });

    // Cleanup: keep only last 2 snapshots
    const allSnapshots = await db
      .select()
      .from(domainSnapshots)
      .where(
        and(
          eq(domainSnapshots.domainId, domainId),
          eq(domainSnapshots.snapshotType, section),
        ),
      )
      .orderBy(desc(domainSnapshots.createdAt));

    if (allSnapshots.length > 2) {
      const toDelete = allSnapshots.slice(2).map((s) => s.id);
      await db
        .delete(domainSnapshots)
        .where(inArray(domainSnapshots.id, toDelete));

      log.debug("Cleaned up old snapshots", {
        domainId,
        section,
        deleted: toDelete.length,
      });
    }
  } catch (error) {
    log.error("Failed to save snapshot", {
      domainId,
      section,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - snapshot failures shouldn't break the flow
  }
}

/**
 * Get the latest snapshot for a domain and section
 */
export async function getLatestSnapshot(
  domainId: string,
  section: Section,
): Promise<{ id: string; snapshotData: unknown } | null> {
  try {
    const snapshot = await db.query.domainSnapshots.findFirst({
      where: and(
        eq(domainSnapshots.domainId, domainId),
        eq(domainSnapshots.snapshotType, section),
      ),
      orderBy: [desc(domainSnapshots.createdAt)],
    });

    return snapshot || null;
  } catch (error) {
    log.error("Failed to get latest snapshot", {
      domainId,
      section,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
