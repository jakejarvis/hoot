"use client";

import { redirect } from "next/navigation";
import { DomainList } from "@/components/dashboard/domain-list";
import { useSession } from "@/lib/auth/client";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();

  // Show loading state while checking auth
  if (isPending) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-3xl tracking-tight">
              My Domains
            </h1>
            <p className="text-muted-foreground text-sm">
              Monitor and manage your verified domains
            </p>
          </div>
        </div>

        <DomainList />
      </div>
    </div>
  );
}
