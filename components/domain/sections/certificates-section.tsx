"use client";

import { ArrowDown } from "lucide-react";
import { Fragment } from "react";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { RelativeExpiry } from "@/components/domain/relative-expiry";
import { Section } from "@/components/domain/section";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { equalHostname, formatDate } from "@/lib/format";
import type { Certificate } from "@/lib/schemas";
import { SECTION_DEFS } from "@/lib/sections-meta";

export function CertificatesSection({
  data,
  isLoading,
  isError,
  onRetryAction,
}: {
  data?: Certificate[] | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
}) {
  return (
    <Section
      {...SECTION_DEFS.certificates}
      isError={isError}
      isLoading={isLoading}
    >
      {isLoading ? null : data ? (
        data.map((c, idx) => (
          <Fragment key={`cert-${c.subject}-${c.validFrom}-${c.validTo}`}>
            <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-background/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:border-white/10">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <KeyValue
                  label="Issuer"
                  value={c.issuer}
                  leading={
                    c.caProvider?.domain ? (
                      <Favicon
                        domain={c.caProvider.domain}
                        size={16}
                        className="rounded"
                      />
                    ) : undefined
                  }
                  suffix={
                    c.caProvider?.name && c.caProvider.name !== "Unknown" ? (
                      <span className="text-[11px] text-muted-foreground">
                        {c.caProvider.name}
                      </span>
                    ) : undefined
                  }
                />

                <KeyValue
                  label="Subject"
                  value={c.subject}
                  suffix={(() => {
                    const subjectName = c.subject;
                    const sans = Array.isArray(c.altNames)
                      ? c.altNames.filter((n) => !equalHostname(n, subjectName))
                      : [];
                    return sans.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="select-none font-mono text-[11px] text-muted-foreground/80 leading-none underline underline-offset-2"
                            title={sans.join(", ")}
                          >
                            +{sans.length}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[80vw] whitespace-pre-wrap break-words md:max-w-[40rem]">
                          {sans.join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    ) : undefined;
                  })()}
                />

                <KeyValue label="Valid from" value={formatDate(c.validFrom)} />

                <KeyValue
                  label="Valid to"
                  value={formatDate(c.validTo)}
                  suffix={
                    <RelativeExpiry
                      to={c.validTo}
                      dangerDays={7}
                      warnDays={30}
                      className="text-[11px]"
                    />
                  }
                />
              </div>
            </div>

            {idx < data.length - 1 && (
              <div className="my-2 flex justify-center" aria-hidden>
                <ArrowDown className="h-4 w-4 text-muted-foreground/60" />
              </div>
            )}
          </Fragment>
        ))
      ) : isError ? (
        <ErrorWithRetry
          message="Failed to load certificates."
          onRetry={onRetryAction}
        />
      ) : null}
    </Section>
  );
}
