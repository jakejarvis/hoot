import "server-only";

import { createContext } from "./context";
import { appRouter } from "./routers/_app";

export async function createServerCaller() {
  const ctx = await createContext();
  return appRouter.createCaller(ctx);
}
