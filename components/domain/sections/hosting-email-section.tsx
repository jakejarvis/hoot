"use client";

import dynamic from "next/dynamic";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import { KeyValueSkeleton } from "@/components/domain/skeletons";
import type { Hosting } from "@/lib/schemas";
import { SECTION_DEFS } from "@/lib/sections-meta";

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
          <KeyValueSkeleton label="DNS" withLeading widthClass="w-[100px]" />
          <KeyValueSkeleton
            label="Hosting"
            withLeading
            widthClass="w-[100px]"
          />
          <KeyValueSkeleton label="Email" withLeading widthClass="w-[100px]" />
          <KeyValueSkeleton
            label="Location"
            withLeading
            widthClass="w-[100px]"
          />
          {/* Map skeleton provided by dynamic component's loading prop; keep spacing */}
          <div className="mt-2">
            <div className="h-[280px] w-full rounded-2xl border border-black/10 bg-background/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:border-white/10" />
          </div>
        </>
      ) : data ? (
        <>
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
          <KeyValue
            label="Location"
            value={`${
              data.geo.city || data.geo.region || data.geo.country
                ? `${data.geo.city ? `${data.geo.city}, ` : ""}${data.geo.region ? `${data.geo.region}, ` : ""}${data.geo.country}`
                : ""
            }`}
            leading={
              data.geo.emoji ? (
                <span className="inline-block leading-none">
                  {data.geo.emoji}
                </span>
              ) : undefined
            }
          />
          {data.geo.lat != null && data.geo.lon != null ? (
            <div className="mt-2">
              <HostingMap hosting={data} />
            </div>
          ) : null}
        </>
      ) : isError ? (
        <ErrorWithRetry
          message="Failed to load hosting details."
          onRetry={onRetryAction}
        />
      ) : null}
    </Section>
  );
}
