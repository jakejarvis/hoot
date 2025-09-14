"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderSearch } from "@/components/domain/header-search";
import { ModeToggle } from "@/components/mode-toggle";

export function AppHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 min-h-18 z-40 flex items-center gap-4 px-4 sm:px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <Link href="/" className="font-semibold tracking-tight whitespace-nowrap">
        hoot.sh
      </Link>
      {!isHome && (
        <div className="flex-1 flex justify-center">
          <HeaderSearch />
        </div>
      )}
      <div className="ml-auto">
        <ModeToggle />
      </div>
    </header>
  );
}
