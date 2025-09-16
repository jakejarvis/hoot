// Central catalog and simple detection helpers for providers

export type HttpHeader = { name: string; value: string };

type ProviderCategory = "hosting" | "email" | "registrar";

type ProviderEntry = {
  name: string;
  domain: string; // for favicon display
  category: ProviderCategory;
  aliases?: string[]; // lowercase aliases to help domain mapping by free-form names
};

type HostingRule = {
  provider: string; // must match ProviderEntry.name
  // All matching is case-insensitive and uses substring includes
  serverIncludes?: string[];
  headerNameStartsWith?: string[];
  headerExists?: string[];
  headerValueIncludes?: Record<string, string[]>; // header -> substrings
};

type EmailRule = {
  provider: string; // must match ProviderEntry.name
  // Match if any MX host string contains one of these substrings (case-insensitive)
  mxIncludes: string[];
};

// ---- Provider catalog ----
// Keep this list simple and append-only; prefer lowercase in aliases
const PROVIDERS: ProviderEntry[] = [
  // Hosting
  {
    name: "Vercel",
    domain: "vercel.com",
    category: "hosting",
    aliases: ["vercel"],
  },
  {
    name: "Netlify",
    domain: "netlify.com",
    category: "hosting",
    aliases: ["netlify"],
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    category: "hosting",
    aliases: ["cloudflare", "cloudflare registrar"],
  },
  {
    name: "DigitalOcean",
    domain: "digitalocean.com",
    category: "hosting",
    aliases: ["digitalocean"],
  },
  {
    name: "Amazon S3",
    domain: "aws.amazon.com",
    category: "hosting",
    aliases: ["aws", "amazon", "amazon web services", "s3", "amazon s3"],
  },
  {
    name: "GitHub Pages",
    domain: "github.com",
    category: "hosting",
    aliases: ["github pages", "github"],
  },
  {
    name: "Fly.io",
    domain: "fly.io",
    category: "hosting",
    aliases: ["fly.io", "flyio", "fly"],
  },
  {
    name: "Akamai",
    domain: "akamai.com",
    category: "hosting",
    aliases: ["akamai"],
  },
  {
    name: "Heroku",
    domain: "heroku.com",
    category: "hosting",
    aliases: ["heroku"],
  },
  {
    name: "WP Engine",
    domain: "wpengine.com",
    category: "hosting",
    aliases: ["wp engine"],
  },
  {
    name: "WordPress.com",
    domain: "wordpress.com",
    category: "hosting",
    aliases: ["wordpress"],
  },
  {
    name: "Pantheon",
    domain: "pantheon.io",
    category: "hosting",
    aliases: ["pantheon"],
  },
  {
    name: "Squarespace",
    domain: "squarespace.com",
    category: "hosting",
    aliases: ["squarespace"],
  },
  {
    name: "Wix",
    domain: "wix.com",
    category: "hosting",
    aliases: ["wix"],
  },
  {
    name: "Shopify",
    domain: "shopify.com",
    category: "hosting",
    aliases: ["shopify"],
  },
  {
    name: "Webflow",
    domain: "webflow.com",
    category: "hosting",
    aliases: ["webflow"],
  },
  {
    name: "Render",
    domain: "render.com",
    category: "hosting",
    aliases: ["render"],
  },
  {
    name: "Railway",
    domain: "railway.app",
    category: "hosting",
    aliases: ["railway", "railway.app"],
  },
  {
    name: "Firebase Hosting",
    domain: "firebase.google.com",
    category: "hosting",
    aliases: ["firebase", "firebase hosting", "web.app"],
  },
  {
    name: "Google Cloud Storage",
    domain: "cloud.google.com",
    category: "hosting",
    aliases: ["google cloud storage", "gcs", "storage.googleapis.com"],
  },
  {
    name: "Azure Static Web Apps",
    domain: "azure.microsoft.com",
    category: "hosting",
    aliases: ["azure static web apps", "azure static", "azure"],
  },
  {
    name: "GitLab Pages",
    domain: "gitlab.com",
    category: "hosting",
    aliases: ["gitlab pages", "gitlab"],
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    category: "hosting",
    aliases: ["ovh", "ovhcloud"],
  },
  {
    name: "Hetzner",
    domain: "hetzner.com",
    category: "hosting",
    aliases: ["hetzner"],
  },
  {
    name: "Linode",
    domain: "linode.com",
    category: "hosting",
    aliases: ["linode"],
  },

  // Email
  {
    name: "Google Workspace",
    domain: "google.com",
    category: "email",
    aliases: ["google workspace", "gmail"],
  },
  {
    name: "Microsoft 365",
    domain: "office.com",
    category: "email",
    aliases: ["microsoft 365", "office"],
  },
  {
    name: "Fastmail",
    domain: "fastmail.com",
    category: "email",
    aliases: ["fastmail", "messagingengine"],
  },
  { name: "Zoho", domain: "zoho.com", category: "email", aliases: ["zoho"] },
  {
    name: "Proton",
    domain: "proton.me",
    category: "email",
    aliases: ["proton"],
  },
  {
    name: "Cloudflare Email Routing",
    domain: "cloudflare.com",
    category: "email",
    aliases: ["cloudflare email routing"],
  },
  {
    name: "Yahoo Mail",
    domain: "yahoo.com",
    category: "email",
    aliases: ["yahoo", "yahoodns", "mail.yahoo.com"],
  },
  {
    name: "Yandex 360",
    domain: "yandex.com",
    category: "email",
    aliases: ["yandex", "yandex 360"],
  },
  {
    name: "ImprovMX",
    domain: "improvmx.com",
    category: "email",
    aliases: ["improvmx"],
  },
  {
    name: "Forward Email",
    domain: "forwardemail.net",
    category: "email",
    aliases: ["forwardemail", "forward email"],
  },
  {
    name: "Migadu",
    domain: "migadu.com",
    category: "email",
    aliases: ["migadu"],
  },
  {
    name: "iCloud Mail",
    domain: "icloud.com",
    category: "email",
    aliases: ["icloud", "icloud mail"],
  },
  {
    name: "Mailgun",
    domain: "mailgun.com",
    category: "email",
    aliases: ["mailgun"],
  },
  {
    name: "SendGrid",
    domain: "sendgrid.com",
    category: "email",
    aliases: ["sendgrid"],
  },
  {
    name: "Mailjet",
    domain: "mailjet.com",
    category: "email",
    aliases: ["mailjet"],
  },
  {
    name: "Postmark",
    domain: "postmarkapp.com",
    category: "email",
    aliases: ["postmark", "postmarkapp"],
  },
  {
    name: "Rackspace Email",
    domain: "rackspace.com",
    category: "email",
    aliases: ["rackspace", "emailsrvr"],
  },

  // Registrars (for favicon mapping only)
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
];

