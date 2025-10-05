"use client";

import { Globe, Search as SearchIcon } from "lucide-react";
import { useRef } from "react";
import { DomainSuggestions } from "@/components/domain/domain-suggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDomainSearch } from "@/hooks/use-domain-search";
import { cn } from "@/lib/utils";

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

  // Select all on first focus from keyboard or first click; allow precise cursor on next click.
  const pointerDownRef = useRef(false);
  const justFocusedRef = useRef(false);

  function handlePointerDown() {
    if (variant !== "sm") return;
    pointerDownRef.current = true;
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    // If focus came from keyboard (e.g., Cmd/Ctrl+K), select immediately
    // and allow the next click to place the caret precisely.
    if (!pointerDownRef.current) {
      e.currentTarget.select();
      justFocusedRef.current = false;
    } else {
      // For pointer-initiated focus, wait for the first click to select all
      // so double-click can still select a word normally.
      justFocusedRef.current = true;
      pointerDownRef.current = false;
    }
  }

  function handleClick(e: React.MouseEvent<HTMLInputElement>) {
    // Triple-click: select entire value explicitly.
    if (e.detail === 3) {
      e.currentTarget.select();
      justFocusedRef.current = false;
      return;
    }
    // If this is the very first click after pointer-focus, select all on single click.
    // Double-click (detail 2) will use the browser's default word selection.
    if (justFocusedRef.current && e.detail === 1) {
      e.currentTarget.select();
    }
    justFocusedRef.current = false;
  }

  return (
    <>
      <form
        aria-label="Domain search"
        className={
          variant === "lg"
            ? "relative flex items-center gap-2 rounded-xl border bg-background/60 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60"
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
              className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
              aria-hidden
            />
          ) : (
            <SearchIcon
              aria-hidden
              className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
            />
          )}
          <Input
            id="domain"
            ref={inputRef}
            autoFocus={variant === "lg"}
            inputMode="url"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={loading}
            placeholder={variant === "lg" ? "hoot.sh" : "Search any domain"}
            aria-label="Search any domain"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPointerDown={handlePointerDown}
            onFocus={handleFocus}
            onClick={handleClick}
            className={cn(
              "pl-9",
              variant === "lg" ? "h-12" : "h-10 rounded-xl sm:pr-14",
            )}
          />

          {variant === "sm" && (
            <kbd className="-translate-y-1/2 pointer-events-none invisible absolute top-1/2 right-2 select-none rounded-md border bg-muted/80 px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground sm:visible">
              ⌘ K
            </kbd>
          )}
        </div>

        {variant === "lg" ? (
          <Button type="submit" disabled={loading} size="lg" className="h-12">
            {loading ? <Spinner /> : <SearchIcon className="size-4" />}
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
