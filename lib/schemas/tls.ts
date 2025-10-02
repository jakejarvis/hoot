import { z } from "zod";
import { ProviderRefSchema } from "./provider";

export const CertificateSchema = z.object({
  issuer: z.string(),
  subject: z.string(),
  altNames: z.array(z.string()),
  validFrom: z.string(),
  validTo: z.string(),
  caProvider: ProviderRefSchema,
});

export const CertificatesSchema = z.array(CertificateSchema);

export type Certificate = z.infer<typeof CertificateSchema>;
