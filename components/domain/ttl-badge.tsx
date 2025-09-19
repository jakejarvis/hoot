"use client";

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
        <Badge variant="secondary" title="Time to Live">
          {formatTtl(ttl)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-mono">{ttl}</span>
      </TooltipContent>
    </Tooltip>
  );
}
