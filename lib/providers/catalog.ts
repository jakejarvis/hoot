import type { Provider, RegistrarProvider } from "@/lib/schemas";

/**
 * A registry of known hosting providers. The detection algorithm will iterate
 * through this list to identify the hosting provider from HTTP headers.
 */
export const HOSTING_PROVIDERS: Provider[] = [
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
    name: "Akamai",
    domain: "akamai.com",
    category: "hosting",
    rule: { kind: "headerEquals", name: "server", value: "akamaighost" },
  },
  {
    name: "Amazon CloudFront",
    domain: "aws.amazon.com",
    category: "hosting",
    rule: {
      all: [
        { kind: "headerEquals", name: "server", value: "cloudfront" },
        { kind: "headerPresent", name: "x-amz-cf-id" },
      ],
    },
  },
  {
    name: "Heroku",
    domain: "heroku.com",
    category: "hosting",
    rule: { kind: "headerEquals", name: "server", value: "vegur" },
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
    rule: { kind: "headerPresent", name: "x-contextid" },
  },
  {
    name: "Shopify",
    domain: "shopify.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-shopify-stage" },
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
  {
    name: "Azure Front Door",
    domain: "azure.microsoft.com",
    category: "hosting",
    rule: { kind: "headerPresent", name: "x-azure-ref" },
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
    rule: { kind: "headerPresent", name: "x-pantheon-site" },
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
    name: "WordPress VIP",
    domain: "wpvip.com",
    category: "hosting",
    rule: {
      kind: "headerIncludes",
      name: "x-powered-by",
      substr: "wordpress vip",
    },
  },
];

/**
 * A registry of known email providers. The detection algorithm will iterate
 * through this list to identify the email provider from MX records.
 */
export const EMAIL_PROVIDERS: Provider[] = [
  {
    name: "Google Workspace",
    domain: "google.com",
    category: "email",
    rule: {
      any: [
        { kind: "mxSuffix", suffix: "smtp.google.com" },
        { kind: "mxSuffix", suffix: "aspmx.l.google.com" },
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
    rule: { kind: "mxSuffix", suffix: "mx.zoho.com" },
  },
  {
    name: "Proton",
    domain: "proton.me",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "protonmail.ch" },
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
    rule: { kind: "mxSuffix", suffix: "mx.cloudflare.net" },
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
    rule: { kind: "mxSuffix", suffix: "mail.icloud.com" },
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
    rule: { kind: "mxSuffix", suffix: "inbound-smtp." },
  },
  {
    name: "Titan Email",
    domain: "titan.email",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "mx1.titan.email" },
  },
  {
    name: "IONOS Mail",
    domain: "ionos.com",
    category: "email",
    rule: { kind: "mxSuffix", suffix: "mx00.ionos.com" },
  },
];

/**
 * A registry of known DNS providers. The detection algorithm will iterate
 * through this list to identify the DNS provider from NS records.
 */
export const DNS_PROVIDERS: Provider[] = [
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
    rule: { kind: "nsSuffix", suffix: "dnsimple.com" },
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
    rule: { kind: "nsSuffix", suffix: "dnsmadeeasy.com" },
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
    rule: {
      any: [
        { kind: "nsSuffix", suffix: "nsone.net" },
        { kind: "nsSuffix", suffix: "ns1.com" },
      ],
    },
  },
  {
    name: "Amazon Route 53",
    domain: "aws.amazon.com",
    category: "dns",
    rule: { kind: "nsSuffix", suffix: "awsdns" },
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
        { kind: "nsSuffix", suffix: "ns-cloud" },
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
    rule: { kind: "nsSuffix", suffix: "hetzner.de" },
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
    name: "IONOS",
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
];

