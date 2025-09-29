"use client";

import { DnsGroup } from "@/components/domain/dns-group";
import { DnsRecordList } from "@/components/domain/dns-record-list";
import { ErrorWithRetry } from "@/components/domain/error-with-retry";
import { Section } from "@/components/domain/section";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { DnsRecord } from "@/lib/schemas";
import { SECTION_DEFS } from "./sections-meta";

export function DnsRecordsSection({
  records,
  isLoading,
  isError,
  onRetryAction,
  showTtls,
  onToggleTtlsAction,
}: {
  records?: DnsRecord[] | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
  showTtls: boolean;
  onToggleTtlsAction: (next: boolean) => void;
}) {
  const headerRight = (
    <Label
      htmlFor="show-ttls"
      className="cursor-pointer select-none"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e: React.KeyboardEvent<HTMLLabelElement>) => {
        if (e.key === " " || e.key === "Enter") e.stopPropagation();
      }}
    >
      <Checkbox
        id="show-ttls"
        className="cursor-pointer"
        checked={showTtls}
        onCheckedChange={(v) => onToggleTtlsAction(v === true)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
          if (e.key === " " || e.key === "Enter") e.stopPropagation();
        }}
      />
      Show TTLs
    </Label>
  );

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
            chart={1}
            count={records.filter((r) => r.type === "A").length}
          >
            <DnsRecordList records={records} type="A" showTtls={showTtls} />
          </DnsGroup>
          <DnsGroup
            title="AAAA Records"
            chart={2}
            count={records.filter((r) => r.type === "AAAA").length}
          >
            <DnsRecordList records={records} type="AAAA" showTtls={showTtls} />
          </DnsGroup>
          <DnsGroup
            title="MX Records"
            chart={3}
            count={records.filter((r) => r.type === "MX").length}
          >
            <DnsRecordList records={records} type="MX" showTtls={showTtls} />
          </DnsGroup>
          <DnsGroup
            title="TXT Records"
            chart={5}
            count={records.filter((r) => r.type === "TXT").length}
          >
            <DnsRecordList records={records} type="TXT" showTtls={showTtls} />
          </DnsGroup>
          <DnsGroup
            title="NS Records"
            chart={1}
            count={records.filter((r) => r.type === "NS").length}
          >
            <DnsRecordList records={records} type="NS" showTtls={showTtls} />
          </DnsGroup>
        </div>
      ) : isError ? (
        <ErrorWithRetry message="Failed to load DNS." onRetry={onRetryAction} />
      ) : null}
    </Section>
  );
}
