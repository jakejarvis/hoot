import { z } from "zod";
import { DetectionRuleSchema, ProviderRefSchema } from "./provider";

export const HostingProviderSchema = z.object({
  /** The canonical name of the provider (e.g., "Vercel") */
  name: z.string(),
  /** The domain used to fetch the provider's icon (e.g., "vercel.com") */
  domain: z.string(),
  /** An array of rules that, if matched, identify this provider. */
  rules: z.array(DetectionRuleSchema),
});

export const HostingSchema = z.object({
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

export type HostingProvider = z.infer<typeof HostingProviderSchema>;
export type Hosting = z.infer<typeof HostingSchema>;
