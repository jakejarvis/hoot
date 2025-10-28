import { statsigAdapter } from "@flags-sdk/statsig";
import { flag } from "flags/next";

/**
 * Returns an array of suggested domains.
 */
export const domainSuggestionsFlag = flag<string[]>({
  description: "List of suggested domains shown on the home page",
  key: "domain_suggestions",
  adapter: statsigAdapter.dynamicConfig(
    (config) => config.value.domains as string[],
  ),
  defaultValue: [
    "github.com",
    "reddit.com",
    "wikipedia.org",
    "firefox.com",
    "jarv.is",
  ],
});
