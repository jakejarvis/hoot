import { mapProviderNameToDomain } from "@/lib/providers/detection";

export type Whois = {
  source?: "rdap" | "whois";
  registrar: { name: string; iconDomain: string | null };
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

export function parseRdapResponse(json: RdapJson): Whois {
  const registrarInfo = extractRegistrarInfo(json);
  const registrantInfo = extractRegistrantInfo(json);
  const eventDates = extractEventDates(json);

  const status = json.status ?? [];
  const registered = !status.some((s) => s.toLowerCase() === "available");

  return {
    source: "rdap",
    registrar: registrarInfo,
    creationDate: eventDates.creation,
    expirationDate: eventDates.expiration,
    registrant: registrantInfo,
    status,
    registered,
  };
}

function extractRegistrarInfo(json: RdapJson): {
  name: string;
  iconDomain: string | null;
} {
  const registrarName =
    json.registrar?.name ??
    findVcardValue(findEntity(json.entities, "registrar"), "fn") ??
    "Unknown";

  return {
    name: registrarName,
    iconDomain: mapProviderNameToDomain(registrarName) || null,
  };
}

function extractRegistrantInfo(json: RdapJson): {
  organization: string;
  country: string;
  state?: string;
} {
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

  return { organization, country, state };
}

function extractEventDates(json: RdapJson): {
  creation: string;
  expiration: string;
} {
  const creationDate =
    json.events?.find((e) => e.eventAction === "registration")?.eventDate ?? "";

  const expirationDate =
    json.events?.find((e) => e.eventAction === "expiration")?.eventDate ?? "";

  return { creation: creationDate, expiration: expirationDate };
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
