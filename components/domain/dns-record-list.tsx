"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DnsRecord } from "@/lib/schemas";
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
  const filtered = useMemo(() => {
    const arr = records.filter((r) => r.type === type);
    if (type === "MX") {
      arr.sort((a, b) => {
        const ap = a.priority ?? Number.MAX_SAFE_INTEGER;
        const bp = b.priority ?? Number.MAX_SAFE_INTEGER;
        if (ap !== bp) return ap - bp;
        return a.value.localeCompare(b.value);
      });
    }
    return arr;
  }, [records, type]);

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
                  <p>Real IP is being concealed using Cloudflare.</p>
                </TooltipContent>
              </Tooltip>
            ) : undefined
          }
        />
      ))}
    </>
  );
}
