"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Screenshot } from "./screenshot";

export function ScreenshotTooltip({
  domain,
  children,
}: {
  domain: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [hasOpened, setHasOpened] = React.useState(false);

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
        className="bg-popover text-popover-foreground p-0 border shadow-xl"
        hideArrow
        forceMount
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
