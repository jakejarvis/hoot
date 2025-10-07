import { z } from "zod";
import { ProviderRefSchema } from "../internal/provider";

export const HostingSchema = z.object({
  hostingProvider: ProviderRefSchema,
  emailProvider: ProviderRefSchema,
  dnsProvider: ProviderRefSchema,
  geo: z.object({
    city: z.string(),
    region: z.string(),
    country: z.string(),
    lat: z.number().nullable(),
    lon: z.number().nullable(),
    emoji: z.string().nullable(),
  }),
});

export type Hosting = z.infer<typeof HostingSchema>;
