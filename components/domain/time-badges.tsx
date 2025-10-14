"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { ClockFading } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTtl } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RelativeExpiryBadge({
  to,
  dangerDays = 7,
  warnDays = 30,
  className,
}: {
  /** ISO date string */ to: string;
  /** days threshold for red (imminent) */
  dangerDays?: number;
  /** days threshold for yellow (soon) */
  warnDays?: number;
  /** className applied to the wrapper span */
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState<"danger" | "warn" | "ok" | null>(null);

  useEffect(() => {
    try {
      const target = new Date(to);
      const now = new Date();
      const rel = formatDistanceToNowStrict(target, { addSuffix: true });
      const ms = target.getTime() - now.getTime();
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
      let s: "danger" | "warn" | "ok" = "ok";
      if (days <= dangerDays) s = "danger";
      else if (days <= warnDays) s = "warn";
      setText(rel);
      setStatus(s);
    } catch {
      // ignore
    }
  }, [to, dangerDays, warnDays]);

  if (!text) return null;

  const colorClass =
    status === "danger"
      ? "text-red-600 dark:text-red-400"
      : status === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  return <span className={cn(colorClass, className)}>({text})</span>;
}

export function TtlTimeBadge({ ttl }: { ttl: number }) {
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
