/**
 * Example usage of the extensible provider detection system
 * This demonstrates how to add new providers and rules dynamically
 */

import { defaultRegistry, type ProviderRegistryEntry } from "./registry";
import type { FaviconRule, HeaderRule } from "./types";

// Example 1: Adding a new hosting provider dynamically
export function addExampleHostingProvider(): void {
  const newProvider: ProviderRegistryEntry = {
    name: "Railway",
    domain: "railway.app",
    category: "hosting",
    aliases: ["railway"],
    rules: [
      {
        type: "header",
        headerExists: ["x-railway-id"],
        headerValueIncludes: {
          "x-powered-by": ["railway"],
        },
      } satisfies HeaderRule,
      {
        type: "favicon",
        domainIncludes: ["railway"],
      } satisfies FaviconRule,
    ],
  };

  defaultRegistry.addProvider(newProvider);
}

// Example 2: Testing the new provider
export function testRailwayDetection(): void {
  // Add the provider first
  addExampleHostingProvider();

  // Test detection
  const testHeaders = [
    { name: "x-railway-id", value: "abc123" },
    { name: "x-powered-by", value: "Railway" },
  ];

  const detected = defaultRegistry.detectHostingProvider(testHeaders);
  console.log(`Detected hosting provider: ${detected}`); // Should print "Railway"
}

// Example 3: Adding multiple providers with different rule combinations
export function addModernHostingProviders(): void {
  const providers: ProviderRegistryEntry[] = [
    {
      name: "Supabase",
      domain: "supabase.com",
      category: "hosting",
      aliases: ["supabase"],
      rules: [
        {
          type: "header",
          headerNameStartsWith: ["x-supabase-"],
          headerExists: ["x-sb-gateway"],
        },
      ],
    },
    {
      name: "PlanetScale",
      domain: "planetscale.com",
      category: "hosting",
      aliases: ["planetscale"],
      rules: [
        {
          type: "header",
          headerValueIncludes: {
            server: ["planetscale"],
          },
        },
      ],
    },
  ];

  for (const provider of providers) {
    defaultRegistry.addProvider(provider);
  }
}

// Example 4: Complex multi-rule detection
export function addAdvancedProvider(): void {
  const provider: ProviderRegistryEntry = {
    name: "Advanced Cloud Platform",
    domain: "advancedcloud.example",
    category: "hosting",
    aliases: ["advanced-cloud", "acp"],
    rules: [
      // Must match ANY of these rules (OR logic)
      {
        type: "header",
        serverIncludes: ["advanced-cloud"],
        headerExists: ["x-acp-version"],
      },
      {
        type: "header",
        headerValueIncludes: {
          "x-powered-by": ["advanced cloud platform"],
        },
      },
      {
        type: "favicon",
        domainIncludes: ["advancedcloud"],
      },
    ],
  };

  defaultRegistry.addProvider(provider);
}

// Example 5: Demonstrating registry capabilities
export function demonstrateRegistryFeatures(): void {
  console.log("=== Provider Registry Demo ===");

  // Get all providers by category
  const hostingProviders = defaultRegistry.getProvidersByCategory("hosting");
  console.log(`Hosting providers: ${hostingProviders.length}`);

  const emailProviders = defaultRegistry.getProvidersByCategory("email");
  console.log(`Email providers: ${emailProviders.length}`);

  // Find specific provider
  const vercel = defaultRegistry.findProvider("Vercel");
  console.log(`Vercel domain: ${vercel?.domain}`);
  console.log(`Vercel rules: ${vercel?.rules?.length || 0}`);

  // Test domain mapping
  const domain = defaultRegistry.mapProviderNameToDomain("cloudflare");
  console.log(`Cloudflare favicon domain: ${domain}`);
}
