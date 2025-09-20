"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DnsRecord } from "@/server/services/dns";
import { Favicon } from "./favicon";
import { KeyValue } from "./key-value";
import { TtlBadge } from "./ttl-badge";

export function DnsRecordList({
  records,
  type,
  showTtls,
}: {
  records: DnsRecord[];
  type: DnsRecord["type"];
  showTtls: boolean;
}) {
  const filtered = React.useMemo(
    () => records.filter((r) => r.type === type),
    [records, type],
  );

  return (
    <>
      {filtered.map((r) => (
        <KeyValue
          key={`${type}-${r.value}${type === "MX" ? `-${r.priority ?? ""}` : ""}`}
          label={
            type === "MX" && r.priority != null
              ? `Priority ${r.priority}`
              : undefined
          }
          value={r.value}
          copyable
          trailing={
            showTtls && typeof r.ttl === "number" ? (
              <TtlBadge ttl={r.ttl} />
            ) : undefined
          }
          suffix={
            r.isCloudflare ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1">
                    <Favicon domain="cloudflare.com" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Proxied via Cloudflare</span>
                </TooltipContent>
              </Tooltip>
            ) : undefined
          }
        />
      ))}
    </>
  );
}
