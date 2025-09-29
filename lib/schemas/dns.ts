import { z } from "zod";

export const DnsRecordSchema = z.object({
  type: z.union([
    z.literal("A"),
    z.literal("AAAA"),
    z.literal("MX"),
    z.literal("TXT"),
    z.literal("NS"),
  ]),
  name: z.string(),
  value: z.string(),
  ttl: z.number().optional(),
  priority: z.number().optional(),
  isCloudflare: z.boolean().optional(),
});

export const DnsResolveResultSchema = z.object({
  records: z.array(DnsRecordSchema),
  source: z.string(),
});

export type DnsRecord = z.infer<typeof DnsRecordSchema>;
export type DnsResolveResult = z.infer<typeof DnsResolveResultSchema>;
