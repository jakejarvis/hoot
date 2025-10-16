import "server-only";
import { acquireLockOrWaitForResult } from "@/lib/cache";
import { ns, redis } from "@/lib/redis";
import { inngest } from "@/server/inngest/client";
import { getCertificates } from "@/server/services/certificates";
import { resolveAll } from "@/server/services/dns";
import { probeHeaders } from "@/server/services/headers";
import { detectHosting } from "@/server/services/hosting";
import { getRegistration } from "@/server/services/registration";
import { getSeo } from "@/server/services/seo";

type Section =
  | "dns"
  | "headers"
  | "hosting"
  | "certificates"
  | "seo"
  | "registration";

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
    const { domain, section } = event.data as {
      domain: string;
      section: Section;
    };
    const lockKey = ns("lock", "revalidate", section, domain.toLowerCase());
    const wait = await acquireLockOrWaitForResult({
      lockKey,
      resultKey: lockKey,
      lockTtl: 60,
    });
    if (!wait.acquired) return;
    try {
      await revalidateSection(domain, section);
    } finally {
      try {
        await redis.del(lockKey);
      } catch {}
    }
  },
);
