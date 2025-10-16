import "server-only";
import { acquireLockOrWaitForResult } from "@/lib/cache";
import { ns } from "@/lib/redis";
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

export const sectionRevalidate = inngest.createFunction(
  { id: "section-revalidate" },
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
      switch (section) {
        case "dns":
          await resolveAll(domain);
          break;
        case "headers":
          await probeHeaders(domain);
          break;
        case "hosting":
          await detectHosting(domain);
          break;
        case "certificates":
          await getCertificates(domain);
          break;
        case "seo":
          await getSeo(domain);
          break;
        case "registration":
          await getRegistration(domain);
          break;
      }
    } finally {
      // release by deleting the lock
    }
  },
);
