"use client";

import type { DomainRecord } from "rdapper";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import { Skeletons } from "@/components/domain/skeletons";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRegistrant } from "@/lib/format";
import type { RegistrationWithProvider } from "@/server/services/registration";
import { SECTION_DEFS } from "./sections-meta";

type RegistrantView = { organization: string; country: string; state?: string };

export function RegistrationSection({
  data,
  isLoading: _isLoading,
  isError,
  onRetryAction,
}: {
  data?: RegistrationWithProvider | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
}) {
  const Def = SECTION_DEFS.registration;
  const registrar = data?.registrarProvider ?? null;
  const registrant: RegistrantView | null = data
    ? extractRegistrantView(data)
    : null;
  return (
    <Section
      title={Def.title}
      description={Def.description}
      help={Def.help}
      icon={<Def.Icon className="h-4 w-4" />}
      accent={Def.accent}
      status={isError ? "error" : data ? "ready" : "loading"}
    >
      {data ? (
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
              <Badge variant="secondary" title="Data source">
                {data.source ? data.source.toUpperCase() : "RDAP"}
              </Badge>
            }
          />
          <KeyValue
            label="Created"
            value={formatDate(data.creationDate || "")}
          />
          <KeyValue
            label="Expires"
            value={formatDate(data.expirationDate || "")}
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
      ) : (
        <Skeletons count={4} />
      )}
    </Section>
  );
}

function extractRegistrantView(record: DomainRecord): RegistrantView | null {
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
