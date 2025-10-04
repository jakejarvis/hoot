import type { Provider } from "@/lib/schemas";

/**
 * A registry of known hosting providers. The detection algorithm will iterate
 * through this list to identify the hosting provider from HTTP headers.
 */
export const HOSTING_PROVIDERS: Array<
  Omit<Provider, "category"> & { category: "hosting" }
> = [
  {
    name: "Vercel",
    domain: "vercel.com",
    category: "hosting",
    rule: {
      any: [
        { kind: "headerEquals", name: "server", value: "vercel" },
        { kind: "headerPresent", name: "x-vercel-id" },
      ],
    },
  },
  {
    name: "WP Engine",
    domain: "wpengine.com",
    category: "hosting",
    rule: { kind: "headerIncludes", name: "x-powered-by", substr: "wp engine" },
  },
  {
    name: "WordPress VIP",
    domain: "wpvip.com",
    category: "hosting",
    rule: {
      kind: "headerIncludes",
      name: "x-powered-by",
      substr: "wordpress vip",
    },
  },
  {
    name: "WordPress.com",
    domain: "wordpress.com",
    category: "hosting",
    rule: {
      kind: "headerIncludes",
      name: "host-header",
      substr: "wordpress.com",
    },
  },
  {
    name: "Shopify",
    domain: "shopify.com",
    category: "hosting",
    rule: {
      any: [
        { kind: "headerIncludes", name: "powered-by", substr: "shopify" },
        { kind: "headerPresent", name: "x-shopid" },
      ],
    },
  },
  {
    name: "Amazon S3",
    domain: "aws.amazon.com",
    category: "hosting",
    rule: { kind: "headerEquals", name: "server", value: "amazons3" },
  },
  {
    name: "Netlify",
    domain: "netlify.com",
    category: "hosting",
    rule: { kind: "headerEquals", name: "server", value: "netlify" },
  },
  {
    name: "GitHub Pages",
    domain: "github.com",
    category: "hosting",
    rule: { kind: "headerEquals", name: "server", value: "github.com" },
  },
  {
    name: "GitLab Pages",
    domain: "gitlab.com",
    category: "hosting",
    rule: { kind: "headerEquals", name: "server", value: "gitlab pages" },
  },
  {
    name: "Fly.io",
    domain: "fly.io",
    category: "hosting",
    rule: { kind: "headerIncludes", name: "server", substr: "fly/" },
  },
  {
    name: "Heroku",
    domain: "heroku.com",
    category: "hosting",
    rule: {
      any: [
        { kind: "headerEquals", name: "server", value: "vegur" },
        { kind: "headerEquals", name: "server", value: "heroku" },
      ],
    },
  },
  {
    name: "Render",
    domain: "render.com",
    category: "hosting",
    rule: { kind: "headerEquals", name: "server", value: "render" },
  },
  {
    name: "Squarespace",
    domain: "squarespace.com",
    category: "hosting",
    rule: { kind: "headerEquals", name: "server", value: "squarespace" },
  },
  {
    name: "Webflow",
    domain: "webflow.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-wf-page-id" },
  },
  {
    name: "Wix",
    domain: "wix.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-wix-request-id" },
  },
  {
    name: "Azure Front Door",
    domain: "azure.microsoft.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-azure-ref" },
  },
  {
    name: "Google Cloud",
    domain: "cloud.google.com",
    category: "hosting",
    rule: {
      any: [
        { kind: "headerEquals", name: "server", value: "google frontend" },
        { kind: "headerEquals", name: "server", value: "esf" },
        { kind: "headerEquals", name: "server", value: "gws" },
        { kind: "headerIncludes", name: "via", substr: "1.1 google" },
      ],
    },
  },
  {
    name: "Google Cloud Storage",
    domain: "cloud.google.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-goog-generation" },
  },
  {
    name: "Azure Static Web Apps",
    domain: "azure.microsoft.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-azure-ref" },
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-ovh-request-id" },
  },
  {
    name: "Pantheon",
    domain: "pantheon.io",
    category: "hosting",
    rule: {
      any: [
        { kind: "headerPresent", name: "x-pantheon-site" },
        { kind: "headerPresent", name: "x-pantheon-styx-hostname" },
        { kind: "headerPresent", name: "x-styx-req-id" },
      ],
    },
  },
  {
    name: "Sucuri",
    domain: "sucuri.net",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-sucuri-id" },
  },
  {
    name: "Imperva",
    domain: "imperva.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-iinfo" },
  },
  {
    name: "Kinsta",
    domain: "kinsta.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-kinsta-cache" },
  },
  {
    name: "Railway",
    domain: "railway.app",
    category: "hosting",
    rule: {
      any: [
        { kind: "headerPresent", name: "x-railway-request-id" },
        { kind: "headerPresent", name: "x-railway-edge" },
        { kind: "headerIncludes", name: "server", substr: "railway" },
      ],
    },
  },
  {
    name: "Render",
    domain: "render.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-render-origin-server" },
  },
  {
    name: "Bunny.net",
    domain: "bunny.net",
    category: "hosting",
    rule: {
      all: [
        { kind: "headerPresent", name: "cdn-cache" },
        { kind: "headerPresent", name: "perma-cache" },
      ],
    },
  },
  {
    name: "Fastly",
    domain: "fastly.com",
    category: "hosting",
    rule: {
      all: [
        { kind: "headerPresent", name: "x-served-by" },
        { kind: "headerPresent", name: "x-cache" },
        { kind: "headerPresent", name: "x-timer" },
      ],
    },
  },
  {
    name: "Akamai",
    domain: "akamai.com",
    category: "hosting",
    rule: {
      any: [
        { kind: "headerEquals", name: "server", value: "akamaighost" },
        { kind: "headerPresent", name: "x-akamai-transformed" },
        { kind: "headerPresent", name: "x-akamai-request-id" },
        { kind: "headerPresent", name: "akamai-request-bc" },
        { kind: "headerPresent", name: "akamai-grn" },
      ],
    },
  },
  {
    name: "Amazon CloudFront",
    domain: "aws.amazon.com",
    category: "hosting",
    rule: {
      any: [
        { kind: "headerEquals", name: "server", value: "cloudfront" },
        { kind: "headerPresent", name: "x-amz-cf-id" },
      ],
    },
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    category: "hosting",
    rule: {
      all: [
        { kind: "headerEquals", name: "server", value: "cloudflare" },
        { kind: "headerPresent", name: "cf-ray" },
      ],
    },
  },
];

