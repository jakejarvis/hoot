"use client";

import { Bookmark, MousePointerClick } from "lucide-react";
import { useCallback } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function Bookmarklet({ className }: { className?: string }) {
  // a little hack to "unsafely" use raw javascript as a link
  const hrefScript = useCallback((element: HTMLAnchorElement | null) => {
    if (!element) return;
    const openScript = `var t=window.open("${location.origin}/"+location.hostname,"_blank");t.focus()`;
    element.href = `javascript:(function(){${openScript}})();`;
  }, []);

  return (
    <Dialog>
      <DialogTrigger className={className} asChild>
        <Button aria-label="Open bookmarklet info" variant="ghost" size="sm">
          <Bookmark />
          <span className="sr-only">Open bookmarklet info</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/80 dark:border-border/50">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-1.5">
            <MousePointerClick className="h-4.5 w-4.5" />
            Bookmarklet
          </DialogTitle>
          <DialogDescription>
            Drag the button below to your bookmarks bar. Then, press it on any
            site and the Domainstack report for that domain will open in a new
            tab, like magic!
          </DialogDescription>
        </DialogHeader>
        <button
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-fit p-0 leading-none",
          )}
          onClick={(e) => e.preventDefault()}
          type="button"
        >
          {/** biome-ignore lint/a11y/useValidAnchor: we set the href above */}
          <a
            ref={hrefScript}
            className="flex items-center gap-1.5 px-3.5 py-1.5"
          >
            <Bookmark />
            <span>Inspect Domain</span>
          </a>
        </button>
      </DialogContent>
    </Dialog>
  );
}
