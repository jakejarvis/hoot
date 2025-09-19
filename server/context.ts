import "server-only";

import type { Context } from "./trpc";

export async function createContext(): Promise<Context> {
  // Extend with headers()/cookies() when auth/session is added
  return {};
}
