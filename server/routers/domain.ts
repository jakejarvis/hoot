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
  ),
  dns: createDomainProcedure(resolveAll, "DNS resolution failed"),
  hosting: createDomainProcedure(detectHosting, "Hosting detection failed"),
  certificates: createDomainProcedure(
    getCertificates,
    "Certificate fetch failed",
  ),
  headers: createDomainProcedure(probeHeaders, "Header probe failed"),
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
