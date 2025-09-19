"use client";

import { List } from "lucide-react";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import { Skeletons } from "@/components/domain/skeletons";

export function HeadersSection({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data?: Array<
    | { name: string; value: string }
    | { name: string; value: string | number }
    | { name: string; value: string | null }
  > | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  return (
    <Section
      title="HTTP Headers"
      description="Server, security, caching"
      help="Headers include server info and security/caching directives returned by a site."
      icon={<List className="h-4 w-4" />}
      accent="purple"
      status={isLoading ? "loading" : isError ? "error" : "ready"}
    >
      {data ? (
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
        <ErrorWithRetry message="Failed to load headers." onRetry={onRetry} />
      ) : (
        <Skeletons count={4} />
      )}
    </Section>
  );
}
