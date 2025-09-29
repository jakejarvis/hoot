import { z } from "zod";
import { ProviderRefSchema } from "./provider";

/** Certificate Authority providers matched via aliases in issuer strings */
export const CertificateAuthorityProviderSchema = z.object({
  /** Canonical CA display name (e.g., "Let's Encrypt") */
  name: z.string(),
  /** Domain for favicon (e.g., "letsencrypt.org") */
  domain: z.string(),
  /** Case-insensitive substrings or tokens present in issuer, e.g. ["isrg", "r3"] */
  aliases: z.array(z.string()).optional(),
});

export const CertificateSchema = z.object({
  issuer: z.string(),
  subject: z.string(),
  altNames: z.array(z.string()),
  validFrom: z.string(),
  validTo: z.string(),
  caProvider: ProviderRefSchema,
});

export const CertificatesSchema = z.array(CertificateSchema);

export type CertificateAuthorityProvider = z.infer<
  typeof CertificateAuthorityProviderSchema
>;
export type Certificate = z.infer<typeof CertificateSchema>;
