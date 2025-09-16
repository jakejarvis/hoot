"use client";

import { Globe } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Favicon({
  domain,
  size = 16,
  className,
}: {
  domain: string;
  size?: number;
  className?: string;
}) {
  const apiUrl = React.useMemo(
    () => `/api/favicon?domain=${encodeURIComponent(domain)}`,
    [domain],
  );
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const failed = failedUrl === apiUrl;

  if (failed) {
    return (
      <Globe
        className={cn("text-muted-foreground", className)}
        width={size}
        height={size}
      />
    );
  }

  return (
    <Image
      src={apiUrl}
      alt="Favicon"
      width={size}
      height={size}
      className={className}
      unoptimized
      onError={() => setFailedUrl(apiUrl)}
    />
  );
}
