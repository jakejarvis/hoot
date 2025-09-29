import { useQuery } from "@tanstack/react-query";
import type { RegistrationWithProvider } from "@/lib/schemas";
import { useTRPC } from "@/lib/trpc/client";

type UseDomainQueriesOptions = {
  // kept for backwards compat; not used when we hydrate via TanStack
  initialRegistration?: RegistrationWithProvider;
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
        // If hydrated on the server, data is present; otherwise this gracefully fetches on client
        initialData: opts?.initialRegistration,
        staleTime: 30 * 60_000, // 30 minutes, avoid churn
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  // Prefer live registration result over initial prop once available
  const registered =
    (registration.data?.isRegistered ?? opts?.initialRegistered) === true;

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
    dns.data?.records?.some(
      (r: { type: "A" | "AAAA" | "MX" | "TXT" | "NS" }) =>
        r.type === "A" || r.type === "AAAA",
    ) ?? false;

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

  const seo = useQuery(
    trpc.domain.seo.queryOptions(
      { domain },
      {
        enabled: !!domain && registered && hasAnyIp,
        staleTime: 6 * 60 * 60_000, // 6 hours
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  const allSectionsReady =
    registration.isSuccess &&
    dns.isSuccess &&
    hosting.isSuccess &&
    // Certificates and headers are only required if any IP exists
    (hasAnyIp ? certs.isSuccess && headers.isSuccess : true);

  return {
    registration,
    dns,
    hosting,
    certs,
    headers,
    seo,
    allSectionsReady,
  };
}
