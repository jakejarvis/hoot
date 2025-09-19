import { DNS_PROVIDERS } from "./dns-providers";
import { EMAIL_PROVIDERS } from "./email-providers";
import { HOSTING_PROVIDERS } from "./hosting-providers";
import { REGISTRAR_PROVIDERS } from "./registrar-providers";
import type { ProviderEntry } from "./types";

// Combined provider catalog for backward compatibility
// Keep this list simple and append-only; prefer lowercase in aliases
export const PROVIDERS: ProviderEntry[] = [
  ...HOSTING_PROVIDERS,
  ...EMAIL_PROVIDERS,
  ...REGISTRAR_PROVIDERS,
  ...DNS_PROVIDERS,
];

// Export individual provider lists for targeted usage
export {
  HOSTING_PROVIDERS,
  EMAIL_PROVIDERS,
  REGISTRAR_PROVIDERS,
  DNS_PROVIDERS,
};
