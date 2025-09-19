import type { ProviderEntry } from "./types";

// Email providers - Keep this list simple and append-only; prefer lowercase in aliases
export const EMAIL_PROVIDERS: ProviderEntry[] = [
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
  {
    name: "Proofpoint",
    domain: "proofpoint.com",
    category: "email",
    aliases: ["proofpoint"],
  },
];
