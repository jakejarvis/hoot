"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderSearch } from "@/components/domain/header-search";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";

export function AppHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 min-h-18 z-40 flex items-center gap-4 px-4 sm:px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <Link
        href="/"
        className="inline-flex items-center justify-center h-14 w-14 rounded-md text-foreground hover:text-muted-foreground transition-all active:scale-95 duration-200"
        aria-label="Go to homepage"
      >
        <Logo className="h-10 w-10" aria-hidden="true" />
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
