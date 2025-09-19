import { DomainSearchForm } from "@/components/domain/domain-search-form";
import { HomeHero } from "@/components/home-hero";

export default function Home() {
  return (
    <div className="container mx-auto min-h-[600px] flex items-center justify-center px-4">
      <div className="w-full space-y-6">
        <HomeHero />

        <div className="w-full max-w-3xl mx-auto">
          <DomainSearchForm />
        </div>
      </div>
    </div>
  );
}
