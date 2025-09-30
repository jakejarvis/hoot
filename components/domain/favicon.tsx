"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import Image from "next/image";
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
  const { data, isPending } = useQuery(
    trpc.domain.favicon.queryOptions(
      { domain },
      {
        staleTime: 60 * 60_000, // 1 hour
        placeholderData: (prev) => prev,
      },
    ),
  );

  if (isPending) {
    return (
      <Skeleton
        className={cn("bg-input", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!data?.url) {
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
      src={data.url}
      alt={`${domain} icon`}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      unoptimized
      suppressHydrationWarning
    />
  );
}
