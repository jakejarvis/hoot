import { DomainSearchForm } from "@/components/domain/domain-search-form";
import { HomeHero } from "@/components/home-hero";

export default function Home() {
  return (
    <div className="container mx-auto my-auto flex items-center justify-center px-4 py-8">
      <div className="w-full space-y-6">
        <HomeHero />

        <div className="w-full max-w-3xl mx-auto">
          <DomainSearchForm />
        </div>
      </div>
    </div>
  );
}
