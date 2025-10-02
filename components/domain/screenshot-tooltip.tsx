"use client";

import { useState } from "react";
import { Screenshot } from "@/components/domain/screenshot";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ScreenshotTooltip({
  domain,
  children,
}: {
  domain: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  return (
    <Tooltip
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setHasOpened(true);
      }}
    >
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        sideOffset={10}
        className="border bg-popover p-0 text-popover-foreground shadow-xl"
        hideArrow
      >
        <div className="w-[300px] sm:w-[360px] md:w-[420px]">
          <Screenshot
            domain={domain}
            enabled={hasOpened}
            aspectClassName="aspect-[4/2.1]"
          />
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
