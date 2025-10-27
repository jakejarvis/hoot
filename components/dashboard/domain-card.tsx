"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { Favicon } from "@/components/domain/favicon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DomainCardProps = {
  domain: {
    id: string;
    domainId: string;
    domain: string;
    verified: boolean;
    verifiedAt: Date | null;
    verificationMethod: string | null;
    createdAt: Date;
    registrationExpiresAt?: Date | string | null;
    certificateExpiresAt?: Date | string | null;
  };
};

export function DomainCard({ domain }: DomainCardProps) {
  const isVerified = domain.verified;

  // Calculate days until expiry
  const getDaysUntilExpiry = (date?: Date | string | null) => {
    if (!date) return null;
    const expiryDate = date instanceof Date ? date : new Date(date);
    const now = Date.now();
    return Math.floor((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24));
  };

  const registrationDays = getDaysUntilExpiry(domain.registrationExpiresAt);
  const certificateDays = getDaysUntilExpiry(domain.certificateExpiresAt);

  const isRegistrationCritical =
    registrationDays !== null && registrationDays <= 30;
  const isCertificateCritical =
    certificateDays !== null && certificateDays <= 14;

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
      {!isVerified && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5"
        />
      )}

      <CardHeader>
        <div className="flex items-start gap-3">
          <Favicon domain={domain.domain} size={32} className="mt-1 rounded" />

          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              <Link
                href={`/${domain.domain}`}
                className="truncate text-base hover:underline"
              >
                {domain.domain}
              </Link>
              <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
            </CardTitle>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isVerified ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="size-3 text-green-600" />
                  Verified
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                >
                  <Clock className="size-3" />
                  Pending
                </Badge>
              )}

              {domain.verificationMethod && (
                <Badge variant="outline" className="text-xs">
                  via {domain.verificationMethod.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Registration Expiry */}
        {domain.registrationExpiresAt && (
          <div
            className={cn(
              "flex items-center justify-between rounded-lg border p-3",
              isRegistrationCritical
                ? "border-destructive/30 bg-destructive/5"
                : "border-border/50 bg-muted/30",
            )}
          >
            <div className="flex items-center gap-2 text-sm">
              {isRegistrationCritical ? (
                <AlertTriangle className="size-4 text-destructive" />
              ) : (
                <Clock className="size-4 text-muted-foreground" />
              )}
              <span className="font-medium text-xs">Registration</span>
            </div>
            <span
              className={cn(
                "text-xs",
                isRegistrationCritical
                  ? "font-medium text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {registrationDays !== null && registrationDays > 0
                ? `${registrationDays}d left`
                : registrationDays === 0
                  ? "Expires today"
                  : "Expired"}
            </span>
          </div>
        )}

        {/* Certificate Expiry */}
        {domain.certificateExpiresAt && (
          <div
            className={cn(
              "flex items-center justify-between rounded-lg border p-3",
              isCertificateCritical
                ? "border-destructive/30 bg-destructive/5"
                : "border-border/50 bg-muted/30",
            )}
          >
            <div className="flex items-center gap-2 text-sm">
              {isCertificateCritical ? (
                <ShieldAlert className="size-4 text-destructive" />
              ) : (
                <CheckCircle2 className="size-4 text-muted-foreground" />
              )}
              <span className="font-medium text-xs">Certificate</span>
            </div>
            <span
              className={cn(
                "text-xs",
                isCertificateCritical
                  ? "font-medium text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {certificateDays !== null && certificateDays > 0
                ? `${certificateDays}d left`
                : certificateDays === 0
                  ? "Expires today"
                  : "Expired"}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {!isVerified && (
            <Button size="sm" asChild className="flex-1">
              <Link href={`/domains/verify/${domain.id}`}>Verify Domain</Link>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild className="flex-1">
            <Link href={`/${domain.domain}`}>View Report</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
