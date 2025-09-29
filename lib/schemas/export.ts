import { z } from "zod";
import { DnsRecordSchema, DnsSourceSchema } from "./dns";
import { HostingSchema } from "./hosting";
import { HttpHeadersSchema } from "./http";
import { RegistrationSchema } from "./registration";
import { CertificateSchema } from "./tls";

export const DomainExportSchema = z.object({
  domain: z.string(),
  exportedAt: z.string(), // ISO 8601
  registration: RegistrationSchema.omit({
    fetchedAt: true,
    warnings: true,
    registrarProvider: true,
  }).nullish(),
  dns: z
    .object({
      records: z.array(DnsRecordSchema.omit({ isCloudflare: true })),
      source: DnsSourceSchema,
    })
    .nullish(),
  hosting: HostingSchema.nullish(),
  certificates: z.array(CertificateSchema.omit({ caProvider: true })).nullish(),
  headers: HttpHeadersSchema.nullish(),
});

export type DomainExport = z.infer<typeof DomainExportSchema>;
