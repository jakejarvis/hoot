"use client";

import { redirect } from "next/navigation";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { useSession } from "@/lib/auth/client";

export default function SettingsPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-96 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/login?redirect=/settings");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your account and notification preferences
          </p>
        </div>

        <SettingsLayout />
      </div>
    </div>
  );
}
