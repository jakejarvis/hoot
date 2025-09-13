import { cacheGet, cacheSet, ns } from "@/lib/redis";

export type Whois = {
  registrar: string;
  creationDate: string;
  expirationDate: string;
  registrant: { organization: string; country: string; state?: string };
  status?: string[];
  registered: boolean;
};

type RdapEvent = { eventAction?: string; eventDate?: string };
type RdapEntity = { roles?: string[]; vcardArray?: [string, unknown[]] };
type RdapJson = {
  registrar?: { name?: string };
  entities?: RdapEntity[];
  events?: RdapEvent[];
  status?: string[];
};

export async function fetchWhois(domain: string): Promise<Whois> {
  const key = ns("rdap", domain.toLowerCase());
  const cached = await cacheGet<Whois>(key);
  if (cached) return cached;

  const rdapBase = await rdapBaseForDomain(domain);
  const url = `${rdapBase}/domain/${encodeURIComponent(domain)}`;
  const res = await fetch(url, {
    headers: { accept: "application/rdap+json" },
  });
  if (res.status === 404) {
    const result: Whois = {
      registrar: "",
      creationDate: "",
      expirationDate: "",
      registrant: { organization: "", country: "" },
      status: ["available"],
      registered: false,
    };
    await cacheSet(key, result, 60 * 60);
    return result;
  }
  if (!res.ok) throw new Error(`RDAP failed ${res.status}`);
  const json = (await res.json()) as unknown as RdapJson;

  const registrarName =
    json.registrar?.name ??
    findVcardValue(findEntity(json.entities, "registrar"), "fn") ??
    "Unknown";
  const creationDate =
    json.events?.find((e) => e.eventAction === "registration")?.eventDate ?? "";
  const expirationDate =
    json.events?.find((e) => e.eventAction === "expiration")?.eventDate ?? "";
  const registrantEnt = findEntity(json.entities, "registrant");
  const organization = findVcardValue(registrantEnt, "org") ?? "";
  const adr = findVcardEntry(registrantEnt, "adr");
  const country =
    Array.isArray(adr?.[3]) && typeof adr?.[3]?.[6] === "string"
      ? (adr?.[3]?.[6] as string)
      : "";
  const state =
    Array.isArray(adr?.[3]) && typeof adr?.[3]?.[4] === "string"
      ? (adr?.[3]?.[4] as string)
      : undefined;

  const status = json.status ?? [];
  const registered = !status.some((s) => s.toLowerCase() === "available");

  const result: Whois = {
    registrar: registrarName,
    creationDate,
    expirationDate,
    registrant: { organization, country, state },
    status,
    registered,
  };
  await cacheSet(key, result, registered ? 24 * 60 * 60 : 60 * 60);
  return result;
}

async function rdapBaseForDomain(domain: string): Promise<string> {
  const tld = domain.split(".").pop() || "com";
  // IANA bootstrap
  const iana = (await fetch(`https://data.iana.org/rdap/dns.json`).then((r) =>
    r.json(),
  )) as { services?: [string[], string[]][] };
  const entry = iana.services?.find((s) => s[0].includes(tld));
  const base = entry?.[1]?.[0] || "https://rdap.verisign.com/com/v1";
  return base.replace(/\/$/, "");
}

function findEntity(
  entities: RdapEntity[] | undefined,
  role: string,
): RdapEntity | undefined {
  return entities?.find((e) => e.roles?.includes(role));
}

function findVcardEntry(
  entity: RdapEntity | undefined,
  key: string,
): unknown[] | undefined {
  const arr = entity?.vcardArray?.[1];
  if (!Array.isArray(arr)) return undefined;
  return arr.find((v) => Array.isArray(v) && v[0] === key) as
    | unknown[]
    | undefined;
}

function findVcardValue(
  entity: RdapEntity | undefined,
  key: string,
): string | undefined {
  const entry = findVcardEntry(entity, key);
  const value = entry?.[3];
  return typeof value === "string" ? value : undefined;
}
