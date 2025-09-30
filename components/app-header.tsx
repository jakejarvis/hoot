import Link from "next/link";
import { HeaderSearch } from "@/components/domain/header-search";
import { GithubStars } from "@/components/github-stars";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 flex min-h-18 items-center gap-4 border-b px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <Link
        href="/"
        className="inline-flex h-14 w-14 items-center justify-center rounded-md text-foreground transition-all duration-200 hover:text-muted-foreground active:scale-95"
        aria-label="Go to homepage"
      >
        <Logo className="h-10 w-10" aria-hidden="true" />
      </Link>
      <HeaderSearch />
      <div className="ml-auto flex items-center gap-1.5">
        {/* Server-fetched star count with link */}
        <GithubStars />
        <ThemeToggle />
      </div>
    </header>
  );
}
