import { cn } from "@/lib/utils";

interface BrowserWindowProps {
  children: React.ReactNode;
  url?: string;
  className?: string;
}

export function BrowserWindow({
  children,
  url,
  className,
}: BrowserWindowProps) {
  return (
    <div
      className={cn(
        "inline-block select-none overflow-hidden rounded-lg border",
        className,
      )}
    >
      {/* Top Chrome Bar */}
      <div className="flex h-6 items-center gap-2 border-zinc-200 border-b bg-zinc-100 px-2 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Traffic Light Dots */}
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#FF5F57]" />
          <div className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
          <div className="h-2 w-2 rounded-full bg-[#28C840]" />
        </div>

        {/* Address Bar */}
        <div className="flex h-3.5 flex-1 items-center rounded-sm bg-zinc-200 px-2 dark:bg-zinc-800">
          <span className="inline-block w-full truncate text-center text-[8px] text-zinc-500 dark:text-zinc-400">
            {url}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-zinc-950">{children}</div>
    </div>
  );
}
