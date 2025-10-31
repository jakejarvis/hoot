"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ExportButtonProps = {
  disabled?: boolean;
  onExportAction: () => void;
};

export function ExportButton({ disabled, onExportAction }: ExportButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={onExportAction}
          disabled={disabled}
        >
          <Download />
          <span className="hidden sm:inline-block">Export</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>
          Save this report as a <span className="font-mono">JSON</span> file.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
