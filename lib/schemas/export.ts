import { z } from "zod";
import { DnsRecordSchema, DnsResolverSchema } from "./dns";
import { HostingSchema } from "./hosting";
import { HttpHeadersSchema } from "./http";
import { RegistrationSchema } from "./registration";
import { CertificateSchema } from "./tls";

export const DomainExportSchema = z.object({
  domain: z.string(),
  registration: RegistrationSchema.omit({
    domain: true,
    unicodeName: true,
    punycodeName: true,
    fetchedAt: true,
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
});

export type DomainExport = z.infer<typeof DomainExportSchema>;
