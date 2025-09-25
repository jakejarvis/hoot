import { useQuery } from "@tanstack/react-query";
import type { DomainRecord } from "rdapper";
import { useTRPC } from "@/lib/trpc/client";

type UseDomainQueriesOptions = {
  initialRegistration?: DomainRecord;
  initialRegistered?: boolean;
};

export function useDomainQueries(
  domain: string,
  opts?: UseDomainQueriesOptions,
) {
  const trpc = useTRPC();
  const registration = useQuery(
    trpc.domain.registration.queryOptions(
      { domain },
      {
        enabled: !!domain,
        initialData: opts?.initialRegistration,
        staleTime: 30 * 60_000, // 30 minutes, avoid churn
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  const registered =
    (opts?.initialRegistered ?? registration.data?.isRegistered) === true;

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

  const hasAnyIp =
    dns.data?.some((r) => r.type === "A" || r.type === "AAAA") ?? false;

  const certs = useQuery(
    trpc.domain.certificates.queryOptions(
      { domain },
      {
        enabled: !!domain && registered && hasAnyIp,
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
        enabled: !!domain && registered && hasAnyIp,
        staleTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  const allSectionsReady =
    registration.isSuccess &&
    registered &&
    dns.isSuccess &&
    hosting.isSuccess &&
    certs.isSuccess &&
    headers.isSuccess;

  return {
    registration,
    dns,
    hosting,
    certs,
    headers,
    allSectionsReady,
  };
}
