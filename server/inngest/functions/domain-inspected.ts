import "server-only";
import { inngest } from "@/server/inngest/client";

export const domainInspected = inngest.createFunction(
  { id: "domain-inspected" },
  { event: "domain/inspected" },
  async ({ step, event }) => {
    const { domain, sections } = event.data as {
      domain: string;
      sections?: string[];
    };
    const targets = sections ?? [
      "registration",
      "dns",
      "headers",
      "hosting",
      "certificates",
      "seo",
    ];
    for (const section of targets) {
      await step.sendEvent("enqueue-section", {
        name: "section/revalidate",
        data: {
          domain,
          domainNormalized:
            typeof domain === "string" ? domain.trim().toLowerCase() : "",
          section,
        },
      });
    }
  },
);
