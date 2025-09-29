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
  const { data, isLoading } = useQuery(
    trpc.domain.favicon.queryOptions(
      { domain },
      {
        staleTime: 60 * 60_000, // 1 hour
        placeholderData: (prev) => prev,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );
  const url = data?.url ?? null;

  if (isLoading) {
    return (
      <Skeleton
        className={cn("inline-block bg-input", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!isLoading && !url) {
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
      src={
        url ??
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
      }
      alt="Favicon"
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}
