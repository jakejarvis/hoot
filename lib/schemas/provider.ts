import { z } from "zod";

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

export const ProviderRefSchema = z.object({
  name: z.string(),
  domain: z.string().nullable(),
});

export type DetectionRule = z.infer<typeof DetectionRuleSchema>;
export type ProviderRef = z.infer<typeof ProviderRefSchema>;
