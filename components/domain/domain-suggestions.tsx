"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Favicon } from "@/components/domain/favicon";
import { Button } from "@/components/ui/button";
import { captureClient } from "@/lib/analytics/client";
import { DEFAULT_SUGGESTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function DomainSuggestions({
  onSelectAction,
  className,
  faviconSize = 16,
  max = 5,
}: {
  onSelectAction?: (domain: string) => void;
  className?: string;
  faviconSize?: number;
  max?: number;
}) {
  const router = useRouter();

  const [history, setHistory] = useState<string[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hoot-history");
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore parse errors
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  const suggestions = useMemo(() => {
    const merged = [
      ...history,
      ...DEFAULT_SUGGESTIONS.filter((d) => !history.includes(d)),
    ];
    return merged.slice(0, max);
  }, [history, max]);

  function handleClick(domain: string) {
    captureClient("search_suggestion_clicked", {
      domain,
      source: "suggestion",
    });
    if (onSelectAction) {
      onSelectAction(domain);
      return;
    }
    router.push(`/${encodeURIComponent(domain)}`);
  }

  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {(historyLoaded ? suggestions : DEFAULT_SUGGESTIONS).map((domain) => (
        <Button
          key={domain}
          variant="secondary"
          size="sm"
          className={cn(
            "cursor-pointer bg-muted/15 ring-1 ring-border/60 hover:bg-muted/50 dark:bg-muted/70 dark:hover:bg-muted/90",
            historyLoaded ? "visible" : "invisible",
          )}
          onClick={() => handleClick(domain)}
        >
          <span className="inline-flex items-center gap-2">
            <Favicon domain={domain} size={faviconSize} className="rounded" />
            {domain}
          </span>
        </Button>
      ))}
    </div>
  );
}
