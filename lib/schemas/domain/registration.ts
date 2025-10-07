import { z } from "zod";
import { ProviderRefSchema } from "../internal/provider";

// typed from rdapper
// https://chatgpt.com/s/t_68daacac17b88191b9dda5c878327209
export const RegistrationSchema = z.object({
  domain: z.string(),
  tld: z.string(),
  isRegistered: z.boolean(),
  isIDN: z.boolean().optional(),
  unicodeName: z.string().optional(),
  punycodeName: z.string().optional(),
  registry: z.string().optional(),

  registrar: z
    .object({
      name: z.string().optional(),
      ianaId: z.string().optional(),
      url: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),

  reseller: z.string().optional(),

  statuses: z
    .array(
      z.object({
        status: z.string(),
        description: z.string().optional(),
        raw: z.string().optional(),
      }),
    )
    .optional(),

  creationDate: z.string().optional(),
  updatedDate: z.string().optional(),
  expirationDate: z.string().optional(),
  deletionDate: z.string().optional(),

  transferLock: z.boolean().optional(),

  dnssec: z
    .object({
      enabled: z.boolean(),
      dsRecords: z
        .array(
          z.object({
            keyTag: z.number().optional(),
            algorithm: z.number().optional(),
            digestType: z.number().optional(),
            digest: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),

  nameservers: z
    .array(
      z.object({
        host: z.string(),
        ipv4: z.array(z.string()).optional(),
        ipv6: z.array(z.string()).optional(),
      }),
    )
    .optional(),

  contacts: z
    .array(
      z.object({
        type: z.enum([
          "registrant",
          "admin",
          "tech",
          "billing",
          "abuse",
          "registrar",
          "reseller",
          "unknown",
        ]),
        name: z.string().optional(),
        organization: z.string().optional(),
        email: z.union([z.string(), z.array(z.string())]).optional(),
        phone: z.union([z.string(), z.array(z.string())]).optional(),
        fax: z.union([z.string(), z.array(z.string())]).optional(),
        street: z.array(z.string()).optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
        countryCode: z.string().optional(),
      }),
    )
    .optional(),

  whoisServer: z.string().optional(),
  rdapServers: z.array(z.string()).optional(),
  rawRdap: z.unknown().optional(),
  rawWhois: z.string().optional(),

  source: z.enum(["rdap", "whois"]),
  fetchedAt: z.string(), // ISO 8601

  warnings: z.array(z.string()).optional(),

  registrarProvider: ProviderRefSchema,
});

export type Registration = z.infer<typeof RegistrationSchema>;
