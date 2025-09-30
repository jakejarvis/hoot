"use client";

import { usePathname } from "next/navigation";
import { DomainSearch } from "@/components/domain/domain-search";

export function HeaderSearch() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  if (isHome) return null;

  return (
    <div className="flex flex-1 justify-center">
      <div className="w-full max-w-2xl">
        <DomainSearch variant="sm" />
      </div>
    </div>
  );
}
