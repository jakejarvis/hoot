import { Accordion } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Section } from "./section";
import { SECTION_DEFS } from "./sections/sections-meta";

export function DomainLoadingState() {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      <Accordion type="multiple" className="space-y-4">
        <Section
          title={SECTION_DEFS.registration.title}
          description={SECTION_DEFS.registration.description}
          help={SECTION_DEFS.registration.help}
          icon={<SECTION_DEFS.registration.Icon className="h-4 w-4" />}
          accent={SECTION_DEFS.registration.accent}
          status="loading"
        />
        <Section
          title={SECTION_DEFS.hosting.title}
          description={SECTION_DEFS.hosting.description}
          help={SECTION_DEFS.hosting.help}
          icon={<SECTION_DEFS.hosting.Icon className="h-4 w-4" />}
          accent={SECTION_DEFS.hosting.accent}
          status="loading"
        />
        <Section
          title={SECTION_DEFS.dns.title}
          description={SECTION_DEFS.dns.description}
          help={SECTION_DEFS.dns.help}
          icon={<SECTION_DEFS.dns.Icon className="h-4 w-4" />}
          accent={SECTION_DEFS.dns.accent}
          status="loading"
        />
        <Section
          title={SECTION_DEFS.certificates.title}
          description={SECTION_DEFS.certificates.description}
          help={SECTION_DEFS.certificates.help}
          icon={<SECTION_DEFS.certificates.Icon className="h-4 w-4" />}
          accent={SECTION_DEFS.certificates.accent}
          status="loading"
        />
        <Section
          title={SECTION_DEFS.headers.title}
          description={SECTION_DEFS.headers.description}
          help={SECTION_DEFS.headers.help}
          icon={<SECTION_DEFS.headers.Icon className="h-4 w-4" />}
          accent={SECTION_DEFS.headers.accent}
          status="loading"
        />
        <Section
          title={SECTION_DEFS.seo.title}
          description={SECTION_DEFS.seo.description}
          help={SECTION_DEFS.seo.help}
          icon={<SECTION_DEFS.seo.Icon className="h-4 w-4" />}
          accent={SECTION_DEFS.seo.accent}
          status="loading"
        />
      </Accordion>
    </div>
  );
}
