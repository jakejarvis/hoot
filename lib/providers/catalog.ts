import type {
  CertificateAuthorityProvider,
  Provider,
  RegistrarProvider,
} from "./types";

/**
 * A registry of known hosting providers. The detection algorithm will iterate
 * through this list to identify the hosting provider from HTTP headers.
 */
export const HOSTING_PROVIDERS: Provider[] = [
  {
    name: "Vercel",
    domain: "vercel.com",
    rules: [
      { type: "header", name: "server", value: "vercel" },
      { type: "header", name: "x-vercel-id", present: true },
    ],
  },
  {
    name: "WP Engine",
    domain: "wpengine.com",
    rules: [{ type: "header", name: "x-powered-by", value: "wp engine" }],
  },
  {
    name: "WordPress.com",
    domain: "wordpress.com",
    rules: [{ type: "header", name: "host-header", value: "wordpress.com" }],
  },
  {
    name: "Amazon S3",
    domain: "aws.amazon.com",
    rules: [{ type: "header", name: "server", value: "AmazonS3" }],
  },
  {
    name: "Netlify",
    domain: "netlify.com",
    rules: [{ type: "header", name: "server", value: "Netlify" }],
  },
  {
    name: "GitHub Pages",
    domain: "github.com",
    rules: [{ type: "header", name: "server", value: "GitHub.com" }],
  },
  {
    name: "GitLab Pages",
    domain: "gitlab.com",
    rules: [{ type: "header", name: "server", value: "GitLab Pages" }],
  },
  {
    name: "Fly.io",
    domain: "fly.io",
    rules: [{ type: "header", name: "server", value: "Fly/" }],
  },
  {
    name: "Akamai",
    domain: "akamai.com",
    rules: [{ type: "header", name: "server", value: "AkamaiGHost" }],
  },
  {
    name: "Amazon CloudFront",
    domain: "aws.amazon.com",
    rules: [
      { type: "header", name: "server", value: "CloudFront" },
      { type: "header", name: "x-amz-cf-id", present: true },
    ],
  },
  {
    name: "Heroku",
    domain: "heroku.com",
    rules: [{ type: "header", name: "server", value: "vegur" }],
  },
  {
    name: "Render",
    domain: "render.com",
    rules: [{ type: "header", name: "server", value: "Render" }],
  },
  {
    name: "Squarespace",
    domain: "squarespace.com",
    rules: [{ type: "header", name: "x-contextid", present: true }],
  },
  {
    name: "Shopify",
    domain: "shopify.com",
    rules: [{ type: "header", name: "x-shopify-stage", present: true }],
  },
  {
    name: "Webflow",
    domain: "webflow.com",
    rules: [{ type: "header", name: "x-wf-page-id", present: true }],
  },
  {
    name: "Wix",
    domain: "wix.com",
    rules: [{ type: "header", name: "x-wix-request-id", present: true }],
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    rules: [
      { type: "header", name: "server", value: "cloudflare" },
      { type: "header", name: "cf-ray", present: true },
    ],
  },
  {
    name: "Azure Front Door",
    domain: "azure.microsoft.com",
    rules: [{ type: "header", name: "x-azure-ref", present: true }],
  },
  {
    name: "Google Cloud Storage",
    domain: "cloud.google.com",
    rules: [{ type: "header", name: "x-goog-generation", present: true }],
  },
  {
    name: "Azure Static Web Apps",
    domain: "azure.microsoft.com",
    rules: [{ type: "header", name: "x-azure-ref", present: true }],
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    rules: [{ type: "header", name: "x-ovh-request-id", present: true }],
  },
  {
    name: "Pantheon",
    domain: "pantheon.io",
    rules: [{ type: "header", name: "x-pantheon-site", present: true }],
  },
  {
    name: "Sucuri",
    domain: "sucuri.net",
    rules: [{ type: "header", name: "x-sucuri-id", present: true }],
  },
  {
    name: "Imperva",
    domain: "imperva.com",
    rules: [{ type: "header", name: "x-iinfo", present: true }],
  },
  {
    name: "Kinsta",
    domain: "kinsta.com",
    rules: [{ type: "header", name: "x-kinsta-cache", present: true }],
  },
  {
    name: "WordPress VIP",
    domain: "wpvip.com",
    rules: [{ type: "header", name: "x-powered-by", value: "WordPress VIP" }],
  },
];

/**
 * A registry of known email providers. The detection algorithm will iterate
 * through this list to identify the email provider from MX records.
 */
