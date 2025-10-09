import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export const createContext = async () => {
  return {};
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const loggedProcedure = publicProcedure.use(async (opts) => {
  const start = Date.now();
  const result = await opts.next();
  const durationMs = Date.now() - start;
  const meta = {
    path: opts.path,
    type: opts.type,
    durationMs,
  };
  if (result.ok) {
    console.info("[trpc] ok", meta);
  } else {
    console.error("[trpc] error", meta);
  }
  return result;
});
