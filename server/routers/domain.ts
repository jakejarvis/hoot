import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isValidDomain, normalizeDomainInput } from "@/lib/domain";
import { resolveAll } from "../services/dns";
import { probeHeaders } from "../services/headers";
import { detectHosting } from "../services/hosting";
import { fetchWhois } from "../services/rdap";
import { getCertificates } from "../services/tls";
import { publicProcedure, router } from "../trpc";

const domainInput = z
  .object({ domain: z.string().min(1) })
  .transform(({ domain }) => ({ domain: normalizeDomainInput(domain) }))
  .refine(({ domain }) => isValidDomain(domain), {
    message: "Invalid domain",
    path: ["domain"],
  });

export const domainRouter = router({
  whois: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      return await fetchWhois(input.domain);
    } catch (_err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "WHOIS lookup failed",
      });
    }
  }),
  dns: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      return await resolveAll(input.domain);
    } catch (_err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DNS resolution failed",
      });
    }
  }),
  hosting: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      return await detectHosting(input.domain);
    } catch (_err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Hosting detection failed",
      });
    }
  }),
  certificates: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      return await getCertificates(input.domain);
    } catch (_err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Certificate fetch failed",
      });
    }
  }),
  headers: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      const res = await probeHeaders(input.domain);
      return res.headers;
    } catch (_err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Header probe failed",
      });
    }
  }),
});
