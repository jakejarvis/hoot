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
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  const { data, isPending } = useQuery(
    trpc.domain.favicon.queryOptions(
      { domain },
      {
        staleTime: 60 * 60_000, // 1 hour
        placeholderData: (prev) => prev,
      },
    ),
  );

  let child = null;
  if (!isHydrated || isPending) {
    child = (
      <Skeleton
        className={cn("bg-input", className)}
        style={{ width: size, height: size }}
      />
    );
  } else if (!data?.url) {
    child = (
      <Globe
        className={cn("text-muted-foreground", className)}
        width={size}
        height={size}
      />
    );
  } else {
    child = (
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

  return (
    <span style={{ display: "contents" }} suppressHydrationWarning>
      {child}
    </span>
  );
}
