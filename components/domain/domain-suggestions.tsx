"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { captureClient } from "@/lib/analytics/client";
import { Favicon } from "./favicon";

const DEFAULT_SUGGESTIONS = [
  "google.com",
  "wikipedia.org",
  "github.com",
  "cloudflare.com",
  "producthunt.com",
];

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

  const [history, setHistory] = React.useState<string[]>([]);
  const [historyLoaded, setHistoryLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("hoot-history");
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore parse errors
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  const suggestions = React.useMemo(() => {
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

  const wrapperClasses =
    "mt-3 flex flex-wrap gap-2 justify-center" +
    (className ? ` ${className}` : "");
  const invisibleClass = historyLoaded ? undefined : "invisible";

  return (
    <div className={wrapperClasses}>
      {(historyLoaded ? suggestions : DEFAULT_SUGGESTIONS).map((domain) => (
        <Button
          key={domain}
          variant="secondary"
          size="sm"
          className={invisibleClass}
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

export const __DEFAULT_SUGGESTIONS = DEFAULT_SUGGESTIONS;
