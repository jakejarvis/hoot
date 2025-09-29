"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import Image from "next/image";
import { useId } from "react";
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

  const compId = useId();

  if (isLoading) {
    return (
      <span>
        <Skeleton
          className={cn("inline-block bg-input", className)}
          style={{ width: size, height: size }}
          key={`favicon-${compId}`}
          id={`favicon-${compId}`}
        />
      </span>
    );
  }

  if (!url) {
    return (
      <span>
        <Globe
          className={cn("inline-block text-muted-foreground", className)}
          width={size}
          height={size}
          key={`favicon-${compId}`}
          id={`favicon-${compId}`}
        />
      </span>
    );
  }

  return (
    <span>
      <Image
        src={url}
        alt={`${domain} icon`}
        width={size}
        height={size}
        className={className}
        unoptimized
        key={`favicon-${compId}`}
        id={`favicon-${compId}`}
      />
    </span>
  );
}
