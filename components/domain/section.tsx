import { Info, Loader2 } from "lucide-react"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function Section({
  title,
  description,
  help,
  icon,
  accent,
  status,
  children,
}: {
  title: string
  description?: string
  help?: string
  icon?: React.ReactNode
  accent?: "blue" | "purple" | "green" | "orange"
  status?: "loading" | "ready" | "error"
  children: React.ReactNode
}) {
  return (
    <AccordionItem value={title} className="border-none">
      <Card className="relative overflow-hidden bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 py-0 rounded-3xl border border-white/15 dark:border-white/10 shadow-[0_8px_30px_rgb(0_0_0_/_0.12)]">
        {/* Accent glow */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-x-8 -top-8 h-24 blur-2xl opacity-30",
            accent === "blue" && "bg-[radial-gradient(closest-side,oklch(0.82_0.08_230),transparent)]",
            accent === "purple" && "bg-[radial-gradient(closest-side,oklch(0.78_0.10_310),transparent)]",
            accent === "green" && "bg-[radial-gradient(closest-side,oklch(0.86_0.09_160),transparent)]",
            accent === "orange" && "bg-[radial-gradient(closest-side,oklch(0.86_0.12_60),transparent)]",
          )}
        />
        <AccordionTrigger className={cn("px-5 py-4 hover:no-underline no-underline")}> 
          <div className="flex w-full items-center gap-3 text-left">
            {icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground/80">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{title}</CardTitle>
              {(description || help) && (
                <CardDescription className="flex items-center gap-1 whitespace-normal">
                  {description}
                  {help && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span role="img" aria-label={`More info about ${title}`} className="inline-flex">
                            <Info className="h-3.5 w-3.5 opacity-60" aria-hidden />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{help}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardDescription>
              )}
            </div>
            {status && (
              <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                {status === "loading" && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading
                  </>
                )}
                {status === "ready" && (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500/80" aria-label="Ready" />
                )}
                {status === "error" && (
                  <span className="text-destructive">Error</span>
                )}
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <CardContent className="pt-0 px-5 pb-5 space-y-3">{children}</CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  )
}


