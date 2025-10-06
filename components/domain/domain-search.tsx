"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DomainSuggestions } from "@/components/domain/domain-suggestions";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { useDomainSearch } from "@/hooks/use-domain-search";
import { useIsMac } from "@/hooks/use-is-mac";
import { cn } from "@/lib/utils";

export type DomainSearchVariant = "sm" | "lg";

export type DomainSearchProps = {
  variant?: DomainSearchVariant;
  initialValue?: string;
  showSuggestions?: boolean;
};

export function DomainSearch({
  variant = "lg",
  initialValue = "",
  showSuggestions = true,
}: DomainSearchProps) {
  const { value, setValue, loading, inputRef, submit, navigateToDomain } =
    useDomainSearch({
      initialValue,
      source: variant === "lg" ? "form" : "header",
      showInvalidToast: true,
      enableShortcut: variant === "sm", // header supports ⌘/Ctrl + K
      prefillFromRoute: variant === "sm", // header derives initial from route
    });

  const isMac = useIsMac();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    <div className="flex w-full flex-col gap-5">
      <form
        aria-label="Domain search"
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

        <div className="relative w-full flex-1">
          <InputGroup className={cn(variant === "lg" ? "h-12" : "h-10")}>
            <InputGroupInput
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
              className="relative top-px"
            />

            <InputGroupAddon>
              <Search />
            </InputGroupAddon>

            {variant === "sm" && (loading || mounted) && (
              <InputGroupAddon align="inline-end">
                {loading ? (
                  <Spinner />
                ) : (
                  <Kbd className="hidden border bg-muted/80 px-1.5 py-0.5 sm:inline-flex">
                    {isMac ? "⌘ K" : "Ctrl+K"}
                  </Kbd>
                )}
              </InputGroupAddon>
            )}

            {variant === "lg" && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="submit"
                  disabled={loading}
                  className="h-8"
                  variant="ghost"
                >
                  {loading ? (
                    <Spinner />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]">Analyze</span>
                      <Kbd className="hidden sm:inline-flex">⏎</Kbd>
                    </div>
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
      </form>

      {variant === "lg" && showSuggestions && (
        <DomainSuggestions
          onSelectAction={(d) => {
            // Mirror the selected domain in the input so the form
            // appears submitted while navigation is in-flight.
            setValue(d);
            navigateToDomain(d, "suggestion");
          }}
        />
      )}
    </div>
  );
}
