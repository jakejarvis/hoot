"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export function Screenshot({
  domain,
  enabled = true,
  className,
  caption,
  width = 1200,
  height = 630,
  imageClassName,
  aspectClassName = "aspect-[1200/630]",
}: {
  domain: string;
  enabled?: boolean;
  className?: string;
  caption?: string;
  width?: number;
  height?: number;
  imageClassName?: string;
  aspectClassName?: string;
}) {
  const trpc = useTRPC();
  const { data, isLoading, isFetching } = useQuery(
    trpc.domain.screenshot.queryOptions(
      { domain },
      {
        staleTime: 30 * 60_000,
        enabled,
      },
    ),
  );

  const url = data?.url ?? null;
  const loading = isLoading || isFetching;

  return (
    <div className={className}>
      {loading && (
        <div className="p-2">
          <div
            className={`w-full ${aspectClassName} rounded-md border bg-muted/50 flex items-center justify-center`}
          >
            <div
              className="flex items-center gap-2 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading screenshot...</span>
            </div>
          </div>
        </div>
      )}
      {!loading && url && (
        <div className="p-2">
          <Image
            src={url}
            alt={`Homepage preview of ${domain}`}
            width={width}
            height={height}
            className={cn(
              "rounded-md border h-auto w-full object-cover",
              aspectClassName,
              imageClassName,
            )}
            unoptimized
            priority={false}
          />
          {caption ? (
            <div className="px-1 pt-1 text-[10px] text-muted-foreground">
              {caption}
            </div>
          ) : null}
        </div>
      )}
      {!loading && !url && (
        <div className="p-4 text-xs text-muted-foreground">
          Unable to generate a preview.
        </div>
      )}
    </div>
  );
}
