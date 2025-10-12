"use client";

import { useQuery } from "@tanstack/react-query";
import { PorkbunIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export function DomainPricingCTASkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <Skeleton className="mt-1 h-3 w-20" aria-hidden />
      <Skeleton className="mt-3 h-8 w-48" aria-hidden />
      <Skeleton className="mt-7 mb-1 h-3 w-64" aria-hidden />
    </div>
  );
}

export function DomainPricingCTA({
  domain,
  className,
}: {
  domain: string;
  className?: string;
}) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.domain.pricing.queryOptions(
      { domain },
      {
        enabled: !!domain,
        staleTime: 7 * 24 * 60 * 60 * 1000,
        placeholderData: (prev) => prev,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ),
  );

  if (isLoading) {
    return <DomainPricingCTASkeleton className={className} />;
  }

  const priceString = data?.price ?? null;
  if (!priceString) return null;

  const price = ((value: string) => {
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return null;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  })(priceString);

  if (!price) return null;

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <p className="mb-2 text-[13px] text-muted-foreground">…until now?</p>

      <Button variant="outline" asChild>
        <a
          href={`https://porkbun.com/checkout/search?q=${domain}`}
          target="_blank"
          rel="noopener"
          aria-label="Register this domain"
          className="flex items-center gap-2"
        >
          <span className="rounded-full bg-white">
            <PorkbunIcon className="size-5" />
          </span>

          <span>
            <span className="text-foreground/85">
              .{domain.split(".").slice(1).join(".")} from
            </span>{" "}
            <span className="font-semibold">{price}</span>
            <span className="text-muted-foreground text-xs">/year</span>
          </span>
        </a>
      </Button>

      <p className="mt-6 text-muted-foreground text-xs">
        This is not an affiliate link, but it{" "}
        <a
          href="https://jarv.is/contact"
          target="_blank"
          rel="noopener"
          className="text-foreground/85 underline underline-offset-2 hover:text-foreground/60"
        >
          might be
        </a>{" "}
        in the future!
      </p>
    </div>
  );
}