/** Registrar providers registry for WHOIS/RDAP partial name matching */
export const REGISTRAR_PROVIDERS: RegistrarProvider[] = [
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    aliases: ["godaddy inc", "go daddy", "wild west domains"],
  },
  {
    name: "Namecheap",
    domain: "namecheap.com",
    aliases: ["namecheap, inc", "namecheap inc"],
  },
  {
    name: "Squarespace",
    domain: "squarespace.domains",
    aliases: ["squarespace domains llc", "squarespace domains ii llc"],
  },
  // Keep Google LLC for rare legacy WHOIS text, but do not alias to MarkMonitor (separate registrar).
  {
    name: "Google",
    domain: "google.com",
    aliases: ["google llc", "google inc"],
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    aliases: ["cloudflare, inc", "cloudflare inc"],
  },
  { name: "Gandi", domain: "gandi.net", aliases: ["gandi sas", "gandi sas"] },
  {
    name: "Tucows",
    domain: "tucows.com",
    aliases: ["tucows domains inc", "hover"],
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    aliases: ["ovh sas", "ovhgroup"],
  },
  {
    name: "1&1 IONOS",
    domain: "ionos.com",
    aliases: ["1&1", "ionos se", "united internet"],
  },
  {
    name: "Name.com",
    domain: "name.com",
    aliases: ["rightside", "donuts inc", "identity digital"],
  },
  { name: "Dynadot", domain: "dynadot.com", aliases: ["dynadot llc"] },
  { name: "Porkbun", domain: "porkbun.com", aliases: ["porkbun llc"] },
  {
    name: "Alibaba Cloud",
    domain: "alibaba.com",
    aliases: ["alibaba cloud computing ltd", "aliyun"],
  },
  { name: "Enom", domain: "enom.com", aliases: ["enom, llc"] },
  {
    name: "GMO Internet",
    domain: "gmo.jp",
    aliases: ["onamae", "gmo internet group"],
  },
  {
    name: "Network Solutions",
    domain: "networksolutions.com",
    aliases: ["networksolutions inc", "networksolutions llc"],
  },
  {
    name: "Register.com",
    domain: "register.com",
    aliases: ["register, inc", "register inc"],
  },
  {
    name: "Automattic",
    domain: "wordpress.com",
    aliases: ["wordpress.com", "wordpress vip"],
  },
  {
    name: "MarkMonitor",
    domain: "markmonitor.com",
    aliases: ["markmonitor inc", "markmonitor, inc."],
  },
  {
    name: "CSC Corporate Domains",
    domain: "cscdbs.com",
    aliases: ["csc corporate domains", "csc global"],
  },
  {
    name: "Ascio",
    domain: "ascio.com",
    aliases: ["ascio technologies", "ascio technologies, inc."],
  },
  {
    name: "Key-Systems",
    domain: "key-systems.net",
    aliases: ["key-systems gmbh", "rrpproxy"],
  },
  {
    name: "PublicDomainRegistry (PDR)",
    domain: "publicdomainregistry.com",
    aliases: ["pdr ltd", "publicdomainregistry.com"],
  },
  { name: "Wix", domain: "wix.com", aliases: ["wix.com ltd"] },
  { name: "RegistrarSafe", domain: "meta.com", aliases: ["registrarsafe llc"] },
];

/**
 * Certificate Authorities registry. Matches against issuer strings.
 */
export const CA_PROVIDERS: Provider[] = [
  {
    name: "Let's Encrypt",
    domain: "letsencrypt.org",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "let's encrypt" },
        { kind: "issuerIncludes", substr: "lets encrypt" },
        { kind: "issuerIncludes", substr: "isrg" },
        { kind: "issuerIncludes", substr: "r3" },
        { kind: "issuerIncludes", substr: "r4" },
        { kind: "issuerIncludes", substr: "e1" },
        { kind: "issuerIncludes", substr: "e2" },
        { kind: "issuerIncludes", substr: "r10" },
        { kind: "issuerIncludes", substr: "r11" },
        { kind: "issuerIncludes", substr: "r12" },
        { kind: "issuerIncludes", substr: "r13" },
        { kind: "issuerIncludes", substr: "r14" },
        { kind: "issuerIncludes", substr: "e5" },
        { kind: "issuerIncludes", substr: "e6" },
        { kind: "issuerIncludes", substr: "e7" },
        { kind: "issuerIncludes", substr: "e8" },
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
    name: "DigiCert",
    domain: "digicert.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "digicert" },
        { kind: "issuerIncludes", substr: "baltimore cybertrust" },
        { kind: "issuerIncludes", substr: "thawte" },
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
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "amazon trust" },
        { kind: "issuerIncludes", substr: "amazon" },
      ],
    },
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    category: "ca",
    rule: {
      any: [
        { kind: "issuerIncludes", substr: "cloudflare inc ecc ca" },
        { kind: "issuerIncludes", substr: "cloudflare inc rsa ca" },
        { kind: "issuerIncludes", substr: "cloudflare" },
      ],
    },
  },
];
