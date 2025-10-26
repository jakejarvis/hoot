"use client";

import { Check, ClipboardCheck, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { captureClient } from "@/lib/analytics/client";

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [, copy] = useCopyToClipboard();
  const resetTimerRef = useRef<number | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    const success = await copy(value, { showToast: false });
    if (success) {
      // Show custom toast
      toast.success("Copied!", {
        icon: <ClipboardCheck className="h-4 w-4" />,
        position: "bottom-center",
      });
      captureClient("copy_clicked", {
        label: label ?? null,
        value_length: value.length,
      });
      setCopied(true);
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 1200);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0 border-black/15 bg-background/50 backdrop-blur dark:border-white/10"
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      onClick={handleCopy}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}
