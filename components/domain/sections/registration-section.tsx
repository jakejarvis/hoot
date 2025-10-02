"use client";

import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { RelativeExpiry } from "@/components/domain/relative-expiry";
import { Section } from "@/components/domain/section";
import { KeyValueSkeleton } from "@/components/domain/skeletons";
import { formatDate, formatRegistrant } from "@/lib/format";
import type { Registration } from "@/lib/schemas";
import { SECTION_DEFS } from "@/lib/sections-meta";

type RegistrantView = { organization: string; country: string; state?: string };

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
          />
          <KeyValue
            label="Created"
            value={formatDate(data.creationDate || "")}
          />
          <KeyValue
            label="Expires"
            value={formatDate(data.expirationDate || "")}
            suffix={
              data.expirationDate ? (
                <RelativeExpiry
                  to={data.expirationDate}
                  dangerDays={30}
                  warnDays={60}
                  className="flex items-center text-[11px] leading-none"
                />
              ) : null
            }
          />
          <KeyValue
            label="Registrant"
            value={formatRegistrant(
              registrant ?? { organization: "Unavailable", country: "" },
            )}
          />
        </>
      ) : isError ? (
        <ErrorWithRetry
          message="Failed to load WHOIS."
          onRetry={onRetryAction}
        />
      ) : null}
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
