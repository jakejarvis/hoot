import "server-only";

import { cache } from "react";
import type { RegistrationWithProvider } from "@/lib/schemas";
import { createServerCaller } from "../caller";

export const prefetchRegistration = cache(
  async (domain: string): Promise<RegistrationWithProvider> => {
    const caller = await createServerCaller();
    const registration = await caller.domain.registration({ domain });
    return registration;
  },
);
