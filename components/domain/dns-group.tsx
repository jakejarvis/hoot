import * as React from "react";

type DnsGroupColor =
  | "slate"
  | "blue"
  | "cyan"
  | "green"
  | "orange"
  | "purple"
  | "indigo";

export function DnsGroup({
  title,
  children,
  color = "slate",
  chart,
}: {
  title: string;
  children: React.ReactNode;
  color?: DnsGroupColor;
  chart?: 1 | 2 | 3 | 4 | 5;
}) {
  const count = React.Children.count(children);
  if (count === 0) return null;
  const chartVar =
    chart === 1
      ? "--dns-a"
      : chart === 2
        ? "--dns-aaaa"
        : chart === 3
          ? "--dns-mx"
          : chart === 4
            ? "--dns-cname"
            : chart === 5
              ? "--dns-txt"
              : undefined;
  const colorClass =
    color === "blue"
      ? "bg-blue-500/15 text-blue-400 dark:text-blue-300"
      : color === "cyan"
        ? "bg-cyan-500/15 text-cyan-400 dark:text-cyan-300"
        : color === "green"
          ? "bg-green-500/15 text-green-400 dark:text-green-300"
          : color === "orange"
            ? "bg-orange-500/15 text-orange-400 dark:text-orange-300"
            : color === "purple"
              ? "bg-purple-500/15 text-purple-400 dark:text-purple-300"
              : color === "indigo"
                ? "bg-indigo-500/15 text-indigo-400 dark:text-indigo-300"
                : "bg-foreground/10 text-foreground/80";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-[11px] uppercase tracking-[0.08em] text-foreground/70 dark:text-foreground/80">
          {title}
        </div>
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] px-1.5 ${chartVar ? "" : colorClass}`}
          style={
            chartVar
              ? ({
                  color: `var(${chartVar})`,
                  background: `color-mix(in oklch, var(${chartVar}) 18%, transparent)`,
                } as React.CSSProperties)
              : undefined
          }
        >
          {count}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
    </div>
  );
}
