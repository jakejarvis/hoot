import { Skeleton } from "@/components/ui/skeleton";

export function Skeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => {
        const key = `sk-${count}-${i}`;
        return (
          <div
            key={key}
            className="h-10 animate-pulse rounded-2xl bg-foreground/5 dark:bg-foreground/10"
          />
        );
      })}
    </div>
  );
}

export function KeyValueSkeleton({
  showLabel = true,
  withLeading = false,
  withTrailing = false,
  withSuffix = false,
  widthClass = "w-2/3",
}: {
  showLabel?: boolean;
  withLeading?: boolean;
  withTrailing?: boolean;
  withSuffix?: boolean;
  widthClass?: string;
}) {
  return (
    <div className="flex h-16 items-center justify-between gap-4 rounded-2xl border border-black/10 bg-background/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-lg dark:border-white/10">
      <div className="min-w-0 space-y-1">
        {showLabel && <Skeleton className="h-2 w-16" />}
        <div className="flex items-center gap-2">
          {withLeading && <Skeleton className="h-4 w-4 rounded" />}
          <Skeleton className={`h-4 ${widthClass}`} />
          {withSuffix && <Skeleton className="h-3 w-10" />}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {withTrailing && <Skeleton className="h-5 w-12 rounded" />}
      </div>
    </div>
  );
}

export function DnsGroupSkeleton({
  title,
  rows = 2,
}: {
  title: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
          {title}
        </div>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1.5 text-[10px] text-foreground/60">
          {rows}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from(
          { length: rows },
          () =>
            globalThis.crypto?.randomUUID?.() ??
            Math.random().toString(36).slice(2),
        ).map((id) => (
          <KeyValueSkeleton
            key={`dns-skel-${title}-${id}`}
            showLabel={false}
            withTrailing
            withSuffix
            widthClass="w-1/2"
          />
        ))}
      </div>
    </div>
  );
}

export function CertificateCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-background/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:border-white/10">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <KeyValueSkeleton showLabel widthClass="w-1/3" withLeading />
        <KeyValueSkeleton showLabel widthClass="w-2/3" />
        <KeyValueSkeleton showLabel widthClass="w-1/4" />
        <KeyValueSkeleton showLabel widthClass="w-1/4" withSuffix />
      </div>
    </div>
  );
}

export function HeadersSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Array.from(
        { length: rows },
        () =>
          globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(36).slice(2),
      ).map((id) => (
        <KeyValueSkeleton
          key={`hdr-skel-${id}`}
          showLabel
          widthClass="w-2/3"
          withTrailing
        />
      ))}
    </div>
  );
}
