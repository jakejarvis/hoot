"use client";

import { Globe } from "lucide-react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
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
  const { data, isLoading } = trpc.domain.faviconUrl.useQuery({ domain });
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
