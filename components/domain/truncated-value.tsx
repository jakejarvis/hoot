"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TruncatedValueProps {
  value: string;
  leading?: React.ReactNode;
  suffix?: React.ReactNode;
  isTruncated: boolean;
  valueRef: React.RefObject<HTMLSpanElement | null>;
  tooltipContent?: React.ReactNode;
}

export function TruncatedValue({
  value,
  leading,
  suffix,
  isTruncated,
  valueRef,
  tooltipContent,
}: TruncatedValueProps) {
  const shouldShowTooltip = isTruncated || tooltipContent != null;
  const content = (
    <div className="flex min-w-0 flex-row-reverse items-baseline gap-1.5 truncate text-[13px] text-foreground/95 leading-[1.2]">
      <span ref={valueRef} className="block min-w-0 flex-1 truncate">
        {value}
      </span>
      {leading ? (
        <span className="shrink-0 self-center leading-none">{leading}</span>
      ) : null}
    </div>
  );

  if (suffix) {
    return (
      <div className="flex min-w-0 items-baseline gap-[6px]">
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent
            className={cn(
              shouldShowTooltip
                ? "max-w-[80vw] whitespace-pre-wrap break-words md:max-w-[40rem]"
                : "hidden",
            )}
          >
            {tooltipContent ?? value}
          </TooltipContent>
        </Tooltip>
        <div className="shrink-0 self-baseline">{suffix}</div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent
        className={cn(
          shouldShowTooltip
            ? "max-w-[80vw] whitespace-pre-wrap break-words md:max-w-[40rem]"
            : "hidden",
        )}
      >
        {tooltipContent ?? value}
      </TooltipContent>
    </Tooltip>
  );
}
