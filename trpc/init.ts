import { initTRPC } from "@trpc/server";
import { ipAddress } from "@vercel/functions";
import superjson from "superjson";

export const createContext = async (opts?: { req?: Request }) => {
  const ip = opts?.req ? (ipAddress(opts.req) ?? null) : null;
  return { ip, req: opts?.req } as const;
};

export type Context = Awaited<ReturnType<typeof createContext>>;

export const t = initTRPC
  .context<Context>()
  .meta<Record<string, unknown>>()
  .create({
    transformer: superjson,
  });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
