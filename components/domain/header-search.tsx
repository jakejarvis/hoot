"use client";

import { Search } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { isValidDomain, normalizeDomainInput } from "@/lib/domain";

/**
 * Compact search input for the app header.
 * - Prefills from current `[domain]` route when present
 * - Navigates on Enter to `/{domain}` after normalization/validation
 * - Focus shortcut: ⌘K / Ctrl+K
 */
export function HeaderSearch() {
  const router = useRouter();
  const params = useParams<{ domain?: string }>();

  const initial = React.useMemo(() => {
    const raw = params?.domain ? decodeURIComponent(params.domain) : "";
    const normalized = normalizeDomainInput(raw);
    return normalized;
  }, [params?.domain]);

  const [value, setValue] = React.useState<string>(initial);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setValue(initial);
  }, [initial]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit() {
    const normalized = normalizeDomainInput(value);
    if (!isValidDomain(normalized)) {
      // Do nothing on invalid input in header; users can refine inline.
      return;
    }
    router.push(`/${encodeURIComponent(normalized)}`);
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="relative">
        <Search
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Search any domain"
          className="h-10 sm:h-11 pl-9 pr-14 rounded-xl"
          aria-label="Search domains"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground invisible sm:visible">
          ⌘ K
        </kbd>
      </div>
    </div>
  );
}
