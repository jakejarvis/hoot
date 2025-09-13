import { z } from "zod"
import { publicProcedure, router } from "../trpc"
import { generateMockReport } from "@/lib/mock"

const domainInput = z.object({ domain: z.string().min(1) })

export const domainRouter = router({
  whois: publicProcedure.input(domainInput).query(async ({ input }) => {
    await wait(350)
    const report = generateMockReport(input.domain)
    return report.whois
  }),
  dns: publicProcedure.input(domainInput).query(async ({ input }) => {
    await wait(500)
    const report = generateMockReport(input.domain)
    return report.dns
  }),
  hosting: publicProcedure.input(domainInput).query(async ({ input }) => {
    await wait(400)
    const report = generateMockReport(input.domain)
    return report.hosting
  }),
  certificates: publicProcedure.input(domainInput).query(async ({ input }) => {
    await wait(700)
    const report = generateMockReport(input.domain)
    return report.certificates
  }),
  headers: publicProcedure.input(domainInput).query(async ({ input }) => {
    await wait(300)
    const report = generateMockReport(input.domain)
    return report.headers
  }),
})

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}


