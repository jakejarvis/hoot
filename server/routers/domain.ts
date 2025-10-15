import z from "zod";
import { normalizeDomainInput } from "@/lib/domain";
import { toRegistrableDomain } from "@/lib/domain-server";
import {
  CertificatesSchema,
  DnsResolveResultSchema,
  HostingSchema,
  HttpHeadersSchema,
  PricingSchema,
  RegistrationSchema,
  SeoResponseSchema,
} from "@/lib/schemas";
import { getCertificates } from "@/server/services/certificates";
import { resolveAll } from "@/server/services/dns";
import { getOrCreateFaviconBlobUrl } from "@/server/services/favicon";
import { probeHeaders } from "@/server/services/headers";
import { detectHosting } from "@/server/services/hosting";
import { getPricingForTld } from "@/server/services/pricing";
import { getRegistration } from "@/server/services/registration";
import { getOrCreateScreenshotBlobUrl } from "@/server/services/screenshot";
import { getSeo } from "@/server/services/seo";
import { createTRPCRouter, loggedProcedure } from "@/trpc/init";

export const domainInput = z
  .object({ domain: z.string().min(1) })
  .transform(({ domain }) => ({ domain: normalizeDomainInput(domain) }))
  .refine(({ domain }) => toRegistrableDomain(domain) !== null, {
    message: "Invalid domain",
    path: ["domain"],
  });

export const domainRouter = createTRPCRouter({
  registration: loggedProcedure
    .input(domainInput)
    .output(RegistrationSchema)
    .query(({ input }) => getRegistration(input.domain)),
  pricing: loggedProcedure
    .input(domainInput)
    .output(PricingSchema)
    .query(({ input }) => getPricingForTld(input.domain)),
  dns: loggedProcedure
    .input(domainInput)
    .output(DnsResolveResultSchema)
    .query(({ input }) => resolveAll(input.domain)),
  hosting: loggedProcedure
    .input(domainInput)
    .output(HostingSchema)
    .query(({ input }) => detectHosting(input.domain)),
  certificates: loggedProcedure
    .input(domainInput)
    .output(CertificatesSchema)
    .query(({ input }) => getCertificates(input.domain)),
  headers: loggedProcedure
    .input(domainInput)
    .output(HttpHeadersSchema)
    .query(({ input }) => probeHeaders(input.domain)),
  seo: loggedProcedure
    .input(domainInput)
    .output(SeoResponseSchema)
    .query(({ input }) => getSeo(input.domain)),
  favicon: loggedProcedure
    .input(domainInput)
    .query(({ input }) => getOrCreateFaviconBlobUrl(input.domain)),
  screenshot: loggedProcedure
    .input(domainInput)
    .query(({ input }) => getOrCreateScreenshotBlobUrl(input.domain)),
});
