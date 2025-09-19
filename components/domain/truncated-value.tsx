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
}

export function TruncatedValue({
  value,
  leading,
  suffix,
  isTruncated,
  valueRef,
}: TruncatedValueProps) {
  const content = (
    <div className="text-[13px] leading-[1.2] text-foreground/95 flex items-center gap-[5px] min-w-0 truncate">
      {leading}
      <span ref={valueRef} className="truncate flex-1 min-w-0 block">
        {value}
      </span>
    </div>
  );

  if (suffix) {
    return (
      <div className="flex items-center gap-[6px] min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
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
        <div className="shrink-0">{suffix}</div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
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
  );
}
