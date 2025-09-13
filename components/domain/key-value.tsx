import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function KeyValue({
  label,
  value,
  copyable,
  leading,
}: {
  label?: string;
  value: string;
  copyable?: boolean;
  leading?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/12 dark:border-white/10 bg-background/40 backdrop-blur-lg px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="min-w-0 space-y-1">
        {label && <div className="text-[10px] uppercase tracking-[0.08em] text-foreground/75 dark:text-foreground/80">
          {label}
        </div>}
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
