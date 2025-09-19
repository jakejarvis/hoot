import type { DnsRule, EmailRule, HostingRule } from "./types";

export const HOSTING_RULES: HostingRule[] = [
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

export const EMAIL_RULES: EmailRule[] = [
  {
    provider: "Google Workspace",
    mxIncludes: ["google.com", "googlemail.com"],
  },
  {
    provider: "Microsoft 365",
    mxIncludes: ["protection.outlook.com"],
  },
  { provider: "Zoho", mxIncludes: ["zoho"] },
  { provider: "Proton", mxIncludes: ["protonmail"] },
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
  { provider: "Rackspace Email", mxIncludes: ["emailsrvr.com"] },
  { provider: "Proofpoint", mxIncludes: ["pphosted.com"] },
];

export const DNS_RULES: DnsRule[] = [
  { provider: "Cloudflare", nsIncludes: ["cloudflare"] },
  { provider: "DNSimple", nsIncludes: ["dnsimple"] },
  { provider: "DNS Made Easy", nsIncludes: ["dnsmadeeasy"] },
  { provider: "DigitalOcean", nsIncludes: ["digitalocean"] },
  { provider: "NS1", nsIncludes: ["nsone.net", "ns1.com"] },
  {
    provider: "Amazon Route 53",
    nsIncludes: ["awsdns"],
  },
  { provider: "GoDaddy", nsIncludes: ["domaincontrol.com"] },
  {
    provider: "Google Cloud DNS",
    nsIncludes: ["googledomains.com", "ns-cloud"],
  },
  {
    provider: "Hurricane Electric",
    nsIncludes: ["he.net"],
  },
  {
    provider: "Linode",
    nsIncludes: ["linode"],
  },
  {
    provider: "Hetzner",
    nsIncludes: ["hetzner"],
  },
  {
    provider: "OVHcloud",
    nsIncludes: ["ovh", "ovhcloud"],
  },
  {
    provider: "IONOS",
    nsIncludes: ["ionos", "1and1"],
  },
  {
    provider: "NameSilo",
    nsIncludes: ["namesilo"],
  },
  {
    provider: "DreamHost",
    nsIncludes: ["dreamhost"],
  },
  {
    provider: "WordPress.com",
    nsIncludes: ["wordpress.com"],
  },
];
