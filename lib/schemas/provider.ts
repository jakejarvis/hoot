import { z } from "zod";

export const ProviderRefSchema = z.object({
  name: z.string(),
  domain: z.string().nullable(),
});

export type ProviderRef = z.infer<typeof ProviderRefSchema>;
