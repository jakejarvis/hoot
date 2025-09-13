import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { toast } from "sonner"

export function KeyValue({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 dark:border-white/5 bg-background/60 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{label}</div>
        <div className="text-sm truncate" title={value}>{value}</div>
      </div>
      {copyable && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-7 px-2"
          aria-label={`Copy ${label}`}
          onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied") }}
        >
          <Copy className="mr-1 h-3.5 w-3.5" /> Copy
        </Button>
      )}
    </div>
  )
}


