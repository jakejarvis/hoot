import {
  CertificatesSchema,
  DnsResolveResultSchema,
  HostingSchema,
  HttpHeadersSchema,
  RegistrationSchema,
} from "@/lib/schemas";
import { createDomainProcedure } from "@/server/routers/domain-procedure";
import { resolveAll } from "@/server/services/dns";
import { getOrCreateFaviconBlobUrl } from "@/server/services/favicon";
import { probeHeaders } from "@/server/services/headers";
import { detectHosting } from "@/server/services/hosting";
import { getRegistration } from "@/server/services/registration";
import { getOrCreateScreenshotBlobUrl } from "@/server/services/screenshot";
import { getSeo } from "@/server/services/seo";
import { getCertificates } from "@/server/services/tls";
import { router } from "@/trpc/init";

export const domainRouter = router({
  registration: createDomainProcedure(
    getRegistration,
    "Registration lookup failed",
    RegistrationSchema,
  ),
  dns: createDomainProcedure(
    resolveAll,
    "DNS resolution failed",
    DnsResolveResultSchema,
  ),
  hosting: createDomainProcedure(
    detectHosting,
    "Hosting detection failed",
    HostingSchema,
  ),
  certificates: createDomainProcedure(
    getCertificates,
    "Certificate fetch failed",
    CertificatesSchema,
  ),
  headers: createDomainProcedure(
    probeHeaders,
    "Header probe failed",
    HttpHeadersSchema,
  ),
  seo: createDomainProcedure(getSeo, "SEO analysis failed"),
  favicon: createDomainProcedure(
    getOrCreateFaviconBlobUrl,
    "Favicon fetch failed",
  ),
  screenshot: createDomainProcedure(
    getOrCreateScreenshotBlobUrl,
    "Screenshot capture failed",
  ),
});
