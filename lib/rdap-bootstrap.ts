import "server-only";
import type { BootstrapData } from "rdapper";
import { RDAP_BOOTSTRAP_URL, TTL_RDAP_BOOTSTRAP } from "@/lib/constants";

/**
 * Fetch RDAP bootstrap data with Next.js caching.
 *
 * The bootstrap registry changes infrequently (new TLDs, server updates),
 * so we cache it for 24 hours using Next.js's built-in fetch cache.
 *
 * This eliminates redundant fetches to IANA on every domain lookup when
 * passed to rdapper's lookup() via the customBootstrapData option.
 *
 * @returns RDAP bootstrap data containing TLD-to-server mappings
 * @throws Error if fetch fails (caller should handle or let rdapper fetch directly)
 */
export async function getRdapBootstrapData(): Promise<BootstrapData> {
  const res = await fetch(RDAP_BOOTSTRAP_URL, {
    next: { revalidate: TTL_RDAP_BOOTSTRAP },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch RDAP bootstrap: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}
