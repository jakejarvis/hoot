import "server-only";

import type { DomainRecord } from "rdapper";
import { cache } from "react";
import { createServerCaller } from "../caller";

export const prefetchRegistration = cache(
  async (domain: string): Promise<DomainRecord> => {
    const caller = await createServerCaller();
    const registration = await caller.domain.registration({ domain });
    return registration;
  },
);
