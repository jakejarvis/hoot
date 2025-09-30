import { z } from "zod";

// Primitive checks
export type HeaderEquals = {
  kind: "headerEquals";
  name: string;
  value: string;
};
export type HeaderIncludes = {
  kind: "headerIncludes";
  name: string;
  substr: string;
};
export type HeaderPresent = { kind: "headerPresent"; name: string };

export type MxSuffix = { kind: "mxSuffix"; suffix: string };
export type NsSuffix = { kind: "nsSuffix"; suffix: string };
export type IssuerIncludes = { kind: "issuerIncludes"; substr: string };

// Compose with logic
export type Logic =
  | { all: Logic[] }
  | { any: Logic[] }
  | { not: Logic }
  | HeaderEquals
  | HeaderIncludes
  | HeaderPresent
  | MxSuffix
  | NsSuffix
  | IssuerIncludes;

// What the evaluator receives
export interface DetectionContext {
  headers: Record<string, string>; // normalized lowercased names
  mx: string[]; // lowercased FQDNs
  ns: string[]; // lowercased FQDNs
  issuer?: string; // lowercased certificate issuer string
}

export type ProviderCategory = "hosting" | "email" | "dns" | "ca";

export type Provider = {
  name: string;
  domain: string;
  rule: Logic;
  category: ProviderCategory;
};

export const ProviderRefSchema = z.object({
  name: z.string(),
  domain: z.string().nullable(),
});

export type ProviderRef = z.infer<typeof ProviderRefSchema>;
