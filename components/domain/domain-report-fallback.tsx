import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTION_DEFS } from "./sections/sections-meta";

export function DomainReportFallback() {
  const sections = [
    SECTION_DEFS.registration,
    SECTION_DEFS.hosting,
    SECTION_DEFS.dns,
    SECTION_DEFS.certificates,
    SECTION_DEFS.headers,
    SECTION_DEFS.seo,
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Header row matching DomainLoadingState */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Sections matching Section header visuals */}
      <div className="space-y-4">
        {sections.map(({ title, accent, Icon }) => (
          <div
            key={title}
            className="relative overflow-hidden bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 py-0 rounded-3xl border border-black/10 dark:border-white/10 shadow-[0_8px_30px_rgb(0_0_0_/_0.12)]"
            data-accent={accent}
          >
            {/* Accent glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-8 -top-8 h-24 blur-2xl opacity-30 accent-glow"
            />
            <div className="relative">
              {/* Header row */}
              <div className="px-5 py-4">
                <div className="flex w-full items-center gap-3 text-left">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground/80">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="gap-2 flex items-center leading-none font-semibold">
                      <span className="text-base">{title}</span>
                    </div>
                    <div className="sr-only">Loading…</div>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {/* Loading status */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
