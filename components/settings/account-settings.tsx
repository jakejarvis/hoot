"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/auth/client";
import { formatDate } from "@/lib/format";

export function AccountSettings() {
  const { data: session } = useSession();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!session?.user) return null;

  const { user } = session;

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your account details from authentication provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="text-muted-foreground text-sm">Email</div>
              <div className="font-medium">{user.email}</div>
            </div>

            {user.name && (
              <div className="space-y-1.5">
                <div className="text-muted-foreground text-sm">Name</div>
                <div className="font-medium">{user.name}</div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-muted-foreground text-sm">Member Since</div>
              <div className="font-medium">
                {formatDate(user.createdAt.toISOString())}
              </div>
            </div>

            {user.emailVerified && (
              <div className="space-y-1.5">
                <div className="text-muted-foreground text-sm">
                  Email Verified
                </div>
                <div className="font-medium text-green-600 dark:text-green-500">
                  ✓ Verified
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="space-y-1">
              <div className="font-medium text-sm">Delete Account</div>
              <div className="text-muted-foreground text-xs">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="shrink-0"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </div>
  );
}
