import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { normalizeDomainInput } from "@/lib/domain";
import { isAcceptableDomainInput } from "@/lib/domain-server";
import { publicProcedure } from "../trpc";

export const domainInput = z
  .object({ domain: z.string().min(1) })
  .transform(({ domain }) => ({ domain: normalizeDomainInput(domain) }))
  .refine(({ domain }) => isAcceptableDomainInput(domain), {
    message: "Invalid domain",
    path: ["domain"],
  });

export function createDomainProcedure<T>(
  serviceFunction: (domain: string) => Promise<T>,
  errorMessage: string,
) {
  return publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      return await serviceFunction(input.domain);
    } catch (_err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: errorMessage,
      });
    }
  });
}
