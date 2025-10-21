import { z } from "zod";

export const HttpHeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const HttpHeadersSchema = z.array(HttpHeaderSchema);

export const HttpHeadersSourceSchema = z
  .object({
    finalUrl: z.string().url().nullable(),
    status: z.number().nullable(),
  })
  .nullable()
  .optional();

export const HttpHeadersResponseSchema = z.object({
  headers: z.array(
    z.object({
      name: z.string(),
      value: z.union([z.string(), z.array(z.string())]),
    }),
  ),
  source: HttpHeadersSourceSchema,
});

export type HttpHeader = z.infer<typeof HttpHeaderSchema>;
export type HttpHeadersResponse = z.infer<typeof HttpHeadersResponseSchema>;