// ---- Detection rules ----
const HOSTING_RULES: HostingRule[] = [
  {
    provider: "Vercel",
    serverIncludes: ["vercel"],
    headerNameStartsWith: ["x-vercel"],
  },
  {
    provider: "WP Engine",
    headerValueIncludes: { "x-powered-by": ["wp engine"] },
  },
  {
    provider: "WordPress.com",
    headerValueIncludes: { "host-header": ["wordpress.com"] },
  },
  { provider: "Amazon S3", serverIncludes: ["amazons3"] },
  { provider: "Netlify", serverIncludes: ["netlify"] },
  { provider: "GitHub Pages", serverIncludes: ["github"] },
  { provider: "GitLab Pages", serverIncludes: ["gitlab"] },
  { provider: "Fly.io", serverIncludes: ["fly.io"] },
  { provider: "Akamai", serverIncludes: ["akamai"] },
  { provider: "Heroku", serverIncludes: ["heroku"] },
  { provider: "Render", serverIncludes: ["render"] },
  { provider: "Squarespace", headerExists: ["x-contextid"] },
  { provider: "Shopify", headerNameStartsWith: ["x-shopify"] },
  { provider: "Webflow", headerNameStartsWith: ["x-wf-"] },
  { provider: "Wix", headerNameStartsWith: ["x-wix"] },
  {
    provider: "Cloudflare",
    serverIncludes: ["cloudflare"],
    headerExists: ["cf-ray"],
  },
  { provider: "Google Cloud Storage", headerNameStartsWith: ["x-goog"] },
  { provider: "Azure Static Web Apps", headerExists: ["x-azure-ref"] },
  { provider: "OVHcloud", headerNameStartsWith: ["x-ovh-"] },
  {
    provider: "Pantheon",
    headerNameStartsWith: ["x-pantheon"],
  },
];

