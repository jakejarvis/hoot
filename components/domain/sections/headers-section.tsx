"use client";

import { Logs } from "lucide-react";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { KeyValue } from "@/components/domain/key-value";
import { KeyValueGrid } from "@/components/domain/key-value-grid";
import { KeyValueSkeletonList } from "@/components/domain/key-value-skeletons";
import { Section } from "@/components/domain/section";
import { SectionContent } from "@/components/domain/section-content";
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
      <SectionContent
        isLoading={isLoading}
        isError={isError}
        data={data ?? null}
        isEmpty={(d) => !Array.isArray(d) || d.length === 0}
        renderLoading={() => (
          <KeyValueGrid colsDesktop={2}>
            <KeyValueSkeletonList
              count={12}
              widthClass="w-[100px]"
              withTrailing
            />
          </KeyValueGrid>
        )}
        renderData={(d) => (
          <KeyValueGrid colsDesktop={2}>
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
              return d.map((h) => (
                <KeyValue
                  key={`${h.name}:${String((h as { value: unknown }).value)}`}
                  label={h.name}
                  value={String((h as { value: unknown }).value)}
                  copyable
                  highlight={important.has(h.name)}
                />
              ));
            })()}
          </KeyValueGrid>
        )}
        renderError={() => (
          <ErrorWithRetry
            message="Failed to load headers."
            onRetryAction={onRetryAction}
          />
        )}
        renderEmpty={() => (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Logs />
              </EmptyMedia>
              <EmptyTitle>No HTTP headers detected</EmptyTitle>
              <EmptyDescription>
                We couldn&apos;t fetch any HTTP response headers for this site.
                It may be offline or blocking requests.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      />
    </Section>
  );
}
