import { getProviderData as getStatsigProviderData } from "@flags-sdk/statsig";
import { mergeProviderData } from "flags";
import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next";
import * as flags from "@/flags";

/**
 * Flags Explorer API endpoint
 *
 * This endpoint is used by the Vercel Toolbar's Flags Explorer to:
 * 1. Discover flags defined in code
 * 2. Fetch metadata from Statsig (if configured)
 * 3. Allow overriding flag values during development
 *
 * Authorization is handled automatically by createFlagsDiscoveryEndpoint.
 */
export const GET = createFlagsDiscoveryEndpoint(async () => {
  const providers = [
    // Expose flags declared in code
    getProviderData(flags),
  ];

  // If Statsig Console API credentials are available, enhance with metadata
  if (process.env.STATSIG_CONSOLE_API_KEY) {
    try {
      providers.push(
        await getStatsigProviderData({
          projectId: process.env.STATSIG_PROJECT_ID,
          consoleApiKey: process.env.STATSIG_CONSOLE_API_KEY,
        }),
      );
    } catch (err) {
      console.error("Flags Explorer: Statsig metadata fetch failed:", err);
      // Continue without Statsig metadata
    }
  }

  return mergeProviderData(providers);
});
