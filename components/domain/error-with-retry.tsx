"use client";

import { Button } from "@/components/ui/button";

export function ErrorWithRetry({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-sm text-destructive flex items-center gap-2">
      {message}
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
