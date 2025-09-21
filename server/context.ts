import "server-only";

import type { Context } from "./trpc";

export async function createContext(params?: {
  req: Request;
}): Promise<Context> {
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
