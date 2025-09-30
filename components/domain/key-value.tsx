"use client";

import { CopyButton } from "@/components/domain/copy-button";
import { TruncatedValue } from "@/components/domain/truncated-value";
import { useTruncation } from "@/hooks/use-truncation";
import { cn } from "@/lib/utils";

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
        "flex h-16 min-w-0 items-center justify-between gap-4 rounded-2xl border bg-background/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-lg",
        highlight
          ? "border-purple-500/20 bg-purple-500/5 shadow-[inset_0_1px_0_rgba(168,85,247,0.18)] dark:border-purple-500/20"
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
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        {copyable && <CopyButton value={value} label={label} />}
      </div>
    </div>
  );
}
