export * from "./providers/detect";
export * from "./providers/types";
export {
  detectHostingProvider,
  detectEmailProvider,
  detectDnsProvider,
  ProviderCatalog as NewProviderCatalog,
} from "./providers/detection";
