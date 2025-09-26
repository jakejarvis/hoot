import { router } from "../trpc";
import { domainRouter } from "./domain";
import { seoRouter } from "./seo";

export const appRouter = router({
  domain: domainRouter,
  seo: seoRouter,
});

export type AppRouter = typeof appRouter;
