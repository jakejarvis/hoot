"use client";

import { Favicon } from "./favicon";

export function ProviderValue({
  name,
  iconDomain,
}: {
  name: string;
  iconDomain: string | null;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      {iconDomain ? (
        <Favicon domain={iconDomain} size={16} className="rounded" />
      ) : null}
      <span>{name}</span>
    </div>
  );
}
