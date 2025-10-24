import { initTRPC } from "@trpc/server";
import { ipAddress } from "@vercel/functions";
import superjson from "superjson";
import { createRequestLogger } from "@/lib/logger";

export const createContext = async (opts?: { req?: Request }) => {
  const req = opts?.req;
  const ip = req
    ? (ipAddress(req) ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      req.headers.get("cf-connecting-ip") ??
      null)
    : null;

  const requestId = req?.headers.get("x-request-id") || crypto.randomUUID();
  const path = req ? new URL(req.url).pathname : undefined;
  const vercelId = req?.headers.get("x-vercel-id");

  const log = createRequestLogger({
    ip: ip ?? undefined,
    method: req?.method,
    path,
    requestId,
    vercelId,
  });

  return { ip, req, log } as const;
};

export type Context = Awaited<ReturnType<typeof createContext>>;

export const t = initTRPC
  .context<Context>()
  .meta<Record<string, unknown>>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      const cause = (
        error as unknown as {
          cause?: {
            retryAfter?: number;
            service?: string;
            limit?: number;
            remaining?: number;
          };
        }
      ).cause;
      return {
        ...shape,
        data: {
          ...shape.data,
          retryAfter:
            typeof cause?.retryAfter === "number"
              ? cause.retryAfter
              : undefined,
          service:
            typeof cause?.service === "string" ? cause.service : undefined,
          limit: typeof cause?.limit === "number" ? cause.limit : undefined,
          remaining:
            typeof cause?.remaining === "number" ? cause.remaining : undefined,
        },
      };
    },
  });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

const withLogging = t.middleware(async ({ ctx, path, type, next }) => {
  const start = performance.now();
  ctx.log.debug("rpc.start", { rpcPath: path, rpcType: type });
  try {
    const result = await next();
    ctx.log.info("rpc.ok", {
      rpcPath: path,
      rpcType: type,
      duration_ms: Math.round(performance.now() - start),
    });
    return result;
  } catch (err) {
    ctx.log.error("rpc.error", {
      rpcPath: path,
      rpcType: type,
      duration_ms: Math.round(performance.now() - start),
      err,
    });
    throw err;
  }
});

export const publicProcedure = t.procedure.use(withLogging);
