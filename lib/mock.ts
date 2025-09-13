import { addDays, formatISO, subDays } from "date-fns"

export type WhoisData = {
  registrar: string
  creationDate: string
  expirationDate: string
  registrant: {
    organization: string
    country: string
    state?: string
  }
}

export type DnsRecord = {
  type: "A" | "AAAA" | "MX" | "CNAME" | "TXT" | "NS"
  name: string
  value: string
  ttl: number
  priority?: number
}

export type HostingInfo = {
  hostingProvider: string
  emailProvider: string
  ipAddress: string
  geo: {
    city: string
    region: string
    country: string
  }
}

export type Certificate = {
  issuer: string
  subject: string
  validFrom: string
  validTo: string
  signatureAlgorithm: string
  keyType: string
  chain: string[]
}

export type HttpHeader = {
  name: string
  value: string
}

export type DomainReport = {
  domain: string
  whois: WhoisData
  dns: DnsRecord[]
  hosting: HostingInfo
  certificates: Certificate[]
  headers: HttpHeader[]
}

const registrars = ["Namecheap", "GoDaddy", "Google Domains", "Cloudflare Registrar"]
const hostingProviders = ["Vercel", "Netlify", "Cloudflare", "AWS", "DigitalOcean"]
const emailProviders = ["Google Workspace", "Microsoft 365", "Fastmail", "Zoho", "Proton"]

export function generateMockReport(domain: string): DomainReport {
  const now = new Date()
  const created = subDays(now, 365 * 2)
  const expires = addDays(now, 365)

  const whois: WhoisData = {
    registrar: pick(registrars),
    creationDate: formatISO(created),
    expirationDate: formatISO(expires),
    registrant: {
      organization: `${capitalize(domain.split(".")[0])} LLC`,
      country: "US",
      state: "CA",
    },
  }

  const baseName = domain.endsWith(".") ? domain : `${domain}.`
  const dns: DnsRecord[] = [
    { type: "A", name: domain, value: "76.76.21.21", ttl: 300 },
    { type: "AAAA", name: domain, value: "2a06:98c1:3121::", ttl: 300 },
    { type: "MX", name: domain, value: "aspmx.l.google.com.", ttl: 3600, priority: 10 },
    { type: "CNAME", name: `www.${domain}`, value: `${domain}.`, ttl: 300 },
    { type: "TXT", name: domain, value: "v=spf1 include:_spf.google.com ~all", ttl: 3600 },
    { type: "NS", name: baseName, value: "ns1.cloudflare.com.", ttl: 86400 },
    { type: "NS", name: baseName, value: "ns2.cloudflare.com.", ttl: 86400 },
  ]

  const hosting: HostingInfo = {
    hostingProvider: pick(hostingProviders),
    emailProvider: pick(emailProviders),
    ipAddress: "76.76.21.21",
    geo: {
      city: "San Francisco",
      region: "California",
      country: "United States",
    },
  }

  const validFrom = subDays(now, 60)
  const validTo = addDays(now, 300)
  const certificates: Certificate[] = [
    {
      issuer: "Let's Encrypt R3",
      subject: `CN=${domain}`,
      validFrom: formatISO(validFrom),
      validTo: formatISO(validTo),
      signatureAlgorithm: "SHA256-RSA",
      keyType: "ECDSA P-256",
      chain: ["ISRG Root X1", "Let's Encrypt R3", domain],
    },
  ]

  const headers: HttpHeader[] = [
    { name: "server", value: "Vercel" },
    { name: "cache-control", value: "public, max-age=0, must-revalidate" },
    { name: "content-security-policy", value: "upgrade-insecure-requests; default-src 'self'" },
    { name: "x-frame-options", value: "SAMEORIGIN" },
    { name: "strict-transport-security", value: "max-age=63072000; includeSubDomains; preload" },
  ]

  return { domain, whois, dns, hosting, certificates, headers }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}


