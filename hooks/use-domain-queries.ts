import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

export function useDomainQueries(domain: string) {
  const trpc = useTRPC();
  const registration = useQuery(
    trpc.domain.registration.queryOptions(
      { domain },
      {
        staleTime: 30 * 60_000, // 30 minutes, avoid churn
        // Keep UI stable during transitions by reusing previous data
        placeholderData: (prev) => prev,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  const dns = useQuery(
    trpc.domain.dns.queryOptions(
      { domain },
      {
        enabled: registration.data?.isRegistered,
        staleTime: 30 * 60_000,
        placeholderData: (prev) => prev,
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
        enabled: registration.data?.isRegistered,
        staleTime: 30 * 60_000,
        placeholderData: (prev) => prev,
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
        enabled: registration.data?.isRegistered,
        staleTime: 30 * 60_000,
        placeholderData: (prev) => prev,
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
        enabled: registration.data?.isRegistered,
        staleTime: 30 * 60_000,
        placeholderData: (prev) => prev,
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
        enabled: registration.data?.isRegistered,
        staleTime: 6 * 60 * 60_000,
        placeholderData: (prev) => prev,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  return {
    registration,
    dns,
    hosting,
    certs,
    headers,
    seo,
  };
}
