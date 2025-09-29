"use client";

import { DnsGroup } from "@/components/domain/dns-group";
import { DnsRecordList } from "@/components/domain/dns-record-list";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Section } from "@/components/domain/section";
import type { DnsRecord } from "@/lib/schemas";
import { SECTION_DEFS } from "./sections-meta";

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
  const headerRight = null;

  const Def = SECTION_DEFS.dns;
  return (
    <Section
      title={Def.title}
      description={Def.description}
      help={Def.help}
      icon={<Def.Icon className="h-4 w-4" />}
      accent={Def.accent}
      headerRight={headerRight}
      isError={isError}
      isLoading={isLoading}
    >
      {isLoading ? null : records ? (
        <div className="space-y-4">
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
        </div>
      ) : isError ? (
        <ErrorWithRetry message="Failed to load DNS." onRetry={onRetryAction} />
      ) : null}
    </Section>
  );
}
