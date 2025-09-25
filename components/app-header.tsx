import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubStars } from "./github-stars";
import { HeaderSearchWrapper } from "./header-search-wrapper";

export function AppHeader() {
  return (
    <header className="sticky top-0 min-h-18 z-40 flex items-center gap-4 px-4 sm:px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <Link
        href="/"
        className="inline-flex items-center justify-center h-14 w-14 rounded-md text-foreground hover:text-muted-foreground transition-all active:scale-95 duration-200"
        aria-label="Go to homepage"
      >
        <Logo className="h-10 w-10" aria-hidden="true" />
      </Link>
      <HeaderSearchWrapper />
      <div className="ml-auto flex items-center gap-1.5">
        {/* Server-fetched star count with link */}
        <GithubStars />
        <ThemeToggle />
      </div>
    </header>
  );
}
