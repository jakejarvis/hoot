import { cn } from "@/lib/utils";

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

  const accentColorClass =
    color === "blue"
      ? "text-accent-blue bg-accent-blue/18"
      : color === "cyan"
        ? "text-accent-cyan bg-accent-cyan/18"
        : color === "green"
          ? "text-accent-green bg-accent-green/18"
          : color === "orange"
            ? "text-accent-orange bg-accent-orange/18"
            : color === "purple"
              ? "text-accent-purple bg-accent-purple/18"
              : color === "indigo"
                ? "text-accent-indigo bg-accent-indigo/18"
                : "text-accent-slate bg-accent-slate/18";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
          {title}
        </div>
        <span
          className={cn(
            `inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]`,
            accentColorClass,
          )}
        >
          {actualCount}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}
