import type { DomainRecord } from "rdapper";
import { z } from "zod";

export const RegistrarProviderSchema = z.object({
  name: z.string(),
  domain: z.string().nullable(),
});

export const RegistrationWithProviderSchema = z
  .object({
    isRegistered: z.boolean(),
    registrar: z.any().optional(),
    registrarProvider: RegistrarProviderSchema.optional(),
    source: z.any().optional(),
  })
  .passthrough();

export type RegistrationWithProvider = DomainRecord &
  z.infer<typeof RegistrationWithProviderSchema>;
