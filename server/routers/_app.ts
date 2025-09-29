import { domainRouter } from "@/server/routers/domain";
import { router } from "@/trpc/init";

export const appRouter = router({
  domain: domainRouter,
});

export type AppRouter = typeof appRouter;
