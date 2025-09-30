type DnsGroupColor =
  | "blue"
  | "cyan"
  | "green"
  | "orange"
  | "purple"
  | "indigo"
  | "slate";

export function DnsGroup({
  title,
  children,
  color = "slate",
  count,
}: {
  title: string;
  children: React.ReactNode;
  color?: DnsGroupColor;
  count?: number;
}) {
  const actualCount = count ?? (Array.isArray(children) ? children.length : 1);
  if (actualCount === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
          {title}
        </div>
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]`}
          style={
            {
              color: `var(--accent-${color})`,
              background: `color-mix(in oklch, var(--accent-${color}) 18%, transparent)`,
            } as React.CSSProperties
          }
        >
          {actualCount}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}
