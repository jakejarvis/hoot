"use client";

import { useQuery } from "@tanstack/react-query";
import { PackagePlus } from "lucide-react";
import { AddDomainButton } from "@/components/dashboard/add-domain-button";
import { DomainCard } from "@/components/dashboard/domain-card";
import { DomainCardSkeleton } from "@/components/dashboard/domain-card-skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useTRPC } from "@/lib/trpc/client";

export function DomainList() {
  const trpc = useTRPC();

  const {
    data: domains,
    isPending,
    isError,
  } = useQuery(trpc.domains.list.queryOptions());

  // Loading state with skeletons
  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <DomainCardSkeleton />
          <DomainCardSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackagePlus />
          </EmptyMedia>
          <EmptyTitle>Failed to load domains</EmptyTitle>
          <EmptyDescription>
            There was an error loading your domains. Please try again.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Empty state
  if (!domains || domains.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackagePlus />
          </EmptyMedia>
          <EmptyTitle>No domains yet</EmptyTitle>
          <EmptyDescription>
            Add your first domain to start monitoring registrations,
            certificates, and get notified of important changes.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <AddDomainButton />
        </EmptyContent>
      </Empty>
    );
  }

  // Loaded state
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddDomainButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {domains.map((item) => (
          <DomainCard key={item.id} domain={item} />
        ))}
      </div>
    </div>
  );
}
