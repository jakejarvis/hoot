"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidDomain, normalizeDomainInput } from "@/lib/domain";
import { Favicon } from "./favicon";

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
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const stored = localStorage.getItem("hoot-history");
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  // History is now updated post-lookup in DomainReportView after a confirmed registered WHOIS.
  // We keep rendering from localStorage here for convenience.

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = domainSchema.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues?.[0];
      toast.error(issue?.message ?? "Invalid domain");
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    router.push(`/${encodeURIComponent(parsed.data)}`);
  }

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
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="domain"
            ref={inputRef}
            type="url"
            autoComplete="off"
            placeholder="hoot.sh"
            aria-invalid={false}
            aria-describedby="domain-help"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pl-9 h-12"
          />
          <span id="domain-help" className="sr-only">
            Enter a domain.
          </span>
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

      {showHistory && history.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {history.map((d) => (
            <Button
              key={d}
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/${encodeURIComponent(d)}`)}
            >
              <span className="inline-flex items-center gap-2">
                <Favicon domain={d} size={14} className="rounded" />
                {d}
              </span>
            </Button>
          ))}
        </div>
      )}
    </>
  );
}
