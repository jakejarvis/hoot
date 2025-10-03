"use client";

import { useState } from "react";
import { Screenshot } from "@/components/domain/screenshot";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BrowserWindow } from "../browser-window";

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
        sideOffset={6}
        alignOffset={-12}
        className="bg-transparent"
        hideArrow
        align="start"
      >
        <div className="w-[300px] sm:w-[360px] md:w-[420px]">
          <BrowserWindow url={domain} className="h-auto w-full shadow-xl">
            <Screenshot domain={domain} enabled={hasOpened} />
          </BrowserWindow>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
