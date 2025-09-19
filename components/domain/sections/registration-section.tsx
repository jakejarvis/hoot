"use client";

import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import { Skeletons } from "@/components/domain/skeletons";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRegistrant } from "@/lib/format";
import { SECTION_DEFS } from "./sections-meta";

type Registrar = { name: string; iconDomain: string | null };
type Registrant = { organization: string; country: string; state?: string };

export function RegistrationSection({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data?: {
    registrar: Registrar;
    creationDate: string;
    expirationDate: string;
    registrant: Registrant;
    source?: string;
  } | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const Def = SECTION_DEFS.registration;
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
            label="Registrar"
            value={data.registrar.name}
            leading={
              data.registrar.iconDomain ? (
                <Favicon domain={data.registrar.iconDomain} size={16} />
              ) : undefined
            }
            suffix={
              <Badge variant="secondary" title="Data source">
                {data.source ? data.source.toUpperCase() : "RDAP"}
              </Badge>
            }
          />
          <KeyValue label="Created" value={formatDate(data.creationDate)} />
          <KeyValue label="Expires" value={formatDate(data.expirationDate)} />
          <KeyValue
            label="Registrant"
            value={formatRegistrant(data.registrant)}
          />
        </>
      ) : isError ? (
        <ErrorWithRetry message="Failed to load WHOIS." onRetry={onRetry} />
      ) : (
        <Skeletons count={4} />
      )}
    </Section>
  );
}
