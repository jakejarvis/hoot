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
      className="relative overflow-hidden rounded-3xl border border-black/10 bg-background/60 p-8 text-center shadow-2xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 dark:border-white/10"
      data-accent="pink"
    >
      <div
        aria-hidden
        className="-inset-x-16 -top-16 pointer-events-none absolute h-40 accent-glow opacity-40 blur-3xl"
      />
      <h2 className="font-semibold text-2xl tracking-tight sm:text-3xl">
        {domain}
      </h2>
      <p className="mt-2 text-muted-foreground text-sm sm:text-base">
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
