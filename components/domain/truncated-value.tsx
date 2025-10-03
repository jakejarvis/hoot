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
  const adornmentClass =
    "block shrink-0 [&>svg]:h-[1em] [&>svg]:w-[1em] [&>img]:h-[1em] [&>img]:w-[1em]";

  const withTooltip = (
    <div className="flex min-w-0 items-center gap-2 truncate text-[13px] text-foreground/95 leading-[1.2]">
      {leading ? <span className={adornmentClass}>{leading}</span> : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <span ref={valueRef} className="block min-w-0 flex-1 truncate">
            {value}
          </span>
        </TooltipTrigger>
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
      {suffix ? <span className={adornmentClass}>{suffix}</span> : null}
    </div>
  );

  return withTooltip;
}
