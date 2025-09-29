"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { ArrowDown } from "lucide-react";
import React from "react";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Favicon } from "@/components/domain/favicon";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import { Skeletons } from "@/components/domain/skeletons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { equalHostname, formatDate } from "@/lib/format";
import { detectCertificateAuthority } from "@/lib/providers/detection";
import { SECTION_DEFS } from "./sections-meta";

// Client-only relative expiry hint to avoid hydration mismatch
function ValidToSuffix({ validTo }: { validTo: string }) {
  const [text, setText] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"danger" | "warn" | "ok" | null>(
    null,
  );

  React.useEffect(() => {
    try {
      const target = new Date(validTo);
      const now = new Date();
      const rel = formatDistanceToNowStrict(target, { addSuffix: true });
      const ms = target.getTime() - now.getTime();
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
      let s: "danger" | "warn" | "ok" = "ok";
      if (days <= 7) s = "danger";
      else if (days <= 30) s = "warn";
      setText(rel);
      setStatus(s);
    } catch {
      // ignore
    }
  }, [validTo]);

  if (!text) return null;
  const colorClass =
    status === "danger"
      ? "text-red-600 dark:text-red-400"
      : status === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  return <span className={`text-[11px] ${colorClass}`}>({text})</span>;
}

export function CertificatesSection({
  data,
  isLoading: _isLoading,
  isError,
  onRetryAction,
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
  onRetryAction: () => void;
}) {
  const Def = SECTION_DEFS.certificates;
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
        data.map((c, idx) => (
          <React.Fragment key={`cert-${c.subject}-${c.validFrom}-${c.validTo}`}>
            <div className="relative overflow-hidden rounded-2xl border bg-background/40 backdrop-blur supports-[backdrop-filter]:bg-background/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-black/10 dark:border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(() => {
                  const ca = detectCertificateAuthority(c.issuer);
                  return (
                    <KeyValue
                      label="Issuer"
                      value={c.issuer}
                      leading={
                        ca.domain ? (
                          <Favicon
                            domain={ca.domain}
                            size={16}
                            className="rounded"
                          />
                        ) : undefined
                      }
                      suffix={
                        ca.name && ca.name !== "Unknown" ? (
                          <span className="text-[11px] text-muted-foreground">
                            {ca.name}
                          </span>
                        ) : undefined
                      }
                    />
                  );
                })()}

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
                            className="text-[11px] font-mono leading-none text-muted-foreground/80 underline underline-offset-2"
                            title={sans.join(", ")}
                          >
                            +{sans.length}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[80vw] md:max-w-[40rem] break-words whitespace-pre-wrap">
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
                  suffix={<ValidToSuffix validTo={c.validTo} />}
                />
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
          onRetry={onRetryAction}
        />
      ) : (
        <Skeletons count={1} />
      )}
    </Section>
  );
}