/**
 * A registry of known email providers. The detection algorithm will iterate
 * through this list to identify the email provider from MX records.
 */
export const EMAIL_PROVIDERS: Array<
  Omit<Provider, "category"> & { category: "email" }
> = [
  {
    name: "Google Workspace",
    domain: "google.com",
    category: "email",
    rule: {
      any: [
        { kind: "mxSuffix", suffix: "smtp.google.com" },
        { kind: "mxSuffix", suffix: "aspmx.l.google.com" },
        { kind: "mxSuffix", suffix: "googlemail.com" },
      ],
    },
  },
  {
    name: "Microsoft 365",
    domain: "office.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "mail.protection.outlook.com" },
  },
  {
    name: "Zoho",
    domain: "zoho.com",
    category: "email",
    rule: {
      any: [
        { kind: "mxSuffix", suffix: "mx.zoho.com" },
        { kind: "mxSuffix", suffix: "mx.zoho.eu" },
      ],
    },
  },
  {
    name: "Proton",
    domain: "proton.me",
    category: "email",
    rule: {
      any: [
        { kind: "mxSuffix", suffix: "mail.protonmail.ch" },
        { kind: "mxSuffix", suffix: "mailsec.protonmail.ch" },
      ],
    },
  },
  {
    name: "Fastmail",
    domain: "fastmail.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "messagingengine.com" },
  },
  {
    name: "Cloudflare Email Routing",
    domain: "cloudflare.com",
    category: "email",
    rule: {
      any: [
        { kind: "mxSuffix", suffix: "mx.cloudflare.net" },
        { kind: "mxSuffix", suffix: "inbound.cf-emailsecurity.net" },
      ],
    },
  },
  {
    name: "Yahoo Mail",
    domain: "yahoo.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "yahoodns.net" },
  },
  {
    name: "Yandex 360",
    domain: "yandex.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "mx.yandex.net" },
  },
  {
    name: "ImprovMX",
    domain: "improvmx.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "improvmx.com" },
  },
  {
    name: "Forward Email",
    domain: "forwardemail.net",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "forwardemail.net" },
  },
  {
    name: "Migadu",
    domain: "migadu.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "migadu.com" },
  },
  {
    name: "iCloud Mail",
    domain: "icloud.com",
    category: "email",
    rule: {
      any: [
        { kind: "mxSuffix", suffix: "mail.icloud.com" },
        { kind: "mxSuffix", suffix: "apple.com" },
      ],
    },
  },
  {
    name: "Mailgun",
    domain: "mailgun.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "mailgun.org" },
  },
  {
    name: "SendGrid",
    domain: "sendgrid.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "sendgrid.net" },
  },
  {
    name: "Mailjet",
    domain: "mailjet.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "mailjet.com" },
  },
  {
    name: "Postmark",
    domain: "postmarkapp.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "postmarkapp.com" },
  },
  {
    name: "Rackspace Email",
    domain: "rackspace.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "emailsrvr.com" },
  },
  {
    name: "Proofpoint",
    domain: "proofpoint.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "pphosted.com" },
  },
  {
    name: "Amazon WorkMail",
    domain: "aws.amazon.com",
    category: "email",
    rule: {
      kind: "mxRegex",
      pattern: "^inbound-smtp\\.[a-z]{2}-[a-z0-9-]+-\\d\\.amazonaws\\.com$",
      flags: "i",
    },
  },
  {
    name: "Titan Email",
    domain: "titan.email",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "titan.email" },
  },
  {
    name: "IONOS Mail",
    domain: "ionos.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "ionos.com" },
  },
  {
    name: "Mimecast",
    domain: "mimecast.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "mimecast.com" },
  },
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "secureserver.net" },
  },
  {
    name: "Namecheap",
    domain: "namecheap.com",
    category: "email",
    rule: {
      any: [
        { kind: "mxSuffix", suffix: "registrar-servers.com" },
        { kind: "mxSuffix", suffix: "privateemail.com" },
      ],
    },
  },
  {
    name: "WordPress.com",
    domain: "wordpress.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "wordpress.com" },
  },
];

