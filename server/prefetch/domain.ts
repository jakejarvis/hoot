import "server-only";

import { cache } from "react";
import { createServerCaller } from "../caller";
import type { Whois } from "../services/rdap-parser";

export const prefetchWhois = cache(async (domain: string): Promise<Whois> => {
  const caller = await createServerCaller();
  const whois = await caller.domain.whois({ domain });
  return whois;
});
