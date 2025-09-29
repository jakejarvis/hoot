import { USER_AGENT } from "@/lib/constants";
export type DnsRecordType = "A" | "AAAA" | "MX" | "TXT" | "NS";

export type DohProviderKey = "cloudflare" | "google";

export type DohProvider = {
  key: DohProviderKey;
  buildUrl: (domain: string, type: DnsRecordType) => URL;
  headers?: Record<string, string>;
};

const DEFAULT_HEADERS: Record<string, string> = {
  accept: "application/dns-json",
  "user-agent": USER_AGENT,
};

export const DOH_PROVIDERS: DohProvider[] = [
  {
    key: "cloudflare",
    buildUrl: (domain, type) => {
      const u = new URL("https://cloudflare-dns.com/dns-query");
      u.searchParams.set("name", domain);
      u.searchParams.set("type", type);
      return u;
    },
    headers: DEFAULT_HEADERS,
  },
  {
    key: "google",
    buildUrl: (domain, type) => {
      const u = new URL("https://dns.google/resolve");
      u.searchParams.set("name", domain);
      u.searchParams.set("type", type);
      return u;
    },
    headers: DEFAULT_HEADERS,
  },
];
