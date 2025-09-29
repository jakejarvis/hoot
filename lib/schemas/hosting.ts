import { z } from "zod";
import { ProviderRefSchema } from "./provider";

export const HostingInfoSchema = z.object({
  hostingProvider: ProviderRefSchema,
  emailProvider: ProviderRefSchema,
  dnsProvider: ProviderRefSchema,
  ipAddress: z.string().nullable(),
  geo: z.object({
    city: z.string(),
    region: z.string(),
    country: z.string(),
    lat: z.number().nullable(),
    lon: z.number().nullable(),
    emoji: z.string().nullable(),
  }),
});

export type HostingInfo = z.infer<typeof HostingInfoSchema>;
