import {
  CertificatesSchema,
  DnsResolveResultSchema,
  HostingSchema,
  HttpHeadersSchema,
} from "@/lib/schemas";
import { resolveAll } from "../services/dns";
import { getOrCreateFaviconBlobUrl } from "../services/favicon";
import { probeHeaders } from "../services/headers";
import { detectHosting } from "../services/hosting";
import { getRegistration } from "../services/registration";
import { getOrCreateScreenshotBlobUrl } from "../services/screenshot";
import { getSeo } from "../services/seo";
import { getCertificates } from "../services/tls";
import { router } from "../trpc";
import { createDomainProcedure } from "./domain-procedure";

export const domainRouter = router({
  registration: createDomainProcedure(
    getRegistration,
    "Registration lookup failed",
    // Do not narrow output type for registration; we return full DomainRecord shape.
    undefined,
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
