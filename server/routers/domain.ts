import z from "zod";
import { normalizeDomainInput } from "@/lib/domain";
import { isAcceptableDomainInput } from "@/lib/domain-server";
import {
  CertificatesSchema,
  DnsResolveResultSchema,
  HostingSchema,
  HttpHeadersSchema,
  RegistrationSchema,
} from "@/lib/schemas";
import { resolveAll } from "@/server/services/dns";
import { getOrCreateFaviconBlobUrl } from "@/server/services/favicon";
import { probeHeaders } from "@/server/services/headers";
import { detectHosting } from "@/server/services/hosting";
import { getRegistration } from "@/server/services/registration";
import { getOrCreateScreenshotBlobUrl } from "@/server/services/screenshot";
import { getCertificates } from "@/server/services/tls";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

export const domainInput = z
  .object({ domain: z.string().min(1) })
  .transform(({ domain }) => ({ domain: normalizeDomainInput(domain) }))
  .refine(({ domain }) => isAcceptableDomainInput(domain), {
    message: "Invalid domain",
    path: ["domain"],
  });

export const domainRouter = createTRPCRouter({
  registration: publicProcedure
    .input(domainInput)
    .output(RegistrationSchema)
    .query(({ input }) => getRegistration(input.domain)),
  dns: publicProcedure
    .input(domainInput)
    .output(DnsResolveResultSchema)
    .query(({ input }) => resolveAll(input.domain)),
  hosting: publicProcedure
    .input(domainInput)
    .output(HostingSchema)
    .query(({ input }) => detectHosting(input.domain)),
  certificates: publicProcedure
    .input(domainInput)
    .output(CertificatesSchema)
    .query(({ input }) => getCertificates(input.domain)),
  headers: publicProcedure
    .input(domainInput)
    .output(HttpHeadersSchema)
    .query(({ input }) => probeHeaders(input.domain)),
  favicon: publicProcedure
    .input(domainInput)
    .query(({ input }) => getOrCreateFaviconBlobUrl(input.domain)),
  screenshot: publicProcedure
    .input(domainInput)
    .query(({ input }) => getOrCreateScreenshotBlobUrl(input.domain)),
});
