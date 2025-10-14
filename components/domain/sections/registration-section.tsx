"use client";

import { BadgeCheck, GraduationCap, HatGlasses } from "lucide-react";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { KeyValueGrid } from "@/components/domain/key-value-grid";
import { KeyValueSkeleton } from "@/components/domain/key-value-skeleton";
import { Section } from "@/components/domain/section";
import { SectionContent } from "@/components/domain/section-content";
import { RelativeExpiryBadge } from "@/components/domain/time-badges";
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
      <SectionContent
        isLoading={isLoading}
        isError={isError}
        data={data ?? null}
        renderLoading={() => (
          <KeyValueGrid colsSm={2}>
            <KeyValueSkeleton label="Registrar" withLeading withSuffix />
            <KeyValueSkeleton label="Registrant" />
            <KeyValueSkeleton label="Created" />
            <KeyValueSkeleton label="Expires" withSuffix />
          </KeyValueGrid>
        )}
        renderData={(d) => (
          <KeyValueGrid colsSm={2}>
            <KeyValue
              label="Registrar"
              value={d.registrarProvider?.name || ""}
              leading={
                d.registrarProvider?.domain ? (
                  <Favicon
                    domain={d.registrarProvider.domain}
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
                          {d.source === "rdap" &&
                          Array.isArray(d.rdapServers) &&
                          d.rdapServers.length > 0 ? (
                            <a
                              href={
                                d.rdapServers[d.rdapServers.length - 1] ?? "#"
                              }
                              target="_blank"
                              rel="noopener"
                              className="underline underline-offset-2"
                            >
                              {extractHostnameFromUrlish(
                                d.rdapServers[d.rdapServers.length - 1],
                              ) ?? "RDAP"}
                            </a>
                          ) : (
                            (d.whoisServer ?? "WHOIS")
                          )}
                        </span>
                      </span>
                      <a
                        href={
                          d.source === "rdap"
                            ? "https://rdap.rcode3.com/"
                            : "https://en.wikipedia.org/wiki/WHOIS"
                        }
                        target="_blank"
                        rel="noopener"
                        title={`Learn about ${
                          d.source === "rdap" ? "RDAP" : "WHOIS"
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
                d.privacyEnabled || !registrant
                  ? "Hidden"
                  : formatRegistrant(registrant)
              }
              leading={
                d.privacyEnabled || !registrant ? (
                  <HatGlasses className="stroke-muted-foreground" />
                ) : undefined
              }
            />

            <KeyValue
              label="Created"
              value={formatDate(d.creationDate || "Unknown")}
              valueTooltip={
                d.creationDate ? formatDateTimeUtc(d.creationDate) : undefined
              }
            />

            <KeyValue
              label="Expires"
              value={formatDate(d.expirationDate || "Unknown")}
              valueTooltip={
                d.expirationDate
                  ? formatDateTimeUtc(d.expirationDate)
                  : undefined
              }
              suffix={
                d.expirationDate ? (
                  <RelativeExpiryBadge
                    to={d.expirationDate}
                    dangerDays={30}
                    warnDays={60}
                    className="text-[11px] leading-none"
                  />
                ) : null
              }
            />
          </KeyValueGrid>
        )}
        renderError={() => (
          <ErrorWithRetry
            message="Failed to load WHOIS."
            onRetryAction={onRetryAction}
          />
        )}
      />
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
