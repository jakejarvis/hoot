"use client";

import { ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useState } from "react";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { RelativeExpiry } from "@/components/domain/relative-expiry";
import { Section } from "@/components/domain/section";
import { KeyValueSkeleton } from "@/components/domain/skeletons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/format";
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
  const [showAll, setShowAll] = useState(false);
  const firstCert = Array.isArray(data) && data.length > 0 ? data[0] : null;
  const remainingCerts =
    Array.isArray(data) && data.length > 1 ? data.slice(1) : [];
  return (
    <Section
      {...SECTION_DEFS.certificates}
      isError={isError}
      isLoading={isLoading}
    >
      {isLoading ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-background/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:border-white/5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <KeyValueSkeleton
                label="Issuer"
                widthClass="w-[100px]"
                withLeading
              />
              <KeyValueSkeleton label="Subject" widthClass="w-[100px]" />
              <KeyValueSkeleton label="Valid from" widthClass="w-[100px]" />
              <KeyValueSkeleton
                label="Valid to"
                widthClass="w-[100px]"
                withSuffix
              />
            </div>
          </div>
          <div className="my-2 flex justify-center">
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </>
      ) : data && firstCert ? (
        <>
          <Fragment
            key={`cert-${firstCert.subject}-${firstCert.validFrom}-${firstCert.validTo}`}
          >
            <div className="relative mb-0 overflow-hidden rounded-2xl border border-black/5 bg-background/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:border-white/5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <KeyValue
                  label="Issuer"
                  value={firstCert.issuer}
                  leading={
                    firstCert.caProvider?.domain ? (
                      <Favicon
                        domain={firstCert.caProvider.domain}
                        size={16}
                        className="rounded"
                      />
                    ) : undefined
                  }
                  suffix={
                    firstCert.caProvider?.name &&
                    firstCert.caProvider.name !== "Unknown" ? (
                      <span className="flex items-center text-[11px] text-muted-foreground leading-none">
                        {firstCert.caProvider.name}
                      </span>
                    ) : undefined
                  }
                />

                <KeyValue
                  label="Subject"
                  value={firstCert.subject}
                  suffix={(() => {
                    const subjectName = firstCert.subject;
                    const sans = Array.isArray(firstCert.altNames)
                      ? firstCert.altNames.filter(
                          (n) => !equalHostname(n, subjectName),
                        )
                      : [];
                    return sans.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex select-none items-center font-mono text-[11px] text-muted-foreground/80 leading-none underline underline-offset-2">
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

                <KeyValue
                  label="Valid from"
                  value={formatDate(firstCert.validFrom)}
                />

                <KeyValue
                  label="Valid to"
                  value={formatDate(firstCert.validTo)}
                  suffix={
                    <RelativeExpiry
                      to={firstCert.validTo}
                      dangerDays={7}
                      warnDays={30}
                      className="flex items-center text-[11px] leading-none"
                    />
                  }
                />
              </div>
            </div>
          </Fragment>

          {remainingCerts.length > 0 && !showAll && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={false}
                onClick={() => setShowAll(true)}
                className="text-[13px]"
              >
                <ChevronDown className="h-4 w-4" aria-hidden />
                <span>Show Chain</span>
              </Button>
            </div>
          )}

          {remainingCerts.length > 0 && (
            <AnimatePresence initial={false}>
              {showAll && (
                <motion.div
                  key="cert-chain"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="my-3 flex justify-center" aria-hidden>
                    <ArrowDown className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  {remainingCerts.map((c, idx) => (
                    <Fragment
                      key={`cert-${c.subject}-${c.validFrom}-${c.validTo}`}
                    >
                      <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-background/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:border-white/5">
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
                              c.caProvider?.name &&
                              c.caProvider.name !== "Unknown" ? (
                                <span className="flex items-center text-[11px] text-muted-foreground leading-none">
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
                                ? c.altNames.filter(
                                    (n) => !equalHostname(n, subjectName),
                                  )
                                : [];
                              return sans.length > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex select-none items-center font-mono text-[11px] text-muted-foreground/80 leading-none underline underline-offset-2">
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

                          <KeyValue
                            label="Valid from"
                            value={formatDate(c.validFrom)}
                          />

                          <KeyValue
                            label="Valid to"
                            value={formatDate(c.validTo)}
                            suffix={
                              <RelativeExpiry
                                to={c.validTo}
                                dangerDays={7}
                                warnDays={30}
                                className="flex items-center text-[11px] leading-none"
                              />
                            }
                          />
                        </div>
                      </div>

                      {idx < remainingCerts.length - 1 && (
                        <div className="my-3 flex justify-center" aria-hidden>
                          <ArrowDown className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                      )}
                    </Fragment>
                  ))}
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={true}
                      onClick={() => setShowAll(false)}
                      className="text-[13px]"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden />
                      <span>Hide Chain</span>
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </>
      ) : isError ? (
        <ErrorWithRetry
          message="Failed to load certificates."
          onRetry={onRetryAction}
        />
      ) : null}
    </Section>
  );
}

export function equalHostname(a: string, b: string): boolean {
  try {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  } catch {
    return a === b;
  }
}
