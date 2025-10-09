import { z } from "zod";
import { CertificateSchema } from "../domain/certificates";
import { DnsRecordSchema, DnsResolverSchema } from "../domain/dns";
import { HostingSchema } from "../domain/hosting";
import { HttpHeadersSchema } from "../domain/http";
import { RegistrationSchema } from "../domain/registration";
import { SeoResponseSchema } from "../domain/seo";

export const DomainExportSchema = z.object({
  domain: z.string(),
  registration: RegistrationSchema.omit({
    domain: true,
    unicodeName: true,
    punycodeName: true,
    warnings: true,
  })
    .transform((r) => ({
      ...r,
      registrarProvider: r.registrarProvider.name ?? null,
    }))
    .nullish(),
  dns: z
    .object({
      records: z.array(DnsRecordSchema.omit({ isCloudflare: true })),
      resolver: DnsResolverSchema,
    })
    .nullish(),
  hosting: HostingSchema.transform((h) => ({
    ...h,
    hostingProvider: h.hostingProvider.name ?? null,
    emailProvider: h.emailProvider.name ?? null,
    dnsProvider: h.dnsProvider.name ?? null,
  })).nullish(),
  certificates: z
    .array(
      CertificateSchema.transform((c) => ({
        ...c,
        caProvider: c.caProvider.name ?? null,
      })),
    )
    .nullish(),
  headers: HttpHeadersSchema.nullish(),
  seo: SeoResponseSchema.omit({ preview: true, source: true }).nullish(),
});

export type DomainExport = z.infer<typeof DomainExportSchema>;
