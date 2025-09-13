import { DomainSearchForm } from "@/components/domain/domain-search-form";

export default function Home() {
  return (
    <div className="container mx-auto max-w-3xl min-h-[600px] flex items-center justify-center px-4">
      <div className="w-full">
        <div className="text-center space-y-3 mb-6">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Domain Intelligence
          </h1>
          <p className="text-muted-foreground">
            WHOIS, DNS, SSL, headers — all in one place.
          </p>
        </div>
        <DomainSearchForm />
      </div>
    </div>
  );
}
