import { domainRouter } from "@/server/routers/domain";
import { domainsRouter } from "@/server/routers/domains";
import { testRouter } from "@/server/routers/test";
import { createTRPCRouter } from "@/trpc/init";

export const appRouter = createTRPCRouter({
  domain: domainRouter,
  domains: domainsRouter,
  test: testRouter,
});

export type AppRouter = typeof appRouter;