/**
 * A registry of known DNS providers. The detection algorithm will iterate
 * through this list to identify the DNS provider from NS records.
 */
export const DNS_PROVIDERS: Array<
  Omit<Provider, "category"> & { category: "dns" }
> = [
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "cloudflare.com" },
  },
  {
    name: "Vercel",
    domain: "vercel.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "vercel-dns.com" },
  },
  {
    name: "DNSimple",
    domain: "dnsimple.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "dnsimple.com" },
        { kind: "nsSuffix", suffix: "dnsimple-edge.net" },
        { kind: "nsSuffix", suffix: "dnsimple-edge.org" },
      ],
    },
  },
  {
    name: "WordPress.com",
    domain: "wordpress.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "wordpress.com" },
  },
  {
    name: "DNS Made Easy",
    domain: "dnsmadeeasy.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "dnsmadeeasy.com" },
        { kind: "nsSuffix", suffix: "constellix.com" },
        { kind: "nsSuffix", suffix: "constellix.net" },
      ],
    },
  },
  {
    name: "DigitalOcean",
    domain: "digitalocean.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "digitalocean.com" },
  },
  {
    name: "NS1",
    domain: "ns1.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "nsone.net" },
  },
  {
    name: "Amazon Route 53",
    domain: "aws.amazon.com",
    category: "dns",
    rule: {
      kind: "nsRegex",
      pattern: "^ns-\\d+\\.awsdns-\\d+\\.(com|net|org|co\\.uk)$",
      flags: "i",
    },
  },
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "domaincontrol.com" },
  },
  {
    name: "Google Cloud DNS",
    domain: "cloud.google.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "googledomains.com" },
        { kind: "nsSuffix", suffix: "google.com" },
      ],
    },
  },
  {
    name: "Hurricane Electric",
    domain: "he.net",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "he.net" },
  },
  {
    name: "Linode",
    domain: "linode.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "linode.com" },
  },
  {
    name: "Hetzner",
    domain: "hetzner.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "hetzner.de" },
        { kind: "nsSuffix", suffix: "hetzner.com" },
      ],
    },
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "ovh.net" },
        { kind: "nsSuffix", suffix: "ovh.co.uk" },
      ],
    },
  },
  {
    name: "1&1 IONOS",
    domain: "ionos.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "ionos.com" },
        { kind: "nsSuffix", suffix: "1and1.com" },
      ],
    },
  },
  {
    name: "NameSilo",
    domain: "namesilo.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "namesilo.com" },
  },
  {
    name: "DreamHost",
    domain: "dreamhost.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "dreamhost.com" },
  },
  {
    name: "Squarespace",
    domain: "squarespace.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "squarespacedns.com" },
  },
  {
    name: "Wix",
    domain: "wix.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "wixdns.net" },
  },
  {
    name: "Microsoft Azure",
    domain: "azure.microsoft.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "azure-dns.com" },
        { kind: "nsSuffix", suffix: "azure-dns.net" },
        { kind: "nsSuffix", suffix: "azure-dns.org" },
        { kind: "nsSuffix", suffix: "azure-dns.info" },
      ],
    },
  },
  {
    name: "Namecheap FreeDNS",
    domain: "namecheap.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "registrar-servers.com" },
  },
  {
    name: "Akamai Edge DNS",
    domain: "akamai.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "akam.net" },
  },
  {
    name: "UltraDNS (Vercara)",
    domain: "vercara.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "ultradns.net" },
        { kind: "nsSuffix", suffix: "ultradns.org" },
        { kind: "nsSuffix", suffix: "ultradns.com" },
        { kind: "nsSuffix", suffix: "ultradns.biz" },
      ],
    },
  },
  {
    name: "Porkbun DNS",
    domain: "porkbun.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "porkbun.com" },
  },
  {
    name: "AliDNS / HiChina",
    domain: "alibabacloud.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "hichina.com" },
        { kind: "nsSuffix", suffix: "alidns.com" },
      ],
    },
  },
  {
    name: "DNSPod",
    domain: "dnspod.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "dnspod.net" },
  },
  {
    name: "Network Solutions",
    domain: "networksolutions.com",
    category: "dns",
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "worldnic.com" },
        { kind: "nsSuffix", suffix: "register.com" },
      ],
    },
  },
  {
    name: "Fastmail",
    domain: "fastmail.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "messagingengine.com" },
  },
  {
    name: "Gandi LiveDNS",
    domain: "gandi.net",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "gandi.net" },
  },
];

