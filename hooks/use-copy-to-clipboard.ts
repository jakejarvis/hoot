import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface CopyOptions {
  /**
   * Whether to show a success toast notification.
   * @default true
   */
  showToast?: boolean;
}

type CopyFn = (text: string, options?: CopyOptions) => Promise<boolean>;

/**
 * Hook for copying text to clipboard with optional toast notifications.
 * Returns the last copied text and a copy function.
 *
 * @example
 * const [copiedText, copy] = useCopyToClipboard();
 * await copy("text to copy");
 * await copy("text to copy", { showToast: false });
 */
export function useCopyToClipboard(): [string | null, CopyFn] {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string, options?: CopyOptions): Promise<boolean> => {
      const { showToast = true } = options ?? {};

      if (!("clipboard" in navigator) || !window.isSecureContext) {
        toast.error("Clipboard unavailable", {
          description: "Clipboard is not available in this context.",
        });
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(text);
        if (showToast) {
          toast.success("Copied to clipboard");
        }
        return true;
      } catch (err) {
        console.error("Failed to copy text:", err);
        toast.error("Copy failed", {
          description:
            err instanceof Error ? err.message : "Try copying manually.",
        });
        setCopiedText(null);
        return false;
      }
    },
    [],
  );

  return [copiedText, copy];
}
