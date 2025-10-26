import { domainRouter } from "@/server/routers/domain";
import { testRouter } from "@/server/routers/test";
import { createTRPCRouter } from "@/trpc/init";

export const appRouter = createTRPCRouter({
  domain: domainRouter,
  test: testRouter,
});

export type AppRouter = typeof appRouter;
