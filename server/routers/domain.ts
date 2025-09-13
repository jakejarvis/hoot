import { z } from "zod"
import { publicProcedure, router } from "../trpc"
import { TRPCError } from "@trpc/server"
import { generateMockReport } from "@/lib/mock"
import { resolveAll } from "../services/dns"
import { probeHeaders } from "../services/headers"
import { fetchWhois } from "../services/rdap"
import { detectHosting } from "../services/hosting"
import { getCertificates } from "../services/tls"

const domainInput = z.object({ domain: z.string().min(1) })

export const domainRouter = router({
  whois: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      return await fetchWhois(input.domain)
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WHOIS lookup failed" })
    }
  }),
  dns: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      return await resolveAll(input.domain)
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DNS resolution failed" })
    }
  }),
  hosting: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      return await detectHosting(input.domain)
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Hosting detection failed" })
    }
  }),
  certificates: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      return await getCertificates(input.domain)
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Certificate fetch failed" })
    }
  }),
  headers: publicProcedure.input(domainInput).query(async ({ input }) => {
    try {
      const res = await probeHeaders(input.domain)
      return res.headers
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Header probe failed" })
    }
  }),
})

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}


