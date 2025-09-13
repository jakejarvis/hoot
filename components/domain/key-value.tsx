import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function KeyValue({
  label,
  value,
  copyable,
  leading,
  highlight,
}: {
  label?: string;
  value: string;
  copyable?: boolean;
  leading?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border bg-background/40 backdrop-blur-lg px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        highlight
          ? "border-purple-500/20 dark:border-purple-500/20 bg-purple-500/5 shadow-[inset_0_1px_0_rgba(168,85,247,0.18)]"
          : "border-white/12 dark:border-white/10",
      )}
    >
      <div className="min-w-0 space-y-1">
        {label && (
          <div
            className={cn(
              "text-[10px] uppercase tracking-[0.08em]",
              highlight
                ? "text-purple-700/80 dark:text-purple-300/85"
                : "text-foreground/75 dark:text-foreground/80",
            )}
          >
            {label}
          </div>
        )}
        <div
          className="text-[13px] leading-[1.2] truncate text-foreground/95 flex items-center gap-[5px]"
          title={value}
        >
          {leading}
          <span className="truncate">{value}</span>
        </div>
      </div>
      {copyable && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-7 px-2 bg-background/50 backdrop-blur border-white/20 dark:border-white/10"
          aria-label={`Copy ${label}`}
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Copied");
          }}
        >
          <Copy className="mr-1 h-3.5 w-3.5" /> Copy
        </Button>
      )}
    </div>
  );
}
