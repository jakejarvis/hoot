import { z } from "zod";

export const HttpHeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const HttpHeadersSchema = z.array(HttpHeaderSchema);

export type HttpHeader = z.infer<typeof HttpHeaderSchema>;
