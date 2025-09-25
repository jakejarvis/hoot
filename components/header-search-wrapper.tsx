"use client";

import { usePathname } from "next/navigation";
import { HeaderSearch } from "@/components/domain/header-search";

export function HeaderSearchWrapper() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  if (isHome) return null;
  return (
    <div className="flex-1 flex justify-center">
      <HeaderSearch />
    </div>
  );
}
