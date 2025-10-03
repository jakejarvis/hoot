"use client";

import { Globe, Loader2, Search as SearchIcon } from "lucide-react";
import { useRef } from "react";
import { DomainSuggestions } from "@/components/domain/domain-suggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  // Select all on first focus (click or Cmd+K), but allow precise cursor placement on the next click.
  const pointerDownRef = useRef(false);
  const didSelectOnFocusRef = useRef(false);

  function handlePointerDown() {
    if (variant !== "sm") return;
    pointerDownRef.current = true;
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.select();
    // Only block the immediate mouseup if the focus came from a pointer
    // (so Cmd+K focus won't require an extra click to place the caret).
    if (pointerDownRef.current) {
      didSelectOnFocusRef.current = true;
    }
    pointerDownRef.current = false;
  }

  function handleMouseUp(e: React.MouseEvent<HTMLInputElement>) {
    if (didSelectOnFocusRef.current) {
      e.preventDefault();
      didSelectOnFocusRef.current = false;
    }
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
            onMouseUp={handleMouseUp}
            className={cn(
              "pl-9",
              variant === "lg" ? "h-12" : "h-10 rounded-xl sm:pr-14",
            )}
          />

          {variant === "sm" && (
            <kbd className="-translate-y-1/2 pointer-events-none invisible absolute top-1/2 right-2 select-none rounded-md border bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground sm:visible">
              ⌘ K
            </kbd>
          )}
        </div>

        {variant === "lg" ? (
          <Button type="submit" disabled={loading} size="lg" className="h-12">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SearchIcon className="size-4" />
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
