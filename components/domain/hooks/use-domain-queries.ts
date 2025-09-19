import { trpc } from "@/lib/trpc/client";

export function useDomainQueries(domain: string) {
  const whois = trpc.domain.whois.useQuery(
    { domain },
    { enabled: !!domain, retry: 1 },
  );

  const dns = trpc.domain.dns.useQuery(
    { domain },
    { enabled: !!domain && whois.data?.registered === true, retry: 2 },
  );

  const hosting = trpc.domain.hosting.useQuery(
    { domain },
    { enabled: !!domain && whois.data?.registered === true, retry: 1 },
  );

  const certs = trpc.domain.certificates.useQuery(
    { domain },
    { enabled: !!domain && whois.data?.registered === true, retry: 0 },
  );

  const headers = trpc.domain.headers.useQuery(
    { domain },
    { enabled: !!domain && whois.data?.registered === true, retry: 1 },
  );

  const allSectionsReady =
    whois.isSuccess &&
    whois.data?.registered === true &&
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