/** Registrar providers registry for WHOIS/RDAP partial name matching */
export const REGISTRAR_PROVIDERS: Array<
  Omit<Provider, "category"> & { category: "registrar" }
> = [
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "godaddy" },
        { kind: "registrarIncludes", substr: "go daddy" },
        { kind: "registrarIncludes", substr: "wild west domains" },
      ],
    },
  },
  {
    name: "Namecheap",
    domain: "namecheap.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "namecheap" },
  },
  {
    name: "Squarespace",
    domain: "squarespace.domains",
    category: "registrar",
    rule: {
      any: [{ kind: "registrarIncludes", substr: "squarespace" }],
    },
  },
  // Keep Google LLC for rare legacy WHOIS text, but do not alias to MarkMonitor (separate registrar).
  {
    name: "Google",
    domain: "google.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "google" },
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "cloudflare" },
  },
  {
    name: "Amazon Route 53",
    domain: "aws.amazon.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "amazon" },
  },
  {
    name: "Sav.com",
    domain: "sav.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "sav" },
  },
  {
    name: "1API",
    domain: "1api.net",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "1api" },
  },
  {
    name: "Gandi",
    domain: "gandi.net",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "gandi" },
  },
  {
    name: "Tucows",
    domain: "tucows.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "tucows" },
        { kind: "registrarIncludes", substr: "hover" },
        { kind: "registrarIncludes", substr: "opensrs" },
      ],
    },
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "ovhcloud" },
        { kind: "registrarIncludes", substr: "ovhgroup" },
        { kind: "registrarIncludes", substr: "ovh sas" },
      ],
    },
  },
  {
    name: "1&1 IONOS",
    domain: "ionos.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "1&1" },
        { kind: "registrarIncludes", substr: "ionos" },
        { kind: "registrarIncludes", substr: "united internet" },
      ],
    },
  },
  {
    name: "Name.com",
    domain: "name.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "name.com" },
        { kind: "registrarIncludes", substr: "rightside" },
        { kind: "registrarIncludes", substr: "afilias" },
        { kind: "registrarIncludes", substr: "donuts" },
        { kind: "registrarIncludes", substr: "identity digital" },
      ],
    },
  },
  {
    name: "Dynadot",
    domain: "dynadot.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "dynadot" },
  },
  {
    name: "Porkbun",
    domain: "porkbun.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "porkbun" },
  },
  {
    name: "Alibaba Cloud",
    domain: "alibaba.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "alibaba" },
        { kind: "registrarIncludes", substr: "aliyun" },
      ],
    },
  },
  {
    name: "Enom",
    domain: "enom.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "enom" },
  },
  {
    name: "GMO Internet",
    domain: "gmo.jp",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "gmo internet" },
        { kind: "registrarIncludes", substr: "onamae" },
      ],
    },
  },
  {
    name: "Openprovider (Registrar.eu)",
    domain: "openprovider.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "hosting concepts" },
        { kind: "registrarIncludes", substr: "registrar.eu" },
      ],
    },
  },
  {
    name: "EuroDNS",
    domain: "eurodns.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "eurodns" },
  },
  {
    name: "Network Solutions",
    domain: "networksolutions.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "network solutions" },
        { kind: "registrarIncludes", substr: "networksolutions" },
        { kind: "registrarIncludes", substr: "web.com" },
      ],
    },
  },
  {
    name: "Register.com",
    domain: "register.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "register.com" },
        { kind: "registrarIncludes", substr: "register, inc" },
        { kind: "registrarIncludes", substr: "register inc" },
      ],
    },
  },
  {
    name: "Automattic",
    domain: "wordpress.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "automattic" },
        { kind: "registrarIncludes", substr: "wordpress.com" },
      ],
    },
  },
  {
    name: "MarkMonitor",
    domain: "markmonitor.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "markmonitor" },
  },
  {
    name: "CSC Corporate Domains",
    domain: "cscdbs.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "csc corporate" },
        { kind: "registrarIncludes", substr: "csc global" },
      ],
    },
  },
  {
    name: "Ascio",
    domain: "ascio.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "ascio" },
  },
  {
    name: "Key-Systems",
    domain: "key-systems.net",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "key-systems" },
        { kind: "registrarIncludes", substr: "rrpproxy" },
      ],
    },
  },
  {
    name: "PublicDomainRegistry (PDR)",
    domain: "publicdomainregistry.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "publicdomainregistry" },
        { kind: "registrarIncludes", substr: "pdr ltd" },
      ],
    },
  },
  {
    name: "Wix",
    domain: "wix.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "wix" },
  },
  {
    name: "RegistrarSafe",
    domain: "meta.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "registrarsafe" },
  },
  {
    name: "Com Laude",
    domain: "comlaude.com",
    category: "registrar",
    rule: {
      any: [
        { kind: "registrarIncludes", substr: "nom-iq" },
        { kind: "registrarIncludes", substr: "comlaude" },
      ],
    },
  },
  {
    name: "NameBright",
    domain: "namebright.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "namebright" },
  },

  {
    name: "Domain.com",
    domain: "domain.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "domain.com" },
  },
  {
    name: "DreamHost",
    domain: "dreamhost.com",
    category: "registrar",
    rule: { kind: "registrarIncludes", substr: "dreamhost" },
  },
];

