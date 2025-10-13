"use client";

import { hasFlag } from "country-flag-icons";
import { MailQuestionMark } from "lucide-react";
import dynamic from "next/dynamic";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { KeyValueSkeleton } from "@/components/domain/key-value-skeleton";
import { Section } from "@/components/domain/section";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { Hosting } from "@/lib/schemas";
import { SECTION_DEFS } from "@/lib/sections-meta";
import { cn } from "@/lib/utils";

const HostingMap = dynamic(
  () => import("@/components/domain/hosting-map").then((m) => m.HostingMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full rounded-2xl border border-black/10 bg-background/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:border-white/10" />
    ),
  },
);

export function HostingEmailSection({
  data,
  isLoading,
  isError,
  onRetryAction,
}: {
  data?: Hosting | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
}) {
  return (
    <Section {...SECTION_DEFS.hosting} isError={isError} isLoading={isLoading}>
      {isLoading ? (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <KeyValueSkeleton label="DNS" withLeading widthClass="w-[100px]" />
            <KeyValueSkeleton
              label="Hosting"
              withLeading
              widthClass="w-[100px]"
            />
            <KeyValueSkeleton
              label="Email"
              withLeading
              widthClass="w-[100px]"
            />
          </div>

          <KeyValueSkeleton
            label="Location"
            withLeading
            widthClass="w-[100px]"
          />

          {/* Map skeleton provided by dynamic component's loading prop; keep spacing */}
          <div className="h-[280px] w-full rounded-2xl border border-black/10 bg-background/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:border-white/10" />
        </>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <KeyValue
              label="DNS"
              value={data.dnsProvider.name}
              leading={
                data.dnsProvider.domain ? (
                  <Favicon
                    domain={data.dnsProvider.domain}
                    size={16}
                    className="rounded"
                  />
                ) : undefined
              }
            />
            <KeyValue
              label="Hosting"
              value={data.hostingProvider.name}
              leading={
                data.hostingProvider.domain ? (
                  <Favicon
                    domain={data.hostingProvider.domain}
                    size={16}
                    className="rounded"
                  />
                ) : undefined
              }
            />
            <KeyValue
              label="Email"
              value={data.emailProvider.name}
              leading={
                data.emailProvider.domain ? (
                  <Favicon
                    domain={data.emailProvider.domain}
                    size={16}
                    className="rounded"
                  />
                ) : undefined
              }
            />
          </div>

          {data.geo.lat != null && data.geo.lon != null ? (
            <>
              <KeyValue
                label="Location"
                value={`${
                  data.geo.city || data.geo.region || data.geo.country
                    ? `${data.geo.city ? `${data.geo.city}, ` : ""}${data.geo.region ? `${data.geo.region}, ` : ""}${data.geo.country}`
                    : ""
                }`}
                leading={
                  data.geo.country_code &&
                  hasFlag(data.geo.country_code.toUpperCase()) ? (
                    <span
                      className={cn(
                        "!w-[15px] !h-[10px] relative top-[2px] inline-block rounded-xs",
                        // https://gitlab.com/catamphetamine/country-flag-icons/-/tree/master/flags/3x2
                        `flag:${data.geo.country_code.toUpperCase()}`,
                      )}
                      aria-hidden="true"
                      title={data.geo.country || data.geo.country_code}
                    />
                  ) : undefined
                }
              />

              <HostingMap hosting={data} />
            </>
          ) : null}
        </>
      ) : isError ? (
        <ErrorWithRetry
          message="Failed to load hosting details."
          onRetryAction={onRetryAction}
        />
      ) : (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MailQuestionMark />
            </EmptyMedia>
            <EmptyTitle>No hosting details available</EmptyTitle>
            <EmptyDescription>
              We couldn&apos;t detect hosting, email, or DNS provider info. If
              the domain has no A/AAAA records or blocked headers, details may
              be unavailable.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </Section>
  );
}
