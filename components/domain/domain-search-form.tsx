"use client";

import { Globe, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { captureClient } from "@/lib/analytics/client";
import { isValidDomain, normalizeDomainInput } from "@/lib/domain";
import { Favicon } from "./favicon";

const DEFAULT_SUGGESTIONS = [
  "google.com",
  "wikipedia.org",
  "github.com",
  "cloudflare.com",
  "producthunt.com",
];

const domainSchema = z
  .string()
  .transform((v) => normalizeDomainInput(v))
  .refine((v) => isValidDomain(v), {
    message: "Please enter a valid domain.",
  });

export function DomainSearchForm({
  initialValue = "",
  showHistory = true,
}: {
  initialValue?: string;
  showHistory?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialValue);
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const [historyLoaded, setHistoryLoaded] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Real-time validation state
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const isValidInput = React.useMemo(() => {
    if (!value.trim()) return true; // Empty is neutral
    const normalized = normalizeDomainInput(value);
    return isValidDomain(normalized);
  }, [value]);

  const showValidationError =
    hasInteracted && value.trim() !== "" && !isValidInput;

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

  // History is now updated post-lookup in DomainReportView after a confirmed registered WHOIS.
  // We keep rendering from localStorage here for convenience.

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = domainSchema.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues?.[0] as { code?: string } | undefined;
      captureClient("search_invalid_input", {
        reason: issue?.code ?? "invalid",
        value_length: value.length,
      });
      toast.error(parsed.error.message ?? "Invalid domain");
      inputRef.current?.focus();
      return;
    }
    captureClient("search_submitted", {
      domain: parsed.data,
      source: "form",
    });
    setLoading(true);
    router.push(`/${encodeURIComponent(parsed.data)}`);
  }

  const suggestedDomains = React.useMemo(() => {
    // Always provide 5 suggestions: recent history first, then defaults, de-duplicated
    const merged = [
      ...history,
      ...DEFAULT_SUGGESTIONS.filter((d) => !history.includes(d)),
    ];
    return merged.slice(0, 5);
  }, [history]);

  return (
    <>
      <form
        aria-label="Domain search"
        className="relative flex items-center gap-2 rounded-xl border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 shadow-sm"
        onSubmit={onSubmit}
      >
        <label htmlFor="domain" className="sr-only">
          Domain
        </label>
        <div className="relative flex-1">
          <Globe
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="domain"
            ref={inputRef}
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="hoot.sh"
            aria-invalid={showValidationError}
            aria-describedby={
              showValidationError ? "domain-error" : "domain-help"
            }
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (!hasInteracted) setHasInteracted(true);
            }}
            onBlur={() => setHasInteracted(true)}
            className="pl-9 h-12"
          />
          <span id="domain-help" className="sr-only">
            Enter a domain.
          </span>
          {showValidationError && (
            <span id="domain-error" className="sr-only">
              Please enter a valid domain name.
            </span>
          )}
        </div>
        <Button type="submit" disabled={loading} size="lg" className="h-12">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Analyze
        </Button>
      </form>

      {showHistory && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {(historyLoaded ? suggestedDomains : DEFAULT_SUGGESTIONS).map(
            (domain) => (
              <Button
                key={domain}
                variant="secondary"
                size="sm"
                className={historyLoaded ? undefined : "invisible"}
                onClick={() => {
                  captureClient("search_suggestion_clicked", {
                    domain,
                    source: "suggestion",
                  });
                  router.push(`/${encodeURIComponent(domain)}`);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Favicon domain={domain} size={16} className="rounded" />
                  {domain}
                </span>
              </Button>
            ),
          )}
        </div>
      )}
    </>
  );
}
