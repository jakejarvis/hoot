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
    <div className="flex min-w-0 items-center gap-1.5 truncate text-[13px] text-foreground/95 leading-[1.2]">
      {leading}
      <span ref={valueRef} className="block min-w-0 flex-1 truncate">
        {value}
      </span>
    </div>
  );

  if (suffix) {
    return (
      <div className="flex min-w-0 items-center gap-[6px]">
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent
            className={cn(
              isTruncated
                ? "max-w-[80vw] whitespace-pre-wrap break-words md:max-w-[40rem]"
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
            ? "max-w-[80vw] whitespace-pre-wrap break-words md:max-w-[40rem]"
            : "hidden",
        )}
      >
        {value}
      </TooltipContent>
    </Tooltip>
  );
}
