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
  // {
  //   name: "Amazon WorkMail",
  //   domain: "aws.amazon.com",
  //   category: "email",
  //   rule: { kind: "mxSuffix", suffix: "inbound-smtp." },
  // },
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
    rule: { kind: "nsSuffix", suffix: "googledomains.com" },
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
        { kind: "issuerEquals", value: "r3" },
        { kind: "issuerEquals", value: "r4" },
        { kind: "issuerEquals", value: "e1" },
        { kind: "issuerEquals", value: "e2" },
        { kind: "issuerEquals", value: "r10" },
        { kind: "issuerEquals", value: "r11" },
        { kind: "issuerEquals", value: "r12" },
        { kind: "issuerEquals", value: "r13" },
        { kind: "issuerEquals", value: "r14" },
        { kind: "issuerEquals", value: "e5" },
        { kind: "issuerEquals", value: "e6" },
        { kind: "issuerEquals", value: "e7" },
        { kind: "issuerEquals", value: "e8" },
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
        { kind: "issuerEquals", value: "godaddy" },
        { kind: "issuerEquals", value: "starfield" },
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
    name: "Cloudflare",
    domain: "cloudflare.com",
    category: "ca",
    rule: { kind: "issuerIncludes", substr: "cloudflare" },
  },
];
