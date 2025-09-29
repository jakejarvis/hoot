import { z } from "zod";

export type { HttpHeader } from "@/lib/schemas";

/**
 * Zod schema for provider detection rules
 */
export const DetectionRuleSchema = z.union([
  z.object({
    type: z.literal("header"),
    name: z.string(),
    value: z.string().optional(),
    present: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("dns"),
    recordType: z.enum(["MX", "NS"]),
    value: z.string(),
  }),
]);
export type DetectionRule = z.infer<typeof DetectionRuleSchema>;

/**
 * Zod schema for a provider definition
 */
export const ProviderSchema = z.object({
  /** The canonical name of the provider (e.g., "Vercel") */
  name: z.string(),
  /** The domain used to fetch the provider's icon (e.g., "vercel.com") */
  domain: z.string(),
  /** An array of rules that, if matched, identify this provider. */
  rules: z.array(DetectionRuleSchema),
});
export type Provider = z.infer<typeof ProviderSchema>;

/** Registrar providers do not use rules; they are matched by partial name */
export const RegistrarProviderSchema = z.object({
  /** Canonical registrar display name (e.g., "GoDaddy") */
  name: z.string(),
  /** Domain for favicon (e.g., "godaddy.com") */
  domain: z.string(),
  /** Additional case-insensitive substrings to match (e.g., ["godaddy inc"]). */
  aliases: z.array(z.string()).optional(),
});
export type RegistrarProvider = z.infer<typeof RegistrarProviderSchema>;

/** Certificate Authority providers matched via aliases in issuer strings */
export const CertificateAuthorityProviderSchema = z.object({
  /** Canonical CA display name (e.g., "Let's Encrypt") */
  name: z.string(),
  /** Domain for favicon (e.g., "letsencrypt.org") */
  domain: z.string(),
  /** Case-insensitive substrings or tokens present in issuer, e.g. ["isrg", "r3"] */
  aliases: z.array(z.string()).optional(),
});
export type CertificateAuthorityProvider = z.infer<
  typeof CertificateAuthorityProviderSchema
>;
