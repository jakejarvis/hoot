import { Info, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTION_DEFS, SECTION_ORDER } from "@/lib/sections-meta";

export function DomainReportFallback() {
  return (
    <div className="fade-in slide-in-from-bottom-2 animate-in space-y-4">
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
        {SECTION_ORDER.map((key) => {
          const { title, accent, icon: Icon, help } = SECTION_DEFS[key];
          return (
            <div
              key={title}
              className="relative overflow-hidden rounded-3xl border border-black/10 bg-background/60 py-0 shadow-2xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 dark:border-white/10"
              data-accent={accent}
            >
              {/* Accent glow */}
              <div
                aria-hidden
                className="-inset-x-8 -top-8 pointer-events-none absolute h-24 accent-glow opacity-30 blur-2xl"
              />
              <div className="relative">
                {/* Header row */}
                <div className="px-5 py-4">
                  <div className="flex w-full items-center gap-3 text-left opacity-50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground/80">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-semibold leading-none">
                        <span className="text-base">{title}</span>
                        {help ? (
                          <span
                            role="img"
                            aria-label={`More info about ${title}`}
                          >
                            <Info
                              className="h-3.5 w-3.5 opacity-60"
                              aria-hidden
                            />
                          </span>
                        ) : null}
                      </div>
                      <div className="sr-only">Loading…</div>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      {/* Loading status */}
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
