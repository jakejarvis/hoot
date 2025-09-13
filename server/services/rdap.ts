import { TTLCache } from "./cache"

export type Whois = {
  registrar: string
  creationDate: string
  expirationDate: string
  registrant: { organization: string; country: string; state?: string }
  status?: string[]
}

const cache = new TTLCache<string, Whois>(24 * 60 * 60 * 1000, (k) => k)

export async function fetchWhois(domain: string): Promise<Whois> {
  const key = domain.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const rdapBase = await rdapBaseForDomain(domain)
  const url = `${rdapBase}/domain/${encodeURIComponent(domain)}`
  const res = await fetch(url, { headers: { accept: "application/rdap+json" } })
  if (!res.ok) throw new Error(`RDAP failed ${res.status}`)
  const json = (await res.json()) as any

  const out: Whois = {
    registrar: json?.registrar?.name || json?.entities?.find((e: any) => (e.roles || []).includes("registrar"))?.vcardArray?.[1]?.find((v: any[]) => v[0] === "fn")?.[3] || "Unknown",
    creationDate: json?.events?.find((e: any) => e.eventAction === "registration")?.eventDate || "",
    expirationDate: json?.events?.find((e: any) => e.eventAction === "expiration")?.eventDate || "",
    registrant: {
      organization:
        json?.entities?.find((e: any) => (e.roles || []).includes("registrant"))?.vcardArray?.[1]?.find((v: any[]) => v[0] === "org")?.[3] || "",
      country:
        json?.entities?.find((e: any) => (e.roles || []).includes("registrant"))?.vcardArray?.[1]?.find((v: any[]) => v[0] === "adr")?.[3]?.[6] || "",
      state:
        json?.entities?.find((e: any) => (e.roles || []).includes("registrant"))?.vcardArray?.[1]?.find((v: any[]) => v[0] === "adr")?.[3]?.[4] || undefined,
    },
    status: (json?.status as string[]) || [],
  }

  cache.set(key, out)
  return out
}

async function rdapBaseForDomain(domain: string): Promise<string> {
  const tld = domain.split(".").pop() || "com"
  // IANA bootstrap
  const iana = await fetch(`https://data.iana.org/rdap/dns.json`).then((r) => r.json() as Promise<any>)
  const entry = iana.services?.find((s: any[]) => (s[0] as string[]).includes(tld))
  const base = (entry?.[1]?.[0] as string) || "https://rdap.verisign.com/com/v1"
  return base.replace(/\/$/, "")
}


