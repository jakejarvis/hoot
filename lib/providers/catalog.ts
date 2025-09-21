import type { Provider } from "./types";

/**
 * A registry of known hosting providers. The detection algorithm will iterate
 * through this list to identify the hosting provider from HTTP headers.
 */
export const HOSTING_PROVIDERS: Provider[] = [
  {
    name: "Vercel",
    domain: "vercel.com",
    aliases: ["vercel"],
    rules: [
      { type: "header", name: "server", value: "vercel" },
      { type: "header", name: "x-vercel-id", present: true },
    ],
  },
  {
    name: "WP Engine",
    domain: "wpengine.com",
    aliases: ["wp engine"],
    rules: [{ type: "header", name: "x-powered-by", value: "wp engine" }],
  },
  {
    name: "WordPress.com",
    domain: "wordpress.com",
    aliases: ["wordpress"],
    rules: [
      { type: "header", name: "host-header", value: "wordpress.com" },
      { type: "dns", recordType: "NS", value: "wordpress.com" },
    ],
  },
  {
    name: "Amazon S3",
    domain: "aws.amazon.com",
    aliases: ["aws", "amazon", "amazon web services", "s3"],
    rules: [{ type: "header", name: "server", value: "AmazonS3" }],
  },
  {
    name: "Netlify",
    domain: "netlify.com",
    aliases: ["netlify"],
    rules: [{ type: "header", name: "server", value: "Netlify" }],
  },
  {
    name: "GitHub Pages",
    domain: "github.com",
    aliases: ["github"],
    rules: [{ type: "header", name: "server", value: "GitHub.com" }],
  },
  {
    name: "GitLab Pages",
    domain: "gitlab.com",
    aliases: ["gitlab"],
    rules: [{ type: "header", name: "server", value: "GitLab Pages" }],
  },
  {
    name: "Fly.io",
    domain: "fly.io",
    aliases: ["flyio", "fly"],
    rules: [{ type: "header", name: "server", value: "Fly/" }],
  },
  {
    name: "Akamai",
    domain: "akamai.com",
    aliases: ["akamai"],
    rules: [{ type: "header", name: "server", value: "AkamaiGHost" }],
  },
  {
    name: "Heroku",
    domain: "heroku.com",
    aliases: ["heroku"],
    rules: [{ type: "header", name: "server", value: "vegur" }],
  },
  {
    name: "Render",
    domain: "render.com",
    aliases: ["render"],
    rules: [{ type: "header", name: "server", value: "Render" }],
  },
  {
    name: "Squarespace",
    domain: "squarespace.com",
    aliases: ["squarespace"],
    rules: [{ type: "header", name: "x-contextid", present: true }],
  },
  {
    name: "Shopify",
    domain: "shopify.com",
    aliases: ["shopify"],
    rules: [{ type: "header", name: "x-shopify-stage", present: true }],
  },
  {
    name: "Webflow",
    domain: "webflow.com",
    aliases: ["webflow"],
    rules: [{ type: "header", name: "x-wf-page-id", present: true }],
  },
  {
    name: "Wix",
    domain: "wix.com",
    aliases: ["wix"],
    rules: [{ type: "header", name: "x-wix-request-id", present: true }],
  },
  {
    name: "Cloudflare",
    domain: "cloudflare.com",
    aliases: ["cloudflare", "cloudflare registrar"],
    rules: [
      { type: "header", name: "server", value: "cloudflare" },
      { type: "header", name: "cf-ray", present: true },
    ],
  },
  {
    name: "Google Cloud Storage",
    domain: "cloud.google.com",
    aliases: ["gcs", "storage.googleapis.com"],
    rules: [{ type: "header", name: "x-goog-generation", present: true }],
  },
  {
    name: "Azure Static Web Apps",
    domain: "azure.microsoft.com",
    aliases: ["azure static", "azure"],
    rules: [{ type: "header", name: "x-azure-ref", present: true }],
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    aliases: ["ovh", "ovhcloud"],
    rules: [{ type: "header", name: "x-ovh-request-id", present: true }],
  },
  {
    name: "Pantheon",
    domain: "pantheon.io",
    aliases: ["pantheon"],
    rules: [{ type: "header", name: "x-pantheon-site", present: true }],
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
    aliases: ["gmail"],
    rules: [
      { type: "dns", recordType: "MX", value: "google.com" },
      { type: "dns", recordType: "MX", value: "googlemail.com" },
    ],
  },
  {
    name: "Microsoft 365",
    domain: "office.com",
    aliases: ["office"],
    rules: [{ type: "dns", recordType: "MX", value: "protection.outlook.com" }],
  },
  {
    name: "Zoho",
    domain: "zoho.com",
    aliases: ["zoho"],
    rules: [
      { type: "dns", recordType: "MX", value: "zoho.com" },
      { type: "dns", recordType: "MX", value: "zohomail.com" },
    ],
  },
  {
    name: "Proton",
    domain: "proton.me",
    aliases: ["proton"],
    rules: [{ type: "dns", recordType: "MX", value: "protonmail.ch" }],
  },
  {
    name: "Fastmail",
    domain: "fastmail.com",
    aliases: ["messagingengine"],
    rules: [{ type: "dns", recordType: "MX", value: "messagingengine.com" }],
  },
  {
    name: "Cloudflare Email Routing",
    domain: "cloudflare.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "mx.cloudflare.net" }],
  },
  {
    name: "Yahoo Mail",
    domain: "yahoo.com",
    aliases: ["yahoodns", "mail.yahoo.com"],
    rules: [{ type: "dns", recordType: "MX", value: "yahoodns.net" }],
  },
  {
    name: "Yandex 360",
    domain: "yandex.com",
    aliases: ["yandex"],
    rules: [{ type: "dns", recordType: "MX", value: "yandex.net" }],
  },
  {
    name: "ImprovMX",
    domain: "improvmx.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "improvmx.com" }],
  },
  {
    name: "Forward Email",
    domain: "forwardemail.net",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "forwardemail.net" }],
  },
  {
    name: "Migadu",
    domain: "migadu.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "migadu.com" }],
  },
  {
    name: "iCloud Mail",
    domain: "icloud.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "icloud.com" }],
  },
  {
    name: "Mailgun",
    domain: "mailgun.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "mailgun.org" }],
  },
  {
    name: "SendGrid",
    domain: "sendgrid.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "sendgrid.net" }],
  },
  {
    name: "Mailjet",
    domain: "mailjet.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "mailjet.com" }],
  },
  {
    name: "Postmark",
    domain: "postmarkapp.com",
    aliases: ["postmarkapp"],
    rules: [{ type: "dns", recordType: "MX", value: "postmarkapp.com" }],
  },
  {
    name: "Rackspace Email",
    domain: "rackspace.com",
    aliases: ["emailsrvr"],
    rules: [{ type: "dns", recordType: "MX", value: "emailsrvr.com" }],
  },
  {
    name: "Proofpoint",
    domain: "proofpoint.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "pphosted.com" }],
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
    aliases: ["cloudflare registrar"],
    rules: [{ type: "dns", recordType: "NS", value: "cloudflare.com" }],
  },
  {
    name: "DNSimple",
    domain: "dnsimple.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "dnsimple.com" }],
  },
  {
    name: "DNS Made Easy",
    domain: "dnsmadeeasy.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "dnsmadeeasy.com" }],
  },
  {
    name: "DigitalOcean",
    domain: "digitalocean.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "digitalocean.com" }],
  },
  {
    name: "NS1",
    domain: "ns1.com",
    aliases: ["nsone"],
    rules: [
      { type: "dns", recordType: "NS", value: "nsone.net" },
      { type: "dns", recordType: "NS", value: "ns1.com" },
    ],
  },
  {
    name: "Amazon Route 53",
    domain: "aws.amazon.com",
    aliases: ["route 53", "route53", "awsdns"],
    rules: [{ type: "dns", recordType: "NS", value: "awsdns" }],
  },
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "domaincontrol.com" }],
  },
  {
    name: "Google Cloud DNS",
    domain: "cloud.google.com",
    aliases: ["googledomains"],
    rules: [
      { type: "dns", recordType: "NS", value: "googledomains.com" },
      { type: "dns", recordType: "NS", value: "ns-cloud" },
    ],
  },
  {
    name: "Hurricane Electric",
    domain: "he.net",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "he.net" }],
  },
  {
    name: "Linode",
    domain: "linode.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "linode.com" }],
  },
  {
    name: "Hetzner",
    domain: "hetzner.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "hetzner.de" }],
  },
  {
    name: "OVHcloud",
    domain: "ovhcloud.com",
    aliases: ["ovh"],
    rules: [
      { type: "dns", recordType: "NS", value: "ovh.net" },
      { type: "dns", recordType: "NS", value: "ovh.co.uk" },
    ],
  },
  {
    name: "IONOS",
    domain: "ionos.com",
    aliases: ["1and1"],
    rules: [
      { type: "dns", recordType: "NS", value: "ionos.com" },
      { type: "dns", recordType: "NS", value: "1and1.com" },
    ],
  },
  {
    name: "NameSilo",
    domain: "namesilo.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "namesilo.com" }],
  },
  {
    name: "DreamHost",
    domain: "dreamhost.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "dreamhost.com" }],
  },
];
