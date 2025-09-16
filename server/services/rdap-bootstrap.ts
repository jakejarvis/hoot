import { unstable_cache } from "next/cache";

type IanaDnsBootstrap = { services?: [string[], string[]][] };

const fetchIanaDns = unstable_cache(
  async (): Promise<IanaDnsBootstrap> => {
    const res = await fetch("https://data.iana.org/rdap/dns.json", {
      // Persist in Next.js data cache on Vercel
      next: { revalidate: 24 * 60 * 60 },
    });
    if (!res.ok) {
      throw new Error(`Failed to load IANA RDAP bootstrap: ${res.status}`);
    }
    return (await res.json()) as IanaDnsBootstrap;
  },
  ["iana-rdap-dns.json"],
  { revalidate: 24 * 60 * 60 },
);

export async function getRdapBaseForTld(tld: string): Promise<string | null> {
  const iana = await fetchIanaDns();
  const entry = iana.services?.find((s) => s[0].includes(tld));
  const base = entry?.[1]?.[0] ?? null;
  return base ? base.replace(/\/$/, "") : null;
}

export async function isTldRdapSupported(tld: string): Promise<boolean> {
  const base = await getRdapBaseForTld(tld);
  return Boolean(base);
}
