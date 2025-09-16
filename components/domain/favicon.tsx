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
  const duckUrl = React.useMemo(
    () => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
    [domain],
  );
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const failed = failedUrl === duckUrl;

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
      src={duckUrl}
      alt="Favicon"
      width={size}
      height={size}
      className={className}
      onError={() => setFailedUrl(duckUrl)}
    />
  );
}
