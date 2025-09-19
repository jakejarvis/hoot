import { ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DomainUnregisteredStateProps {
  domain: string;
}

export function DomainUnregisteredState({
  domain,
}: DomainUnregisteredStateProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="relative overflow-hidden bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 rounded-3xl border border-black/10 dark:border-white/10 shadow-[0_8px_30px_rgb(0_0_0_/_0.12)] p-8 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-16 -top-16 h-40 blur-3xl opacity-40 bg-[radial-gradient(closest-side,oklch(0.86_0.12_60),transparent)]"
        />
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {domain}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          This domain appears to be unregistered.
        </p>
        <div className="mt-5 flex justify-center">
          <Button size="lg" className="gap-2" asChild>
            <Link
              href={`https://porkbun.com/checkout/search?q=${domain}`}
              target="_blank"
              rel="noopener"
              aria-label="Register this domain"
            >
              <ShoppingBasket className="h-4 w-4" /> But it could be yours!
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
