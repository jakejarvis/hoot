"use client";

import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { KeyValue } from "@/components/domain/key-value";
import { KeyValueSkeleton } from "@/components/domain/key-value-skeleton";
import { Section } from "@/components/domain/section";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { HttpHeader } from "@/lib/schemas";
import { SECTION_DEFS } from "@/lib/sections-meta";

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
  return (
    <Section {...SECTION_DEFS.headers} isError={isError} isLoading={isLoading}>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 12 }, (_, n) => `hdr-skel-${n}`).map((id) => (
            <KeyValueSkeleton key={id} widthClass="w-[100px]" withTrailing />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          onRetryAction={onRetryAction}
        />
      ) : (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon" />
            <EmptyTitle>No HTTP headers detected</EmptyTitle>
            <EmptyDescription>
              We couldn&apos;t fetch any HTTP response headers for this site. It
              may be offline or blocking requests.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </Section>
  );
}
