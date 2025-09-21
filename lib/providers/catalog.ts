/**
 * @fileoverview This file contains the central registry of all known providers,
 * separated by their service category (hosting, DNS, email) to ensure
 * accurate and efficient detection.
 */

import type { Provider } from "./types";

/**
 * A registry of known hosting providers. The detection algorithm will iterate
 * through this list to identify the hosting provider from HTTP headers.
 */
export const HOSTING_PROVIDERS: Provider[] = [
  {
    name: "Vercel",
    iconDomain: "vercel.com",
    aliases: ["vercel"],
    rules: [
      { type: "header", name: "server", value: "vercel" },
      { type: "header", name: "x-vercel-id", present: true },
    ],
  },
  {
    name: "WP Engine",
    iconDomain: "wpengine.com",
    aliases: ["wp engine"],
    rules: [{ type: "header", name: "x-powered-by", value: "wp engine" }],
  },
  {
    name: "WordPress.com",
    iconDomain: "wordpress.com",
    aliases: ["wordpress"],
    rules: [
      { type: "header", name: "host-header", value: "wordpress.com" },
      { type: "dns", recordType: "NS", value: "wordpress.com" },
    ],
  },
  {
    name: "Amazon S3",
    iconDomain: "aws.amazon.com",
    aliases: ["aws", "amazon", "amazon web services", "s3"],
    rules: [{ type: "header", name: "server", value: "AmazonS3" }],
  },
  {
    name: "Netlify",
    iconDomain: "netlify.com",
    aliases: ["netlify"],
    rules: [{ type: "header", name: "server", value: "Netlify" }],
  },
  {
    name: "GitHub Pages",
    iconDomain: "github.com",
    aliases: ["github"],
    rules: [{ type: "header", name: "server", value: "GitHub.com" }],
  },
  {
    name: "GitLab Pages",
    iconDomain: "gitlab.com",
    aliases: ["gitlab"],
    rules: [{ type: "header", name: "server", value: "GitLab Pages" }],
  },
  {
    name: "Fly.io",
    iconDomain: "fly.io",
    aliases: ["flyio", "fly"],
    rules: [{ type: "header", name: "server", value: "Fly/" }],
  },
  {
    name: "Akamai",
    iconDomain: "akamai.com",
    aliases: ["akamai"],
    rules: [{ type: "header", name: "server", value: "AkamaiGHost" }],
  },
  {
    name: "Heroku",
    iconDomain: "heroku.com",
    aliases: ["heroku"],
    rules: [{ type: "header", name: "server", value: "vegur" }],
  },
  {
    name: "Render",
    iconDomain: "render.com",
    aliases: ["render"],
    rules: [{ type: "header", name: "server", value: "Render" }],
  },
  {
    name: "Squarespace",
    iconDomain: "squarespace.com",
    aliases: ["squarespace"],
    rules: [{ type: "header", name: "x-contextid", present: true }],
  },
  {
    name: "Shopify",
    iconDomain: "shopify.com",
    aliases: ["shopify"],
    rules: [{ type: "header", name: "x-shopify-stage", present: true }],
  },
  {
    name: "Webflow",
    iconDomain: "webflow.com",
    aliases: ["webflow"],
    rules: [{ type: "header", name: "x-wf-page-id", present: true }],
  },
  {
    name: "Wix",
    iconDomain: "wix.com",
    aliases: ["wix"],
    rules: [{ type: "header", name: "x-wix-request-id", present: true }],
  },
  {
    name: "Cloudflare",
    iconDomain: "cloudflare.com",
    aliases: ["cloudflare", "cloudflare registrar"],
    rules: [
      { type: "header", name: "server", value: "cloudflare" },
      { type: "header", name: "cf-ray", present: true },
    ],
  },
  {
    name: "Google Cloud Storage",
    iconDomain: "cloud.google.com",
    aliases: ["gcs", "storage.googleapis.com"],
    rules: [{ type: "header", name: "x-goog-generation", present: true }],
  },
  {
    name: "Azure Static Web Apps",
    iconDomain: "azure.microsoft.com",
    aliases: ["azure static", "azure"],
    rules: [{ type: "header", name: "x-azure-ref", present: true }],
  },
  {
    name: "OVHcloud",
    iconDomain: "ovhcloud.com",
    aliases: ["ovh", "ovhcloud"],
    rules: [{ type: "header", name: "x-ovh-request-id", present: true }],
  },
  {
    name: "Pantheon",
    iconDomain: "pantheon.io",
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
    iconDomain: "google.com",
    aliases: ["gmail"],
    rules: [
      { type: "dns", recordType: "MX", value: "google.com" },
      { type: "dns", recordType: "MX", value: "googlemail.com" },
    ],
  },
  {
    name: "Microsoft 365",
    iconDomain: "office.com",
    aliases: ["office"],
    rules: [{ type: "dns", recordType: "MX", value: "protection.outlook.com" }],
  },
  {
    name: "Zoho",
    iconDomain: "zoho.com",
    aliases: ["zoho"],
    rules: [
      { type: "dns", recordType: "MX", value: "zoho.com" },
      { type: "dns", recordType: "MX", value: "zohomail.com" },
    ],
  },
  {
    name: "Proton",
    iconDomain: "proton.me",
    aliases: ["proton"],
    rules: [{ type: "dns", recordType: "MX", value: "protonmail.ch" }],
  },
  {
    name: "Fastmail",
    iconDomain: "fastmail.com",
    aliases: ["messagingengine"],
    rules: [{ type: "dns", recordType: "MX", value: "messagingengine.com" }],
  },
  {
    name: "Cloudflare Email Routing",
    iconDomain: "cloudflare.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "mx.cloudflare.net" }],
  },
  {
    name: "Yahoo Mail",
    iconDomain: "yahoo.com",
    aliases: ["yahoodns", "mail.yahoo.com"],
    rules: [{ type: "dns", recordType: "MX", value: "yahoodns.net" }],
  },
  {
    name: "Yandex 360",
    iconDomain: "yandex.com",
    aliases: ["yandex"],
    rules: [{ type: "dns", recordType: "MX", value: "yandex.net" }],
  },
  {
    name: "ImprovMX",
    iconDomain: "improvmx.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "improvmx.com" }],
  },
  {
    name: "Forward Email",
    iconDomain: "forwardemail.net",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "forwardemail.net" }],
  },
  {
    name: "Migadu",
    iconDomain: "migadu.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "migadu.com" }],
  },
  {
    name: "iCloud Mail",
    iconDomain: "icloud.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "icloud.com" }],
  },
  {
    name: "Mailgun",
    iconDomain: "mailgun.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "mailgun.org" }],
  },
  {
    name: "SendGrid",
    iconDomain: "sendgrid.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "sendgrid.net" }],
  },
  {
    name: "Mailjet",
    iconDomain: "mailjet.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "MX", value: "mailjet.com" }],
  },
  {
    name: "Postmark",
    iconDomain: "postmarkapp.com",
    aliases: ["postmarkapp"],
    rules: [{ type: "dns", recordType: "MX", value: "postmarkapp.com" }],
  },
  {
    name: "Rackspace Email",
    iconDomain: "rackspace.com",
    aliases: ["emailsrvr"],
    rules: [{ type: "dns", recordType: "MX", value: "emailsrvr.com" }],
  },
  {
    name: "Proofpoint",
    iconDomain: "proofpoint.com",
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
    iconDomain: "cloudflare.com",
    aliases: ["cloudflare registrar"],
    rules: [{ type: "dns", recordType: "NS", value: "cloudflare.com" }],
  },
  {
    name: "DNSimple",
    iconDomain: "dnsimple.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "dnsimple.com" }],
  },
  {
    name: "DNS Made Easy",
    iconDomain: "dnsmadeeasy.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "dnsmadeeasy.com" }],
  },
  {
    name: "DigitalOcean",
    iconDomain: "digitalocean.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "digitalocean.com" }],
  },
  {
    name: "NS1",
    iconDomain: "ns1.com",
    aliases: ["nsone"],
    rules: [
      { type: "dns", recordType: "NS", value: "nsone.net" },
      { type: "dns", recordType: "NS", value: "ns1.com" },
    ],
  },
  {
    name: "Amazon Route 53",
    iconDomain: "aws.amazon.com",
    aliases: ["route 53", "route53", "awsdns"],
    rules: [{ type: "dns", recordType: "NS", value: "awsdns" }],
  },
  {
    name: "GoDaddy",
    iconDomain: "godaddy.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "domaincontrol.com" }],
  },
  {
    name: "Google Cloud DNS",
    iconDomain: "cloud.google.com",
    aliases: ["googledomains"],
    rules: [
      { type: "dns", recordType: "NS", value: "googledomains.com" },
      { type: "dns", recordType: "NS", value: "ns-cloud" },
    ],
  },
  {
    name: "Hurricane Electric",
    iconDomain: "he.net",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "he.net" }],
  },
  {
    name: "Linode",
    iconDomain: "linode.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "linode.com" }],
  },
  {
    name: "Hetzner",
    iconDomain: "hetzner.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "hetzner.de" }],
  },
  {
    name: "OVHcloud",
    iconDomain: "ovhcloud.com",
    aliases: ["ovh"],
    rules: [
      { type: "dns", recordType: "NS", value: "ovh.net" },
      { type: "dns", recordType: "NS", value: "ovh.co.uk" },
    ],
  },
  {
    name: "IONOS",
    iconDomain: "ionos.com",
    aliases: ["1and1"],
    rules: [
      { type: "dns", recordType: "NS", value: "ionos.com" },
      { type: "dns", recordType: "NS", value: "1and1.com" },
    ],
  },
  {
    name: "NameSilo",
    iconDomain: "namesilo.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "namesilo.com" }],
  },
  {
    name: "DreamHost",
    iconDomain: "dreamhost.com",
    aliases: [],
    rules: [{ type: "dns", recordType: "NS", value: "dreamhost.com" }],
  },
];
