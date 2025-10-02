import { Globe, HardDrive, List, ShieldCheck, User } from "lucide-react";

export type SectionAccent = "blue" | "purple" | "green" | "orange" | "pink";

type SectionDef = {
  title: string;
  accent: SectionAccent;
  icon: React.ElementType;
  description: string;
  help: string;
  // Stable slug to be used for Accordion values and linking
  slug: string;
};

export const SECTION_DEFS: Record<string, SectionDef> = {
  registration: {
    title: "Registration",
    accent: "purple" as SectionAccent,
    icon: User,
    description: "Registrar and registrant details",
    help: "RDAP/WHOIS shows registrar, registration dates, and registrant details.",
    slug: "registration",
  },
  hosting: {
    title: "Hosting & Email",
    accent: "blue" as SectionAccent,
    icon: HardDrive,
    description: "Providers and IP geolocation",
    help: "Hosting provider serves a site; email provider handles a domain's email.",
    slug: "hosting",
  },
  dns: {
    title: "DNS Records",
    accent: "green" as SectionAccent,
    icon: Globe,
    description: "A, AAAA, MX, CNAME, TXT, NS",
    help: "DNS records map the domain to services like web (A/AAAA), mail (MX), and aliases (CNAME).",
    slug: "dns",
  },
  certificates: {
    title: "SSL Certificates",
    accent: "orange" as SectionAccent,
    icon: ShieldCheck,
    description: "Issuer and validity",
    help: "SSL/TLS certificates encrypt traffic and verify a domain's identity.",
    slug: "certificates",
  },
  headers: {
    title: "HTTP Headers",
    accent: "pink" as SectionAccent,
    icon: List,
    description: "Server, security, caching",
    help: "Headers include server info and security/caching directives returned by a site.",
    slug: "headers",
  },
} as const;

export type SectionKey = keyof typeof SECTION_DEFS;

// Single source of truth for section ordering across loading and fallback UIs
export const SECTION_ORDER: readonly SectionKey[] = [
  "registration",
  "hosting",
  "dns",
  "certificates",
  "headers",
] as const;

// Convenient list of stable slugs in visual order for Accordion defaultValue
export const SECTION_SLUGS: readonly string[] = SECTION_ORDER.map(
  (k) => SECTION_DEFS[k].slug,
);
