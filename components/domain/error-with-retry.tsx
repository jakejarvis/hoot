"use client";

import { Button } from "@/components/ui/button";

export function ErrorWithRetry({
  message,
  onRetryAction,
}: {
  message: string;
  onRetryAction: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-destructive text-sm">
      {message}
      <Button variant="outline" size="sm" onClick={onRetryAction}>
        Retry
      </Button>
    </div>
  );
}
