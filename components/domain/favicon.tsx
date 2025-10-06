"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
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
  const trpc = useTRPC();
  const [isHydrated, setIsHydrated] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const { data, isPending } = useQuery(
    trpc.domain.favicon.queryOptions(
      { domain },
      {
        staleTime: 60 * 60_000, // 1 hour
        placeholderData: (prev) => prev,
        enabled: isHydrated,
      },
    ),
  );

  const url = data?.url ?? null;

  // Reset the fade-in state when the image URL changes to animate again
  // biome-ignore lint/correctness/useExhaustiveDependencies: this is intentional.
  useEffect(() => {
    setIsLoaded(false);
  }, [url]);

  if (!isHydrated || isPending) {
    return (
      <Skeleton
        className={cn("bg-input", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!url || failedUrl === url) {
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
      key={url}
      src={url}
      alt={`${domain} icon`}
      width={size}
      height={size}
      className={cn(
        className,
        "transition-opacity duration-200",
        isLoaded ? "opacity-100" : "opacity-0",
      )}
      loading="lazy"
      unoptimized
      onError={() => setFailedUrl(url)}
      onLoad={() => setIsLoaded(true)}
    />
  );
}
