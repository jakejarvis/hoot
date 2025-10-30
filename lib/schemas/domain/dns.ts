import { z } from "zod";

export const DnsTypeSchema = z.enum(["A", "AAAA", "MX", "TXT", "NS"]);

export const DnsRecordSchema = z.object({
  type: DnsTypeSchema,
  name: z.string(),
  value: z.string(),
  ttl: z.number().optional(),
  priority: z.number().optional(),
  isCloudflare: z.boolean().optional(),
});

export const DnsResolveResultSchema = z.object({
  records: z.array(DnsRecordSchema),
  resolver: z.string().nullable(),
});

export type DnsType = z.infer<typeof DnsTypeSchema>;
export type DnsRecord = z.infer<typeof DnsRecordSchema>;
export type DnsResolveResult = z.infer<typeof DnsResolveResultSchema>;
