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
    <div
      className="relative overflow-hidden bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl shadow-black/10 p-8 text-center"
      data-accent="pink"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -top-16 h-40 blur-3xl opacity-40 accent-glow"
      />
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        {domain}
      </h2>
      <p className="text-muted-foreground mt-2 text-sm sm:text-base">
        appears to be unregistered.
      </p>
      <div className="mt-5 flex justify-center">
        <Button size="lg" variant="outline" asChild>
          <Link
            href={`https://porkbun.com/checkout/search?q=${domain}`}
            target="_blank"
            rel="noopener"
            aria-label="Register this domain"
          >
            <ShoppingBasket />
            Until now?
          </Link>
        </Button>
      </div>
    </div>
  );
}