/**
 * Certificate Authorities registry. Matches against issuer strings.
 */
export const CA_PROVIDERS: Array<
  Omit<Provider, "category"> & { category: "ca" }
> = [
  {
    name: "Let's Encrypt",
    domain: "letsencrypt.org",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "let's encrypt" },
        { kind: "issuerIncludes", substr: "lets encrypt" },
        { kind: "issuerIncludes", substr: "isrg" },
        // https://letsencrypt.org/certificates/
        { kind: "issuerEquals", value: "e1" },
        { kind: "issuerEquals", value: "e2" },
        { kind: "issuerEquals", value: "e5" },
        { kind: "issuerEquals", value: "e6" },
        { kind: "issuerEquals", value: "e7" },
        { kind: "issuerEquals", value: "e8" },
        { kind: "issuerEquals", value: "e9" },
        { kind: "issuerEquals", value: "r3" },
        { kind: "issuerEquals", value: "r4" },
        { kind: "issuerEquals", value: "r10" },
        { kind: "issuerEquals", value: "r11" },
        { kind: "issuerEquals", value: "r12" },
        { kind: "issuerEquals", value: "r13" },
        { kind: "issuerEquals", value: "r14" },
        { kind: "issuerEquals", value: "ye1" },
        { kind: "issuerEquals", value: "ye2" },
        { kind: "issuerEquals", value: "ye3" },
        { kind: "issuerEquals", value: "yr1" },
        { kind: "issuerEquals", value: "yr2" },
        { kind: "issuerEquals", value: "yr3" },
      ],
    },
  },
  {
    name: "Google Trust Services",
    domain: "pki.goog",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "google trust services" },
        { kind: "issuerIncludes", substr: "gts" },
        // https://pki.goog/repository/
        { kind: "issuerEquals", value: "wr1" },
        { kind: "issuerEquals", value: "wr2" },
        { kind: "issuerEquals", value: "wr3" },
        { kind: "issuerEquals", value: "wr4" },
        { kind: "issuerEquals", value: "wr5" },
        { kind: "issuerEquals", value: "we1" },
        { kind: "issuerEquals", value: "we2" },
        { kind: "issuerEquals", value: "we3" },
        { kind: "issuerEquals", value: "we4" },
        { kind: "issuerEquals", value: "we5" },
      ],
    },
  },
  {
    name: "ZeroSSL",
    domain: "zerossl.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "zerossl" },
  },
  {
    name: "Thawte (DigiCert)",
    domain: "thawte.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "thawte" },
  },
  {
    name: "DigiCert",
    domain: "digicert.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "digicert" },
        { kind: "issuerIncludes", substr: "baltimore cybertrust" },
        { kind: "issuerIncludes", substr: "quovadis" },
      ],
    },
  },
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "godaddy" },
        { kind: "issuerIncludes", substr: "go daddy" },
        { kind: "issuerIncludes", substr: "starfield" },
      ],
    },
  },
  {
    name: "Sectigo (Comodo)",
    domain: "sectigo.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "sectigo" },
        { kind: "issuerIncludes", substr: "comodo" },
        { kind: "issuerIncludes", substr: "usertrust" },
        { kind: "issuerIncludes", substr: "aaa" },
      ],
    },
  },
  {
    name: "GlobalSign",
    domain: "globalsign.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "globalsign" },
  },
  {
    name: "GeoTrust",
    domain: "geotrust.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "geotrust" },
  },
  {
    name: "Entrust",
    domain: "entrust.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "entrust" },
  },
  {
    name: "Amazon Trust Services",
    domain: "amazontrust.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "amazon" },
  },
  {
    name: "SSL.com",
    domain: "ssl.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "ssl.com" },
  },
  {
    name: "Buypass",
    domain: "buypass.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "buypass" },
  },
  {
    name: "HARICA",
    domain: "harica.gr",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "harica" },
  },
  {
    name: "Actalis",
    domain: "actalis.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "actalis" },
  },
  {
    name: "TrustAsia",
    domain: "trustasia.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "trustasia" },
  },
  {
    name: "D-TRUST",
    domain: "d-trust.net",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "d-trust" },
  },
  {
    name: "TWCA",
    domain: "twca.com.tw",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "twca" },
        { kind: "issuerIncludes", substr: "taiwan-ca" },
      ],
    },
  },
  {
    name: "SwissSign",
    domain: "swisssign.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "swisssign" },
  },
  {
    name: "RapidSSL",
    domain: "rapidssl.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "rapidssl" },
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "cloudflare" },
  },
  {
    name: "IdenTrust",
    domain: "identrust.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "identrust" },
        { kind: "issuerIncludes", substr: "trustid" },
      ],
    },
  },
  {
    name: "Certum (Asseco)",
    domain: "www.certum.eu",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "certum" },
  },
];
