"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Favicon } from "./favicon";

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (v) =>
      /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/.test(v),
    {
      message: "Enter a valid domain like example.com",
    },
  );

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

  function updateHistory(domain: string) {
    const next = [domain, ...history.filter((d) => d !== domain)].slice(0, 5);
    setHistory(next);
    localStorage.setItem("hoot-history", JSON.stringify(next));
  }

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
    updateHistory(parsed.data);
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
            inputMode="url"
            autoComplete="off"
            placeholder="example.com"
            aria-invalid={false}
            aria-describedby="domain-help"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pl-9 h-12"
          />
          <span id="domain-help" className="sr-only">
            Enter a domain like example.com
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="submit" disabled={loading} className="h-12 px-5">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Analyze
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start analysis</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </form>

      {showHistory && history.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
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