export const EMAIL_PROVIDERS: Provider[] = [
  // Google now supports a single MX as well as the legacy multi-MX set.
  {
    name: "Google Workspace",
    domain: "google.com",
    rules: [{ type: "dns", recordType: "MX", value: "smtp.google.com" }],
  },
  {
    name: "Google Workspace",
    domain: "google.com",
    rules: [{ type: "dns", recordType: "MX", value: "aspmx.l.google.com" }],
  },
  {
    name: "Microsoft 365",
    domain: "office.com",
    rules: [
      { type: "dns", recordType: "MX", value: "mail.protection.outlook.com" },
    ],
  },
  {
    name: "Zoho",
    domain: "zoho.com",
    rules: [{ type: "dns", recordType: "MX", value: "mx.zoho.com" }],
  },
  {
    name: "Proton",
    domain: "proton.me",
    rules: [{ type: "dns", recordType: "MX", value: "protonmail.ch" }],
  },
  {
    name: "Fastmail",
    domain: "fastmail.com",
    rules: [{ type: "dns", recordType: "MX", value: "messagingengine.com" }],
  },
  {
    name: "Cloudflare Email Routing",
    domain: "cloudflare.com",
    rules: [{ type: "dns", recordType: "MX", value: "mx.cloudflare.net" }],
  },
  {
    name: "Yahoo Mail",
    domain: "yahoo.com",
    rules: [{ type: "dns", recordType: "MX", value: "yahoodns.net" }],
  },
  {
    name: "Yandex 360",
    domain: "yandex.com",
    rules: [{ type: "dns", recordType: "MX", value: "mx.yandex.net" }],
  },
  {
    name: "ImprovMX",
    domain: "improvmx.com",
    rules: [{ type: "dns", recordType: "MX", value: "improvmx.com" }],
  },
  {
    name: "Forward Email",
    domain: "forwardemail.net",
    rules: [{ type: "dns", recordType: "MX", value: "forwardemail.net" }],
  },
  {
    name: "Migadu",
    domain: "migadu.com",
    rules: [{ type: "dns", recordType: "MX", value: "migadu.com" }],
  },
  {
    name: "iCloud Mail",
    domain: "icloud.com",
    rules: [{ type: "dns", recordType: "MX", value: "mail.icloud.com" }],
  },
  {
    name: "Mailgun",
    domain: "mailgun.com",
    rules: [{ type: "dns", recordType: "MX", value: "mailgun.org" }],
  },
  {
    name: "SendGrid",
    domain: "sendgrid.com",
    rules: [{ type: "dns", recordType: "MX", value: "sendgrid.net" }],
  },
  {
    name: "Mailjet",
    domain: "mailjet.com",
    rules: [{ type: "dns", recordType: "MX", value: "mailjet.com" }],
  },
  {
    name: "Postmark",
    domain: "postmarkapp.com",
    rules: [{ type: "dns", recordType: "MX", value: "postmarkapp.com" }],
  },
  {
    name: "Rackspace Email",
    domain: "rackspace.com",
    rules: [{ type: "dns", recordType: "MX", value: "emailsrvr.com" }],
  },
  {
    name: "Proofpoint",
    domain: "proofpoint.com",
    rules: [{ type: "dns", recordType: "MX", value: "pphosted.com" }],
  },
  {
    name: "Amazon WorkMail",
    domain: "aws.amazon.com",
    rules: [{ type: "dns", recordType: "MX", value: "inbound-smtp." }],
  },
  {
    name: "Titan Email",
    domain: "titan.email",
    rules: [{ type: "dns", recordType: "MX", value: "mx1.titan.email" }],
  },
  {
    name: "IONOS Mail",
    domain: "ionos.com",
    rules: [{ type: "dns", recordType: "MX", value: "mx00.ionos.com" }],
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
    rules: [{ type: "dns", recordType: "NS", value: "cloudflare.com" }],
  },
  {
    name: "Vercel",
    domain: "vercel.com",
    rules: [{ type: "dns", recordType: "NS", value: "vercel-dns.com" }],
  },
  {
    name: "DNSimple",
    domain: "dnsimple.com",
    rules: [{ type: "dns", recordType: "NS", value: "dnsimple.com" }],
  },
  {
    name: "WordPress.com",
    domain: "wordpress.com",
    rules: [{ type: "dns", recordType: "NS", value: "wordpress.com" }],
  },
  {
    name: "DNS Made Easy",
    domain: "dnsmadeeasy.com",
    rules: [{ type: "dns", recordType: "NS", value: "dnsmadeeasy.com" }],
  },
  {
    name: "DigitalOcean",
    domain: "digitalocean.com",
    rules: [{ type: "dns", recordType: "NS", value: "digitalocean.com" }],
  },
  {
    name: "NS1",
    domain: "ns1.com",
    rules: [
      { type: "dns", recordType: "NS", value: "nsone.net" },
      { type: "dns", recordType: "NS", value: "ns1.com" },
    ],
  },
  {
    name: "Amazon Route 53",
    domain: "aws.amazon.com",
    rules: [{ type: "dns", recordType: "NS", value: "awsdns" }],
  },
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    rules: [{ type: "dns", recordType: "NS", value: "domaincontrol.com" }],
  },
  {
    name: "Google Cloud DNS",
    domain: "cloud.google.com",
    rules: [
      { type: "dns", recordType: "NS", value: "googledomains.com" },
      { type: "dns", recordType: "NS", value: "ns-cloud" },
    ],
  },
  {
    name: "Hurricane Electric",
    domain: "he.net",
    rules: [{ type: "dns", recordType: "NS", value: "he.net" }],
  },
  {
    name: "Linode",
    domain: "linode.com",
    rules: [{ type: "dns", recordType: "NS", value: "linode.com" }],
  },
  {
    name: "Hetzner",
    domain: "hetzner.com",
    rules: [{ type: "dns", recordType: "NS", value: "hetzner.de" }],
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    rules: [
      { type: "dns", recordType: "NS", value: "ovh.net" },
      { type: "dns", recordType: "NS", value: "ovh.co.uk" },
    ],
  },
  {
    name: "IONOS",
    domain: "ionos.com",
    rules: [
      { type: "dns", recordType: "NS", value: "ionos.com" },
      { type: "dns", recordType: "NS", value: "1and1.com" },
    ],
  },
  {
    name: "NameSilo",
    domain: "namesilo.com",
    rules: [{ type: "dns", recordType: "NS", value: "namesilo.com" }],
  },
  {
    name: "DreamHost",
    domain: "dreamhost.com",
    rules: [{ type: "dns", recordType: "NS", value: "dreamhost.com" }],
  },
  {
    name: "Squarespace",
    domain: "squarespace.com",
    rules: [{ type: "dns", recordType: "NS", value: "squarespacedns.com" }],
  },
  {
    name: "Wix",
    domain: "wix.com",
    rules: [{ type: "dns", recordType: "NS", value: "wixdns.net" }],
  },
  {
    name: "Microsoft Azure",
    domain: "azure.microsoft.com",
    rules: [
      { type: "dns", recordType: "NS", value: "azure-dns.com" },
      { type: "dns", recordType: "NS", value: "azure-dns.net" },
      { type: "dns", recordType: "NS", value: "azure-dns.org" },
      { type: "dns", recordType: "NS", value: "azure-dns.info" },
    ],
  },
  {
    name: "Namecheap FreeDNS",
    domain: "namecheap.com",
    rules: [{ type: "dns", recordType: "NS", value: "registrar-servers.com" }],
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
export const CA_PROVIDERS: CertificateAuthorityProvider[] = [
  {
    name: "Let's Encrypt",
    domain: "letsencrypt.org",
    aliases: [
      "let's encrypt",
      "lets encrypt",
      "isrg",
      // legacy intermediates
      "r3",
      "r4",
      "e1",
      "e2",
      // 2024+ intermediates per LE announcement
      "r10",
      "r11",
      "r12",
      "r13",
      "r14",
      "e5",
      "e6",
      "e7",
      "e8",
    ],
  },
  { name: "ZeroSSL", domain: "zerossl.com", aliases: ["zerossl"] },
  {
    name: "DigiCert",
    domain: "digicert.com",
    aliases: ["digicert", "baltimore cybertrust", "thawte"],
  },
  {
    name: "Google Trust Services",
    domain: "pki.goog",
    aliases: ["google trust services", "gts"],
  },
  { name: "GoDaddy", domain: "godaddy.com", aliases: ["godaddy", "starfield"] },
  {
    name: "Sectigo (Comodo)",
    domain: "sectigo.com",
    aliases: ["sectigo", "comodo", "usertrust", "aaa"],
  },
  { name: "GlobalSign", domain: "globalsign.com", aliases: ["globalsign"] },
  { name: "GeoTrust", domain: "geotrust.com", aliases: ["geotrust"] },
  { name: "Entrust", domain: "entrust.com", aliases: ["entrust"] },
  {
    name: "Amazon Trust Services",
    domain: "amazontrust.com",
    aliases: ["amazon trust", "amazon"],
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    aliases: ["cloudflare inc ecc ca", "cloudflare inc rsa ca", "cloudflare"],
  },
];
