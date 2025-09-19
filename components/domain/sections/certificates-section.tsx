"use client";

import { ArrowDown } from "lucide-react";
import React from "react";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import { Skeletons } from "@/components/domain/skeletons";
import { equalHostname, formatDate } from "@/lib/format";
import { SECTION_DEFS } from "./sections-meta";

export function CertificatesSection({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data?: Array<{
    issuer: string;
    subject: string;
    altNames?: string[];
    validFrom: string;
    validTo: string;
  }> | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const Def = SECTION_DEFS.certificates;
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
        data.map((c, idx) => (
          <React.Fragment key={`cert-${c.subject}-${c.validFrom}-${c.validTo}`}>
            <div className="relative overflow-hidden rounded-2xl border bg-background/40 backdrop-blur supports-[backdrop-filter]:bg-background/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-black/10 dark:border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <KeyValue label="Issuer" value={c.issuer} />
                <KeyValue
                  label="Subject"
                  value={c.subject}
                  suffix={(() => {
                    const subjectName = c.subject;
                    const sans = Array.isArray(c.altNames)
                      ? c.altNames.filter((n) => !equalHostname(n, subjectName))
                      : [];
                    return sans.length > 0 ? (
                      <span
                        className="text-[11px] font-mono leading-none text-muted-foreground/80 underline underline-offset-2"
                        title={sans.join(", ")}
                      >
                        +{sans.length}
                      </span>
                    ) : undefined;
                  })()}
                />
                <KeyValue label="Valid from" value={formatDate(c.validFrom)} />
                <KeyValue label="Valid to" value={formatDate(c.validTo)} />
              </div>
            </div>
            {idx < data.length - 1 && (
              <div className="flex justify-center my-2" aria-hidden>
                <ArrowDown className="h-4 w-4 text-muted-foreground/60" />
              </div>
            )}
          </React.Fragment>
        ))
      ) : isError ? (
        <ErrorWithRetry
          message="Failed to load certificates."
          onRetry={onRetry}
        />
      ) : (
        <Skeletons count={1} />
      )}
    </Section>
  );
}
