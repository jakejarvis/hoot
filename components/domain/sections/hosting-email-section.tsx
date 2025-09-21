"use client";

import dynamic from "next/dynamic";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import { Skeletons } from "@/components/domain/skeletons";
import type { HostingInfo } from "@/server/services/hosting";
import { SECTION_DEFS } from "./sections-meta";

export function HostingEmailSection({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data?: HostingInfo | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const HostingMap = dynamic(
    () => import("../hosting-map").then((m) => m.HostingMap),
    {
      ssr: false,
      loading: () => (
        <div className="h-[280px] w-full rounded-2xl border bg-background/40 backdrop-blur supports-[backdrop-filter]:bg-background/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-black/10 dark:border-white/10" />
      ),
    },
  );

  const Def = SECTION_DEFS.hosting;
  return (
    <Section
      title={Def.title}
      description={Def.description}
      help={Def.help}
      icon={<Def.Icon className="h-4 w-4" />}
      accent={Def.accent}
      status={isLoading ? "loading" : isError ? "error" : "ready"}
    >
      {data ? (
        <>
          <KeyValue
            label="DNS"
            value={data.dnsProvider.name}
            leading={
              data.dnsProvider.iconDomain ? (
                <Favicon
                  domain={data.dnsProvider.iconDomain}
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
              data.hostingProvider.iconDomain ? (
                <Favicon
                  domain={data.hostingProvider.iconDomain}
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
              data.emailProvider.iconDomain ? (
                <Favicon
                  domain={data.emailProvider.iconDomain}
                  size={16}
                  className="rounded"
                />
              ) : undefined
            }
          />
          <KeyValue
            label="Location"
            value={`${data.geo.emoji} ${data.geo.city || data.geo.region || data.geo.country ? `${data.geo.city ? `${data.geo.city}, ` : ""}${data.geo.region ? `${data.geo.region}, ` : ""}${data.geo.country}` : ""}`}
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
          onRetry={onRetry}
        />
      ) : (
        <Skeletons count={3} />
      )}
    </Section>
  );
}
