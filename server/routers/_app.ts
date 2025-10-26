import { domainRouter } from "@/server/routers/domain";
import { domainsRouter } from "@/server/routers/domains";
import { notificationsRouter } from "@/server/routers/notifications";
import { testRouter } from "@/server/routers/test";
import { createTRPCRouter } from "@/trpc/init";

export const appRouter = createTRPCRouter({
  domain: domainRouter,
  domains: domainsRouter,
  notifications: notificationsRouter,
  test: testRouter,
});

export type AppRouter = typeof appRouter;
