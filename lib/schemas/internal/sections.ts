import { z } from "zod";

export const SectionEnum = z.enum([
  "dns",
  "headers",
  "hosting",
  "certificates",
  "seo",
  "registration",
]);

export type Section = z.infer<typeof SectionEnum>;
