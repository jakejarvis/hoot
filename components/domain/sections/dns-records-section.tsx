"use client";

import { DnsGroup } from "@/components/domain/dns-group";
import { DnsRecordList } from "@/components/domain/dns-record-list";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { KeyValueSkeleton } from "@/components/domain/key-value-skeleton";
import { Section } from "@/components/domain/section";
import { SubheadCountSkeleton } from "@/components/domain/subhead-count";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { DnsRecord } from "@/lib/schemas";
import { SECTION_DEFS } from "@/lib/sections-meta";

function DnsGroupSkeleton({
  title,
  rows = 2,
}: {
  title: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 leading-none">
        <div className="text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
          {title}
        </div>
        <SubheadCountSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from(
          { length: rows },
          (_, n) => `dns-skel-${title}-${rows}-${n}`,
        ).map((id) => (
          <KeyValueSkeleton key={id} withTrailing widthClass="w-[100px]" />
        ))}
      </div>
    </div>
  );
}

export function DnsRecordsSection({
  records,
  isLoading,
  isError,
  onRetryAction,
}: {
  records?: DnsRecord[] | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
}) {
  return (
    <Section {...SECTION_DEFS.dns} isError={isError} isLoading={isLoading}>
      {isLoading ? (
        <div className="space-y-4">
          <DnsGroupSkeleton title="A Records" rows={1} />
          <DnsGroupSkeleton title="AAAA Records" rows={1} />
          <DnsGroupSkeleton title="MX Records" rows={2} />
          <DnsGroupSkeleton title="TXT Records" rows={4} />
          <DnsGroupSkeleton title="NS Records" rows={2} />
        </div>
      ) : records ? (
        <div className="space-y-4">
          {records.length > 0 ? (
            <>
              <DnsGroup
                title="A Records"
                color="blue"
                count={records.filter((r) => r.type === "A").length}
              >
                <DnsRecordList records={records} type="A" />
              </DnsGroup>
              <DnsGroup
                title="AAAA Records"
                color="cyan"
                count={records.filter((r) => r.type === "AAAA").length}
              >
                <DnsRecordList records={records} type="AAAA" />
              </DnsGroup>
              <DnsGroup
                title="MX Records"
                color="green"
                count={records.filter((r) => r.type === "MX").length}
              >
                <DnsRecordList records={records} type="MX" />
              </DnsGroup>
              <DnsGroup
                title="TXT Records"
                color="orange"
                count={records.filter((r) => r.type === "TXT").length}
              >
                <DnsRecordList records={records} type="TXT" />
              </DnsGroup>
              <DnsGroup
                title="NS Records"
                color="purple"
                count={records.filter((r) => r.type === "NS").length}
              >
                <DnsRecordList records={records} type="NS" />
              </DnsGroup>
            </>
          ) : (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon" />
                <EmptyTitle>No DNS records found</EmptyTitle>
                <EmptyDescription>
                  We couldn&apos;t resolve A/AAAA, MX, TXT, or NS records for
                  this domain. If DNS was recently updated, it may take time to
                  propagate.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      ) : isError ? (
        <ErrorWithRetry
          message="Failed to load DNS."
          onRetryAction={onRetryAction}
        />
      ) : null}
    </Section>
  );
}
