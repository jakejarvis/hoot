import { domainRouter } from "@/server/routers/domain";
import { createTRPCRouter } from "@/trpc/init";

export const appRouter = createTRPCRouter({
  domain: domainRouter,
});

export type AppRouter = typeof appRouter;
