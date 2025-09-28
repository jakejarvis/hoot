"use client";

import { Globe, Loader2, Search as SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDomainSearch } from "@/hooks/use-domain-search";
import { DomainSuggestions } from "./domain-suggestions";

export type DomainSearchVariant = "sm" | "lg";

export type DomainSearchProps = {
  variant?: DomainSearchVariant;
  initialValue?: string;
};

export function DomainSearch({
  variant = "lg",
  initialValue = "",
}: DomainSearchProps) {
  const { value, setValue, loading, inputRef, submit, navigateToDomain } =
    useDomainSearch({
      initialValue,
      source: variant === "lg" ? "form" : "header",
      showInvalidToast: true,
      enableShortcut: variant === "sm", // header supports ⌘/Ctrl + K
      prefillFromRoute: variant === "sm", // header derives initial from route
    });

  return (
    <>
      <form
        aria-label="Domain search"
        className={
          variant === "lg"
            ? "relative flex items-center gap-2 rounded-xl border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 shadow-sm"
            : undefined
        }
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {variant === "lg" && (
          <label htmlFor="domain" className="sr-only">
            Domain
          </label>
        )}

        <div className="relative flex-1">
          {variant === "lg" ? (
            <Globe
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          ) : (
            <SearchIcon
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
          )}
          <Input
            id="domain"
            ref={inputRef}
            inputMode="url"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={loading}
            placeholder={variant === "lg" ? "hoot.sh" : "Search any domain"}
            aria-describedby="domain-help"
            aria-label="Search domains"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={
              variant === "lg"
                ? "pl-9 h-12"
                : "h-10 sm:h-11 pl-9 pr-14 rounded-xl"
            }
          />

          {variant === "sm" && (
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground invisible sm:visible">
              ⌘ K
            </kbd>
          )}
        </div>

        {variant === "lg" ? (
          <Button type="submit" disabled={loading} size="lg" className="h-12">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SearchIcon className="h-4 w-4" />
            )}
            Analyze
          </Button>
        ) : (
          <button type="submit" disabled={loading} className="sr-only">
            Search
          </button>
        )}
      </form>

      {variant === "lg" && (
        <DomainSuggestions
          onSelectAction={(d) => {
            // Mirror the selected domain in the input so the form
            // appears submitted while navigation is in-flight.
            setValue(d);
            navigateToDomain(d, "suggestion");
          }}
        />
      )}
    </>
  );
}
