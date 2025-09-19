import type { ProviderEntry } from "./types";

// Registrar providers - Keep this list simple and append-only; prefer lowercase in aliases
export const REGISTRAR_PROVIDERS: ProviderEntry[] = [
  {
    name: "Namecheap",
    domain: "namecheap.com",
    category: "registrar",
    aliases: ["namecheap"],
  },
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    category: "registrar",
    aliases: ["godaddy"],
  },
  {
    name: "Google Domains",
    domain: "domains.google",
    category: "registrar",
    aliases: ["google domains"],
  },
  {
    name: "MarkMonitor",
    domain: "markmonitor.com",
    category: "registrar",
    aliases: ["markmonitor"],
  },
  {
    name: "Porkbun",
    domain: "porkbun.com",
    category: "registrar",
    aliases: ["porkbun"],
  },
  {
    name: "Name.com",
    domain: "name.com",
    category: "registrar",
    aliases: ["name.com"],
  },
  {
    name: "Enom",
    domain: "enom.com",
    category: "registrar",
    aliases: ["enom"],
  },
  {
    name: "Hover",
    domain: "hover.com",
    category: "registrar",
    aliases: ["hover"],
  },
  {
    name: "Dynadot",
    domain: "dynadot.com",
    category: "registrar",
    aliases: ["dynadot"],
  },
  {
    name: "Gandi",
    domain: "gandi.net",
    category: "registrar",
    aliases: ["gandi"],
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    category: "registrar",
    aliases: ["ovh", "ovhcloud"],
  },
  {
    name: "IONOS",
    domain: "ionos.com",
    category: "registrar",
    aliases: ["ionos", "1and1", "1&1"],
  },
  {
    name: "NameSilo",
    domain: "namesilo.com",
    category: "registrar",
    aliases: ["namesilo"],
  },
  {
    name: "Squarespace Domains",
    domain: "squarespace.com",
    category: "registrar",
    aliases: ["squarespace domains", "squarespace"],
  },
  {
    name: "DreamHost",
    domain: "dreamhost.com",
    category: "registrar",
    aliases: ["dreamhost"],
  },
  {
    name: "Onamae.com (GMO)",
    domain: "onamae.com",
    category: "registrar",
    aliases: ["onamae", "gmo"],
  },
  {
    name: "Alibaba Cloud Domains",
    domain: "alibabacloud.com",
    category: "registrar",
    aliases: ["alibaba cloud", "alibabacloud"],
  },
  {
    name: "Hostinger",
    domain: "hostinger.com",
    category: "registrar",
    aliases: ["hostinger"],
  },
  {
    name: "WordPress.com",
    domain: "wordpress.com",
    category: "registrar",
    aliases: ["automattic", "automattic inc"],
  },
  {
    name: "Network Solutions",
    domain: "networksolutions.com",
    category: "registrar",
    aliases: ["networksolutions", "network solutions", "netsol"],
  },
];
