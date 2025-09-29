"use client";

import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import type { HttpHeader } from "@/lib/schemas";
import { SECTION_DEFS } from "./sections-meta";

export function HeadersSection({
  data,
  isLoading,
  isError,
  onRetryAction,
}: {
  data?: HttpHeader[] | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
}) {
  const Def = SECTION_DEFS.headers;
  return (
    <Section
      title={Def.title}
      description={Def.description}
      help={Def.help}
      icon={<Def.Icon className="h-4 w-4" />}
      accent={Def.accent}
      isError={isError}
      isLoading={isLoading}
    >
      {isLoading ? null : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(() => {
            const important = new Set([
              "strict-transport-security",
              "content-security-policy",
              "content-security-policy-report-only",
              "x-frame-options",
              "referrer-policy",
              "server",
              "x-powered-by",
              "cache-control",
              "permissions-policy",
            ]);
            return data.map((h) => (
              <KeyValue
                key={`${h.name}:${String((h as { value: unknown }).value)}`}
                label={h.name}
                value={String((h as { value: unknown }).value)}
                copyable
                highlight={important.has(h.name)}
              />
            ));
          })()}
        </div>
      ) : isError ? (
        <ErrorWithRetry
          message="Failed to load headers."
          onRetry={onRetryAction}
        />
      ) : null}
    </Section>
  );
}
