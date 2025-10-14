import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

export function useDomainQueries(domain: string) {
  const trpc = useTRPC();
  const registration = useQuery(
    trpc.domain.registration.queryOptions(
      { domain },
      {
        // Keep UI stable during transitions by reusing previous data
        placeholderData: (prev) => prev,
      },
    ),
  );

  const dns = useQuery(
    trpc.domain.dns.queryOptions(
      { domain },
      {
        enabled: registration.data?.isRegistered,
        placeholderData: (prev) => prev,
      },
    ),
  );

  const hosting = useQuery(
    trpc.domain.hosting.queryOptions(
      { domain },
      {
        // Optional micro-tuning: wait until DNS has resolved once to better
        // reuse warm caches server-side. If DNS errored, still allow hosting to run.
        enabled:
          registration.data?.isRegistered && (dns.isSuccess || dns.isError),
        placeholderData: (prev) => prev,
      },
    ),
  );

  const certs = useQuery(
    trpc.domain.certificates.queryOptions(
      { domain },
      {
        enabled: registration.data?.isRegistered,
        placeholderData: (prev) => prev,
      },
    ),
  );

  const headers = useQuery(
    trpc.domain.headers.queryOptions(
      { domain },
      {
        enabled: registration.data?.isRegistered,
        placeholderData: (prev) => prev,
      },
    ),
  );

  const seo = useQuery(
    trpc.domain.seo.queryOptions(
      { domain },
      {
        enabled: registration.data?.isRegistered,
        placeholderData: (prev) => prev,
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
