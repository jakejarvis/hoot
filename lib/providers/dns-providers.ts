import type { ProviderEntry } from "./types";

// DNS providers - Keep this list simple and append-only; prefer lowercase in aliases
export const DNS_PROVIDERS: ProviderEntry[] = [
  {
    name: "DNSimple",
    domain: "dnsimple.com",
    category: "dns",
    aliases: ["dnsimple"],
  },
  {
    name: "DNS Made Easy",
    domain: "dnsmadeeasy.com",
    category: "dns",
    aliases: ["dnsmadeeasy"],
  },
  {
    name: "NS1",
    domain: "ns1.com",
    category: "dns",
    aliases: ["nsone", "ns1"],
  },
  {
    name: "Amazon Route 53",
    domain: "aws.amazon.com",
    category: "dns",
    aliases: ["route 53", "route53", "awsdns"],
  },
  {
    name: "Google Cloud DNS",
    domain: "cloud.google.com",
    category: "dns",
    aliases: ["google cloud dns", "googledomains"],
  },
  {
    name: "Hurricane Electric",
    domain: "he.net",
    category: "dns",
    aliases: ["he.net", "hurricane electric"],
  },
];
