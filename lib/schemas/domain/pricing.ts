import z from "zod";

export const PricingSchema = z.object({
  tld: z.string().nullable(),
  price: z.string().nullable(),
});

export type Pricing = z.infer<typeof PricingSchema>;
