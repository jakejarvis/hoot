"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function KeyValue({
  label,
  value,
  copyable,
  leading,
  highlight,
}: {
  label?: string;
  value: string;
  copyable?: boolean;
  leading?: React.ReactNode;
  highlight?: boolean;
}) {
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);
  const recalcTruncation = useCallback(() => {
    const element = valueRef.current;
    if (!element) return;
    setIsTruncated(element.scrollWidth > element.clientWidth);
  }, []);

  useEffect(() => {
    const element = valueRef.current;
    if (!element) return;

    // Initial check after layout
    const raf = requestAnimationFrame(recalcTruncation);

    // Observe size changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => recalcTruncation());
      resizeObserver.observe(element);
    }

    // Observe text/content changes
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => recalcTruncation());
      mutationObserver.observe(element, {
        subtree: true,
        characterData: true,
        childList: true,
      });
    }

    // Also listen for window resizes
    window.addEventListener("resize", recalcTruncation);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", recalcTruncation);
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
    };
  }, [recalcTruncation]);

  // Mutation/resize observers will keep this in sync; no interactive handlers required.

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border bg-background/40 backdrop-blur-lg px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] min-w-0",
        highlight
          ? "border-purple-500/20 dark:border-purple-500/20 bg-purple-500/5 shadow-[inset_0_1px_0_rgba(168,85,247,0.18)]"
          : "border-white/12 dark:border-white/10",
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
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-[13px] leading-[1.2] text-foreground/95 flex items-center gap-[5px] min-w-0 truncate">
              {leading}
              <span ref={valueRef} className="truncate flex-1 min-w-0 block">
                {value}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            className={cn(
              isTruncated
                ? "max-w-[80vw] md:max-w-[40rem] break-words whitespace-pre-wrap"
                : "hidden",
            )}
          >
            {value}
          </TooltipContent>
        </Tooltip>
      </div>
      {copyable && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-7 px-2 bg-background/50 backdrop-blur border-white/20 dark:border-white/10"
          aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Copied");
            setCopied(true);
            if (resetTimerRef.current) {
              window.clearTimeout(resetTimerRef.current);
            }
            resetTimerRef.current = window.setTimeout(() => {
              setCopied(false);
              resetTimerRef.current = null;
            }, 1200);
          }}
        >
          {copied ? (
            <Check className="mr-1 h-3.5 w-3.5" />
          ) : (
            <Copy className="mr-1 h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      )}
    </div>
  );
}
