import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = useCallback(async (text: string) => {
    if (!("clipboard" in navigator) || !window.isSecureContext) {
      throw new Error("Clipboard unavailable in this context");
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
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
  }, []);

  return [copiedText, copy];
}
