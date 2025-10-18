import "server-only";
import { z } from "zod";
import { acquireLockOrWaitForResult } from "@/lib/cache";
import { ns, redis } from "@/lib/redis";
import { type Section, SectionEnum } from "@/lib/schemas";
import { inngest } from "@/server/inngest/client";
import { getCertificates } from "@/server/services/certificates";
import { resolveAll } from "@/server/services/dns";
import { probeHeaders } from "@/server/services/headers";
import { detectHosting } from "@/server/services/hosting";
import { getRegistration } from "@/server/services/registration";
import { getSeo } from "@/server/services/seo";

const eventDataSchema = z.object({
  domain: z.string().min(1),
  section: SectionEnum.optional(),
  sections: z.array(SectionEnum).optional(),
});

export async function revalidateSection(
  domain: string,
  section: Section,
): Promise<void> {
  switch (section) {
    case "dns":
      await resolveAll(domain);
      return;
    case "headers":
      await probeHeaders(domain);
      return;
    case "hosting":
      await detectHosting(domain);
      return;
    case "certificates":
      await getCertificates(domain);
      return;
    case "seo":
      await getSeo(domain);
      return;
    case "registration":
      await getRegistration(domain);
      return;
  }
}

export const sectionRevalidate = inngest.createFunction(
  {
    id: "section-revalidate",
    concurrency: {
      key: "event.data.domain",
      limit: 1,
    },
  },
  { event: "section/revalidate" },
  async ({ event }) => {
    const data = eventDataSchema.parse(event.data);
    const domain = data.domain;
    const normalizedDomain =
      typeof domain === "string" ? domain.trim().toLowerCase() : "";

    const sections: Section[] = Array.isArray(data.sections)
      ? data.sections
      : data.section
        ? [data.section]
        : [];

    if (sections.length === 0) return;

    for (const section of sections) {
      const lockKey = ns("lock", "revalidate", section, normalizedDomain);
      const resultKey = ns("result", "revalidate", section, normalizedDomain);
      const wait = await acquireLockOrWaitForResult({
        lockKey,
        resultKey,
        lockTtl: 60,
      });
      if (!wait.acquired) continue;
      try {
        await revalidateSection(normalizedDomain, section);
        try {
          await redis.set(
            resultKey,
            JSON.stringify({ completedAt: Date.now() }),
            { ex: 55 },
          );
        } catch {}
      } finally {
        try {
          await redis.del(lockKey);
        } catch {}
      }
    }
  },
);
