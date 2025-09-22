import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import type { Whois } from "@/server/services/rdap-parser";

type UseDomainQueriesOptions = {
  initialWhois?: Whois;
  initialRegistered?: boolean;
};

export function useDomainQueries(
  domain: string,
  opts?: UseDomainQueriesOptions,
) {
  const trpc = useTRPC();
  const whois = useQuery(
    trpc.domain.whois.queryOptions(
      { domain },
      {
        enabled: !!domain,
        initialData: opts?.initialWhois,
        staleTime: 30 * 60_000, // 30 minutes, avoid churn
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  const registered =
    (opts?.initialRegistered ?? whois.data?.registered) === true;

  const dns = useQuery(
    trpc.domain.dns.queryOptions(
      { domain },
      {
        enabled: !!domain && registered,
        staleTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  const hosting = useQuery(
    trpc.domain.hosting.queryOptions(
      { domain },
      {
        enabled: !!domain && registered,
        staleTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  const certs = useQuery(
    trpc.domain.certificates.queryOptions(
      { domain },
      {
        enabled: !!domain && registered,
        staleTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  const headers = useQuery(
    trpc.domain.headers.queryOptions(
      { domain },
      {
        enabled: !!domain && registered,
        staleTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
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
