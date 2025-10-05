"use client";

import { BadgeCheck } from "lucide-react";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { RelativeExpiry } from "@/components/domain/relative-expiry";
import { Section } from "@/components/domain/section";
import { KeyValueSkeleton } from "@/components/domain/skeletons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate, formatDateTimeUtc } from "@/lib/format";
import type { Registration } from "@/lib/schemas";
import { SECTION_DEFS } from "@/lib/sections-meta";

type RegistrantView = { organization: string; country: string; state?: string };

export function formatRegistrant(reg: {
  organization: string;
  country: string;
  state?: string;
}) {
  const org = (reg.organization || "").trim();
  const country = (reg.country || "").trim();
  const state = (reg.state || "").trim();
  const parts = [] as string[];
  if (org) parts.push(org);
  const loc = [state, country].filter(Boolean).join(", ");
  if (loc) parts.push(loc);
  if (parts.length === 0) return "Unavailable";
  return parts.join(" — ");
}

export function RegistrationSection({
  data,
  isLoading,
  isError,
  onRetryAction,
}: {
  data?: Registration | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
}) {
  const registrar = data?.registrarProvider ?? null;
  const registrant: RegistrantView | null = data
    ? extractRegistrantView(data)
    : null;
  return (
    <Section
      {...SECTION_DEFS.registration}
      isError={isError}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {isLoading ? (
          <>
            <KeyValueSkeleton label="Registrar" withLeading withSuffix />
            <KeyValueSkeleton label="Created" />
            <KeyValueSkeleton label="Expires" withSuffix />
            <KeyValueSkeleton label="Registrant" />
          </>
        ) : data ? (
          <>
            <KeyValue
              label="Registrar"
              value={registrar?.name || ""}
              leading={
                registrar?.domain ? (
                  <Favicon
                    domain={registrar.domain}
                    size={16}
                    className="rounded"
                  />
                ) : undefined
              }
              suffix={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex text-muted-foreground/80">
                      <BadgeCheck className="!h-3.5 !w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>via {data?.source === "rdap" ? "RDAP" : "WHOIS"}</p>
                  </TooltipContent>
                </Tooltip>
              }
            />

            <KeyValue
              label="Registrant"
              value={formatRegistrant(
                registrant ?? { organization: "Unavailable", country: "" },
              )}
            />

            <KeyValue
              label="Created"
              value={formatDate(data.creationDate || "")}
              valueTooltip={
                data.creationDate
                  ? formatDateTimeUtc(data.creationDate)
                  : undefined
              }
            />

            <KeyValue
              label="Expires"
              value={formatDate(data.expirationDate || "")}
              valueTooltip={
                data.expirationDate
                  ? formatDateTimeUtc(data.expirationDate)
                  : undefined
              }
              suffix={
                data.expirationDate ? (
                  <RelativeExpiry
                    to={data.expirationDate}
                    dangerDays={30}
                    warnDays={60}
                    className="text-[11px]"
                  />
                ) : null
              }
            />
          </>
        ) : isError ? (
          <ErrorWithRetry
            message="Failed to load WHOIS."
            onRetryAction={onRetryAction}
          />
        ) : null}
      </div>
    </Section>
  );
}

function extractRegistrantView(record: Registration): RegistrantView | null {
  const registrant = record.contacts?.find((c) => c.type === "registrant");
  if (!registrant) return null;
  const organization =
    (registrant.organization || registrant.name || "").toString().trim() ||
    "Unknown";
  const country = (
    registrant.country ||
    registrant.countryCode ||
    ""
  ).toString();
  const state = (registrant.state || "").toString() || undefined;
  return { organization, country, state };
}
