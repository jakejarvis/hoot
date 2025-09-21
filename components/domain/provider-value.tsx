"use client";

import { Favicon } from "./favicon";

export function ProviderValue({
  name,
  domain,
}: {
  name: string;
  domain: string | null;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      {domain ? <Favicon domain={domain} size={16} /> : null}
      <span>{name}</span>
    </div>
  );
}
