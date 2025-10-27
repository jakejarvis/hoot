import { initTRPC, TRPCError } from "@trpc/server";
import { ipAddress } from "@vercel/functions";
import superjson from "superjson";
import type { Session, User } from "@/lib/auth/config";
import { auth } from "@/lib/auth/config";
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

  const path = req ? new URL(req.url).pathname : undefined;
  const requestId = req?.headers.get("x-request-id");
  const vercelId = req?.headers.get("x-vercel-id");

  const log = createRequestLogger({
    ip: ip ?? undefined,
    method: req?.method,
    path,
    requestId,
    vercelId,
  });

  // Get Better Auth session from request headers
  let session: Session | null = null;
  let user: User | null = null;

  if (req) {
    const sessionData = await auth.api.getSession({
      headers: req.headers,
    });

    if (sessionData) {
      session = sessionData.session;
      user = sessionData.user;
    }
  }

  return { ip, req, log, session, user } as const;
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
  ctx.log.debug("start", { rpcPath: path, rpcType: type });
  try {
    const result = await next();
    ctx.log.info("ok", {
      rpcPath: path,
      rpcType: type,
      durationMs: Math.round(performance.now() - start),
    });
    return result;
  } catch (err) {
    ctx.log.error("error", {
      rpcPath: path,
      rpcType: type,
      durationMs: Math.round(performance.now() - start),
      err: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  }
});

const withAuth = t.middleware(async ({ ctx, next }) => {
  // Destructure to local variables for proper type narrowing
  const { session, user } = ctx;

  if (!session || !user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Pass narrowed non-null session and user to next context
  return next({
    ctx: {
      ...ctx,
      session, // TypeScript infers as non-null
      user, // TypeScript infers as non-null
    },
  });
});

export const publicProcedure = t.procedure.use(withLogging);
export const protectedProcedure = t.procedure.use(withLogging).use(withAuth);
