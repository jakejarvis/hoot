"use client";

import { ClockFading } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTtl } from "@/lib/format";

export function TtlBadge({ ttl }: { ttl: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-default text-[11px] text-muted-foreground"
        >
          <ClockFading />
          {formatTtl(ttl)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-mono">{ttl}</span>
      </TooltipContent>
    </Tooltip>
  );
}
