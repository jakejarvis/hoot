"use client";

import { Milestone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function RedirectedAlert({
  domain,
  finalUrl,
  ...props
}: React.ComponentProps<typeof Alert> & {
  domain: string;
  finalUrl?: string | null;
}) {
  try {
    if (!finalUrl) return null;
    const dest = new URL(finalUrl).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
    const src = domain.replace(/^www\./i, "").toLowerCase();
    if (dest === src) return null;
    return (
      <Alert {...props}>
        <Milestone />
        <AlertTitle>We followed a redirect:</AlertTitle>
        <AlertDescription>
          {src} → {dest}
        </AlertDescription>
      </Alert>
    );
  } catch {
    return null;
  }
}
