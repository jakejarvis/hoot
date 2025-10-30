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

  // Enable other sections if:
  // 1. Domain is confirmed registered (isRegistered === true), OR
  // 2. WHOIS/RDAP is unavailable (source === null) - we can still check DNS, hosting, etc.
  const shouldEnableSections =
    registration.data?.isRegistered === true ||
    registration.data?.source === null;

  const dns = useQuery(
    trpc.domain.dns.queryOptions(
      { domain },
      {
        enabled: shouldEnableSections,
        placeholderData: (prev) => prev,
      },
    ),
  );

  const hosting = useQuery(
    trpc.domain.hosting.queryOptions(
      { domain },
      {
        enabled: shouldEnableSections,
        placeholderData: (prev) => prev,
      },
    ),
  );

  const certs = useQuery(
    trpc.domain.certificates.queryOptions(
      { domain },
      {
        enabled: shouldEnableSections,
        placeholderData: (prev) => prev,
      },
    ),
  );

  const headers = useQuery(
    trpc.domain.headers.queryOptions(
      { domain },
      {
        enabled: shouldEnableSections,
        placeholderData: (prev) => prev,
      },
    ),
  );

  const seo = useQuery(
    trpc.domain.seo.queryOptions(
      { domain },
      {
        enabled: shouldEnableSections,
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
