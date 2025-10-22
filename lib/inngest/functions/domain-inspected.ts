import "server-only";
import { inngest } from "@/lib/inngest/client";
import { scheduleImmediate } from "@/lib/schedule";
import { type Section, SectionEnum } from "@/lib/schemas";

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
      logger.debug("[domain-inspected] no valid sections to schedule", {
        domain,
      });
      return;
    }
    const normalizedDomain =
      typeof domain === "string" ? domain.trim().toLowerCase() : "";
    await step.run("schedule-sections", async () => {
      await scheduleImmediate(normalizedDomain, sections);
      logger.info("[domain-inspected] scheduled sections", {
        domain: normalizedDomain,
        sections,
      });
      return { domain: normalizedDomain, sections };
    });
  },
);
