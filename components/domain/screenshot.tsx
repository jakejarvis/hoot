"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleX } from "lucide-react";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import { useImageRetry } from "@/hooks/use-image-retry";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export function Screenshot({
  domain,
  enabled = true,
  className,
  width = 1200,
  height = 630,
  imageClassName,
  aspectClassName = "aspect-[1200/630]",
}: {
  domain: string;
  enabled?: boolean;
  className?: string;
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
        staleTime: 24 * 60 * 60_000, // 24h in ms
        retry: 5,
        enabled,
      },
    ),
  );

  const url = data?.url ?? null;
  const loading = isLoading || isFetching;
  const { imageKey, showFallback, handleError } = useImageRetry(url, {
    maxRetries: 2,
    delayMs: 300,
  });

  return (
    <div className={className}>
      {url && !showFallback ? (
        <Image
          key={imageKey}
          src={url}
          alt={`Homepage preview of ${domain}`}
          width={width}
          height={height}
          className={cn(
            "h-auto w-full object-cover",
            aspectClassName,
            imageClassName,
          )}
          unoptimized
          priority={false}
          draggable={false}
          onError={handleError}
        />
      ) : (
        <div
          className={`h-auto w-full ${aspectClassName} flex items-center justify-center bg-muted/50`}
        >
          <div
            className="flex items-center gap-2 text-muted-foreground text-xs"
            aria-live="polite"
          >
            {loading ? (
              <>
                <Spinner />
                <span>Loading screenshot...</span>
              </>
            ) : (
              <>
                <CircleX className="h-4 w-4" />
                <span>Unable to generate a screenshot.</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
