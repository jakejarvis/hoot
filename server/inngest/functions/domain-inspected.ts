import "server-only";
import { type Section, SectionEnum } from "@/lib/schemas";
import { inngest } from "@/server/inngest/client";

export const domainInspected = inngest.createFunction(
  { id: "domain-inspected" },
  { event: "domain/inspected" },
  async ({ step, event, logger }) => {
    const { domain, sections: rawSections } = event.data as {
      domain: string;
      sections?: string[];
    };
    // Validate and filter sections
    const sections: Section[] = rawSections
      ? rawSections.filter((s): s is Section =>
          SectionEnum.options.includes(s as Section),
        )
      : [];
    if (sections.length === 0) {
      logger.debug("[domain-inspected] no valid sections to enqueue", {
        domain,
      });
      return;
    }
    for (const section of sections) {
      const normalizedDomain =
        typeof domain === "string" ? domain.trim().toLowerCase() : "";
      await step.sendEvent("enqueue-section", {
        name: "section/revalidate",
        data: { domain: normalizedDomain, section },
      });
      logger.info("[domain-inspected] enqueued section revalidation", {
        domain: normalizedDomain,
        section,
      });
    }
  },
);
