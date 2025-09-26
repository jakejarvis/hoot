import { fetchSeoData } from "@/lib/seo";
import { router } from "../trpc";
import { createDomainProcedure } from "./domain-procedure";

export const seoRouter = router({
  seo: createDomainProcedure(fetchSeoData, "SEO data fetch failed"),
});