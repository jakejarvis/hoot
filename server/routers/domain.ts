import { resolveAll } from "../services/dns";
import { probeHeaders } from "../services/headers";
import { detectHosting } from "../services/hosting";
import { fetchWhois } from "../services/rdap";
import { getCertificates } from "../services/tls";
import { router } from "../trpc";
import { createDomainProcedure } from "./domain-procedure";

export const domainRouter = router({
  whois: createDomainProcedure(fetchWhois, "WHOIS lookup failed"),
  dns: createDomainProcedure(resolveAll, "DNS resolution failed"),
  hosting: createDomainProcedure(detectHosting, "Hosting detection failed"),
  certificates: createDomainProcedure(
    getCertificates,
    "Certificate fetch failed",
  ),
  headers: createDomainProcedure(async (domain: string) => {
    const res = await probeHeaders(domain);
    return res.headers;
  }, "Header probe failed"),
});
