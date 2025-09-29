"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { captureClient } from "@/lib/analytics/client";
import { isValidDomain, normalizeDomainInput } from "@/lib/domain";

const domainSchema = z
  .string()
  .transform((v) => normalizeDomainInput(v))
  .refine((v) => isValidDomain(v), {
    message: "Please enter a valid domain.",
  });

type Source = "form" | "header" | "suggestion";

export type UseDomainSearchOptions = {
  initialValue?: string;
  source?: Exclude<Source, "suggestion">;
  showInvalidToast?: boolean;
  enableShortcut?: boolean;
  shortcutKey?: string; // default: "k"
  prefillFromRoute?: boolean;
};

export function useDomainSearch(options: UseDomainSearchOptions = {}) {
  const {
    initialValue = "",
    source = "form",
    showInvalidToast = false,
    enableShortcut = false,
    shortcutKey = "k",
    prefillFromRoute = false,
  } = options;

  const router = useRouter();
  const params = useParams<{ domain?: string }>();

  const derivedInitial = useMemo(() => {
    if (prefillFromRoute) {
      const raw = params?.domain ? decodeURIComponent(params.domain) : "";
      return normalizeDomainInput(raw);
    }
    return normalizeDomainInput(initialValue);
  }, [prefillFromRoute, params?.domain, initialValue]);

  const [value, setValue] = useState<string>(derivedInitial);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(derivedInitial);

    // Also reset loading on navigation so inputs/buttons re-enable in header variant
    setLoading(false);
  }, [derivedInitial]);

  // Optional keyboard shortcut to focus the input (e.g., ⌘/Ctrl + K)
  useEffect(() => {
    if (!enableShortcut) return;
    function onKey(e: KeyboardEvent) {
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === shortcutKey || e.key === shortcutKey.toUpperCase())
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableShortcut, shortcutKey]);

  function navigateToDomain(domain: string, navigateSource: Source = source) {
    captureClient("search_submitted", { domain, source: navigateSource });
    setLoading(true);
    router.push(`/${encodeURIComponent(domain)}`);
  }

  function submit() {
    const parsed = domainSchema.safeParse(value);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0] as
        | { code?: string; message?: string }
        | undefined;
      captureClient("search_invalid_input", {
        reason: firstIssue?.code ?? "invalid",
        value_length: value.length,
      });
      if (showInvalidToast) {
        const friendlyMessage =
          firstIssue?.message ?? "Please enter a valid domain.";
        toast.error(friendlyMessage);
        inputRef.current?.focus();
      }
      return;
    }
    navigateToDomain(parsed.data, source);
  }

  return {
    value,
    setValue,
    loading,
    inputRef,
    submit,
    navigateToDomain,
  } as const;
}
