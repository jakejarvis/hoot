import { initTRPC } from "@trpc/server";
import { ipAddress } from "@vercel/functions";
import superjson from "superjson";

export const createContext = async (opts?: { req?: Request }) => {
  const req = opts?.req;
  const ip = req
    ? (ipAddress(req) ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      req.headers.get("cf-connecting-ip") ??
      null)
    : null;
  return { ip, req } as const;
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
