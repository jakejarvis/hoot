"use client";

import { BadgeCheck, GraduationCap, HatGlasses } from "lucide-react";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { KeyValueSkeleton } from "@/components/domain/key-value-skeleton";
import { RelativeExpiry } from "@/components/domain/relative-expiry";
import { Section } from "@/components/domain/section";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  extractHostnameFromUrlish,
  formatDate,
  formatDateTimeUtc,
} from "@/lib/format";
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
            <KeyValueSkeleton label="Registrant" />
            <KeyValueSkeleton label="Created" />
            <KeyValueSkeleton label="Expires" withSuffix />
          </>
        ) : data ? (
          <>
            <KeyValue
              label="Registrar"
              value={data.registrarProvider?.name || ""}
              leading={
                data.registrarProvider?.domain ? (
                  <Favicon
                    domain={data.registrarProvider.domain}
                    size={16}
                    className="rounded"
                  />
                ) : undefined
              }
              suffix={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <BadgeCheck className="!h-3.5 !w-3.5 stroke-muted-foreground/80" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="inline-flex items-center gap-[5px]">
                      <span>
                        Verified by{" "}
                        <span className="font-medium">
                          {data.source === "rdap" &&
                          Array.isArray(data.rdapServers) &&
                          data.rdapServers.length > 0 ? (
                            <a
                              href={
                                data.rdapServers[data.rdapServers.length - 1] ??
                                "#"
                              }
                              target="_blank"
                              rel="noopener"
                              className="underline underline-offset-2"
                            >
                              {extractHostnameFromUrlish(
                                data.rdapServers[data.rdapServers.length - 1],
                              ) ?? "RDAP"}
                            </a>
                          ) : (
                            (data.whoisServer ?? "WHOIS")
                          )}
                        </span>
                      </span>
                      <a
                        href={
                          data.source === "rdap"
                            ? "https://rdap.rcode3.com/"
                            : "https://en.wikipedia.org/wiki/WHOIS"
                        }
                        target="_blank"
                        rel="noopener"
                        title={`Learn about ${
                          data.source === "rdap" ? "RDAP" : "WHOIS"
                        }`}
                        className="text-muted/80"
                      >
                        <GraduationCap className="size-3" />
                      </a>
                    </p>
                  </TooltipContent>
                </Tooltip>
              }
            />

            <KeyValue
              label="Registrant"
              value={
                data.privacyEnabled || !registrant
                  ? "Hidden"
                  : formatRegistrant(registrant)
              }
              leading={
                data.privacyEnabled || !registrant ? (
                  <HatGlasses className="stroke-muted-foreground" />
                ) : undefined
              }
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

export function extractRegistrantView(
  record: Registration,
): RegistrantView | null {
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
