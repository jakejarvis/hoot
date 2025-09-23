"use client";

import { cn } from "@/lib/utils";
import { useTruncation } from "../../hooks/use-truncation";
import { CopyButton } from "./copy-button";
import { TruncatedValue } from "./truncated-value";

export function KeyValue({
  label,
  value,
  copyable,
  leading,
  highlight,
  trailing,
  suffix,
}: {
  label?: string;
  value: string;
  copyable?: boolean;
  leading?: React.ReactNode;
  highlight?: boolean;
  trailing?: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  const { valueRef, isTruncated } = useTruncation();

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border bg-background/40 backdrop-blur-lg px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] min-w-0",
        highlight
          ? "border-purple-500/20 dark:border-purple-500/20 bg-purple-500/5 shadow-[inset_0_1px_0_rgba(168,85,247,0.18)]"
          : "border-black/10 dark:border-white/10",
      )}
    >
      <div className="min-w-0 space-y-1">
        {label && (
          <div
            className={cn(
              "text-[10px] uppercase tracking-[0.08em]",
              highlight
                ? "text-purple-700/80 dark:text-purple-300/85"
                : "text-foreground/75 dark:text-foreground/80",
            )}
          >
            {label}
          </div>
        )}
        <TruncatedValue
          value={value}
          leading={leading}
          suffix={suffix}
          isTruncated={isTruncated}
          valueRef={valueRef}
        />
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {trailing}
        {copyable && <CopyButton value={value} label={label} />}
      </div>
    </div>
  );
}
