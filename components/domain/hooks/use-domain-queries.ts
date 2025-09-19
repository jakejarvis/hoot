import { trpc } from "@/lib/trpc/client";
import type { Whois } from "@/server/services/rdap-parser";

type UseDomainQueriesOptions = {
  initialWhois?: Whois;
  initialRegistered?: boolean;
};

export function useDomainQueries(
  domain: string,
  opts?: UseDomainQueriesOptions,
) {
  const whois = trpc.domain.whois.useQuery(
    { domain },
    {
      enabled: !!domain,
      initialData: opts?.initialWhois,
      staleTime: 5 * 60_000,
    },
  );

  const registered =
    (opts?.initialRegistered ?? whois.data?.registered) === true;

  const dns = trpc.domain.dns.useQuery(
    { domain },
    { enabled: !!domain && registered },
  );

  const hosting = trpc.domain.hosting.useQuery(
    { domain },
    { enabled: !!domain && registered },
  );

  const certs = trpc.domain.certificates.useQuery(
    { domain },
    { enabled: !!domain && registered },
  );

  const headers = trpc.domain.headers.useQuery(
    { domain },
    { enabled: !!domain && registered },
  );

  const allSectionsReady =
    whois.isSuccess &&
    registered &&
    dns.isSuccess &&
    hosting.isSuccess &&
    certs.isSuccess &&
    headers.isSuccess;

  return {
    whois,
    dns,
    hosting,
    certs,
    headers,
    allSectionsReady,
  };
}