const EMAIL_RULES: EmailRule[] = [
  { provider: "Google Workspace", mxIncludes: ["google"] },
  {
    provider: "Microsoft 365",
    mxIncludes: ["outlook", "protection.outlook.com"],
  },
  { provider: "Zoho", mxIncludes: ["zoho"] },
  { provider: "Proton", mxIncludes: ["proton"] },
  { provider: "Fastmail", mxIncludes: ["messagingengine"] },
  { provider: "Cloudflare Email Routing", mxIncludes: ["mx.cloudflare.net"] },
  { provider: "Yahoo Mail", mxIncludes: ["yahoo", "yahoodns"] },
  { provider: "Yandex 360", mxIncludes: ["yandex"] },
  { provider: "ImprovMX", mxIncludes: ["improvmx"] },
  { provider: "Forward Email", mxIncludes: ["forwardemail"] },
  { provider: "Migadu", mxIncludes: ["migadu"] },
  { provider: "iCloud Mail", mxIncludes: ["icloud"] },
  { provider: "Mailgun", mxIncludes: ["mailgun"] },
  { provider: "SendGrid", mxIncludes: ["sendgrid"] },
  { provider: "Mailjet", mxIncludes: ["mailjet"] },
  { provider: "Postmark", mxIncludes: ["postmark", "postmarkapp"] },
  { provider: "Rackspace Email", mxIncludes: ["emailsrvr"] },
];

// ---- Public helpers ----

export function mapProviderNameToDomain(name: string): string | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();

  // Prefer alias match first
  for (const p of PROVIDERS) {
    if (p.aliases?.some((a) => n.includes(a))) return p.domain;
  }
  // Then exact name match (case-insensitive)
  const direct = PROVIDERS.find((p) => p.name.toLowerCase() === n);
  return direct?.domain;
}

export function detectHostingProviderFromHeaders(
  headers: HttpHeader[],
): string {
  const byName = Object.fromEntries(
    headers.map((h) => [h.name.toLowerCase(), h.value]),
  ) as Record<string, string>;
  const server = (byName.server || "").toLowerCase();
  const headerNames = headers.map((h) => h.name.toLowerCase());

  for (const rule of HOSTING_RULES) {
    // serverIncludes
    if (rule.serverIncludes && server) {
      for (const s of rule.serverIncludes) {
        if (server.includes(s)) return rule.provider;
      }
    }

    // headerNameStartsWith
    if (rule.headerNameStartsWith) {
      const prefixes = rule.headerNameStartsWith;
      if (headerNames.some((n) => prefixes.some((p) => n.startsWith(p)))) {
        return rule.provider;
      }
    }

    // headerExists
    if (rule.headerExists) {
      if (rule.headerExists.some((h) => h in byName)) return rule.provider;
    }

    // headerValueIncludes
    if (rule.headerValueIncludes) {
      for (const [hn, needles] of Object.entries(rule.headerValueIncludes)) {
        const val = (byName[hn] || "").toLowerCase();
        if (val && needles.some((needle) => val.includes(needle)))
          return rule.provider;
      }
    }
  }

  // Do not fall back to raw Server header (e.g., nginx, Apache) as a provider name
  return "Unknown";
}

export function detectEmailProviderFromMx(mxHosts: string[]): string {
  const hostsJoined = mxHosts.join(" ").toLowerCase();
  for (const rule of EMAIL_RULES) {
    if (rule.mxIncludes.some((s) => hostsJoined.includes(s)))
      return rule.provider;
  }
  // Fallback: return the first raw MX host if any, else Unknown
  return mxHosts[0] ? mxHosts[0] : "Unknown";
}

// ---- Utils ----

// Optionally export the catalog for UI use/debugging
export const ProviderCatalog = {
  all: PROVIDERS,
  hostingRules: HOSTING_RULES,
  emailRules: EMAIL_RULES,
};
