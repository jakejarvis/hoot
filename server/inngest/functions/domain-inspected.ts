import "server-only";
import { type Section, SectionEnum } from "@/lib/schemas";
import { inngest } from "@/server/inngest/client";

export const domainInspected = inngest.createFunction(
  { id: "domain-inspected" },
  { event: "domain/inspected" },
  async ({ step, event }) => {
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
    for (const section of sections) {
      await step.sendEvent("enqueue-section", {
        name: "section/revalidate",
        data: {
          domain: typeof domain === "string" ? domain.trim().toLowerCase() : "",
          section,
        },
      });
    }
  },
);
