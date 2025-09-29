import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export async function createContext(params?: { req: Request }) {
  const headers = params?.req?.headers ?? new Headers();
  const posthogDistinctId = headers.get("x-posthog-distinct-id") || undefined;
  const posthogSessionId = headers.get("x-posthog-session-id") || undefined;

  // Fallback to cookie if header not present
  let cookieDistinctId: string | undefined;
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) {
      const cookieName = `ph_${key}_posthog`;
      const cookieStr = headers.get("cookie") ?? "";
      const m = cookieStr.match(new RegExp(`${cookieName}=([^;]+)`));
      if (m) {
        const parsed = JSON.parse(decodeURIComponent(m[1]));
        if (parsed && typeof parsed.distinct_id === "string") {
          cookieDistinctId = parsed.distinct_id;
        }
      }
    }
  } catch {
    // ignore
  }

  return {
    posthogDistinctId: posthogDistinctId ?? cookieDistinctId,
    posthogSessionId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
