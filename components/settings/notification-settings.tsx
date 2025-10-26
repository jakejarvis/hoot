"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { NotificationThresholdSelector } from "@/components/settings/notification-threshold-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTRPC, useTRPCClient } from "@/lib/trpc/client";

export function NotificationSettings() {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const { data: preferences, isPending } = useQuery(
    trpc.notifications.getPreferences.queryOptions(),
  );

  const updateMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      trpcClient.notifications.updatePreferences.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.notifications.getPreferences.queryOptions().queryKey,
      });
      toast.success("Preferences updated");
    },
    onError: (error) => {
      toast.error("Failed to update preferences", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  const handleThresholdsChange = (key: string, values: number[]) => {
    updateMutation.mutate({ [key]: values });
  };

  if (isPending) {
    return <NotificationSettingsSkeleton />;
  }

  if (!preferences) return null;

  return (
    <div className="space-y-6">
      {/* Email Notifications Master Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Control whether you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="email-enabled" className="flex flex-col gap-1">
              <span className="font-medium">Enable Email Notifications</span>
              <span className="font-normal text-muted-foreground text-xs">
                Receive email alerts for your monitored domains
              </span>
            </Label>
            <Switch
              id="email-enabled"
              checked={preferences.emailEnabled}
              onCheckedChange={(checked) =>
                handleToggle("emailEnabled", checked)
              }
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Expiration Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Expiration Alerts</CardTitle>
          <CardDescription>
            Get notified before domains and certificates expire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Registration Expiry */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="notify-registration"
                className="flex flex-col gap-1"
              >
                <span className="font-medium">Domain Registration Expiry</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Notify when domain registration is about to expire
                </span>
              </Label>
              <Switch
                id="notify-registration"
                checked={preferences.notifyRegistrationExpiring}
                onCheckedChange={(checked) =>
                  handleToggle("notifyRegistrationExpiring", checked)
                }
                disabled={!preferences.emailEnabled || updateMutation.isPending}
              />
            </div>

            {preferences.notifyRegistrationExpiring && (
              <NotificationThresholdSelector
                label="Notification Thresholds (days before expiry)"
                value={preferences.registrationExpiryDays}
                onChange={(values) =>
                  handleThresholdsChange("registrationExpiryDays", values)
                }
                disabled={!preferences.emailEnabled || updateMutation.isPending}
                presets={[1, 7, 14, 30, 60, 90]}
              />
            )}
          </div>

          {/* Certificate Expiry */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="notify-certificate"
                className="flex flex-col gap-1"
              >
                <span className="font-medium">SSL Certificate Expiry</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Notify when SSL certificates are about to expire
                </span>
              </Label>
              <Switch
                id="notify-certificate"
                checked={preferences.notifyCertificateExpiring}
                onCheckedChange={(checked) =>
                  handleToggle("notifyCertificateExpiring", checked)
                }
                disabled={!preferences.emailEnabled || updateMutation.isPending}
              />
            </div>

            {preferences.notifyCertificateExpiring && (
              <NotificationThresholdSelector
                label="Notification Thresholds (days before expiry)"
                value={preferences.certificateExpiryDays}
                onChange={(values) =>
                  handleThresholdsChange("certificateExpiryDays", values)
                }
                disabled={!preferences.emailEnabled || updateMutation.isPending}
                presets={[1, 7, 14, 30]}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Change Detection</CardTitle>
          <CardDescription>
            Get notified when domain configuration changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="size-4" />
            <AlertDescription className="text-xs">
              Change notifications are sent at most once per day per domain
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="notify-nameserver"
                className="flex flex-col gap-1"
              >
                <span className="font-medium">Nameserver Changes</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Notify when domain nameservers are updated
                </span>
              </Label>
              <Switch
                id="notify-nameserver"
                checked={preferences.notifyNameserverChange}
                onCheckedChange={(checked) =>
                  handleToggle("notifyNameserverChange", checked)
                }
                disabled={!preferences.emailEnabled || updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="notify-cert-change"
                className="flex flex-col gap-1"
              >
                <span className="font-medium">Certificate Changes</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Notify when SSL certificates are renewed or replaced
                </span>
              </Label>
              <Switch
                id="notify-cert-change"
                checked={preferences.notifyCertificateChange}
                onCheckedChange={(checked) =>
                  handleToggle("notifyCertificateChange", checked)
                }
                disabled={!preferences.emailEnabled || updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-hosting" className="flex flex-col gap-1">
                <span className="font-medium">Hosting Provider Changes</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Notify when hosting provider is detected as changed
                </span>
              </Label>
              <Switch
                id="notify-hosting"
                checked={preferences.notifyHostingChange}
                onCheckedChange={(checked) =>
                  handleToggle("notifyHostingChange", checked)
                }
                disabled={!preferences.emailEnabled || updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-dns" className="flex flex-col gap-1">
                <span className="font-medium">DNS Record Changes</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Notify when DNS records are added, modified, or removed
                </span>
              </Label>
              <Switch
                id="notify-dns"
                checked={preferences.notifyDnsChange}
                onCheckedChange={(checked) =>
                  handleToggle("notifyDnsChange", checked)
                }
                disabled={!preferences.emailEnabled || updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="notify-resolution"
                className="flex flex-col gap-1"
              >
                <span className="font-medium">Resolution Failures</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Notify when domain fails to resolve or becomes unreachable
                </span>
              </Label>
              <Switch
                id="notify-resolution"
                checked={preferences.notifyResolutionFailure}
                onCheckedChange={(checked) =>
                  handleToggle("notifyResolutionFailure", checked)
                }
                disabled={!preferences.emailEnabled || updateMutation.isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
