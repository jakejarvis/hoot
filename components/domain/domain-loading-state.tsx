import { Accordion } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Section } from "./section";
import { SECTION_DEFS, SECTION_ORDER } from "./sections/sections-meta";

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
        {SECTION_ORDER.map((key) => {
          const def = SECTION_DEFS[key];
          const Icon = def.Icon;
          return (
            <Section
              key={def.title}
              title={def.title}
              description={def.description}
              help={def.help}
              icon={<Icon className="h-4 w-4" />}
              accent={def.accent}
              isLoading
            />
          );
        })}
      </Accordion>
    </div>
  );
}
