import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { normalizeDomainInput } from "@/lib/domain";
import { isAcceptableDomainInput } from "@/lib/domain-server";
import { captureServer } from "@/server/analytics/posthog";
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
  return publicProcedure.input(domainInput).query(async ({ input, path }) => {
    const startedAt = Date.now();
    const serviceName = path?.split(".").pop() ?? "unknown";
    try {
      const result = await serviceFunction(input.domain);
      const durationMs = Date.now() - startedAt;
      await captureServer("trpc_domain_service_call", {
        service: serviceName,
        domain: input.domain,
        duration_ms: durationMs,
        success: true,
      });
      return result;
    } catch (_err) {
      const durationMs = Date.now() - startedAt;
      await captureServer("trpc_domain_service_call", {
        service: serviceName,
        domain: input.domain,
        duration_ms: durationMs,
        success: false,
        error_code: "INTERNAL_SERVER_ERROR",
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: errorMessage,
      });
    }
  });
}
