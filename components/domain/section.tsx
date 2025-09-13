import { Info } from "lucide-react"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function Section({
  title,
  description,
  help,
  icon,
  children,
}: {
  title: string
  description?: string
  help?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <AccordionItem value={title} className="border-none">
      <Card className="bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-0 rounded-2xl border border-white/10 dark:border-white/5 shadow-sm">
        <AccordionTrigger className={cn("px-4 py-3 hover:no-underline no-underline")}> 
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
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <CardContent className="pt-0 px-4 pb-4">{children}</CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  )
}


