import { DomainSuggestionsServer } from "@/components/domain/domain-suggestions-server";
import { HomeHero } from "@/components/home-hero";
import { HomeSearchSection } from "@/components/home-search-section";

export default function Home() {
  return (
    <div className="container mx-auto my-auto flex items-center justify-center px-4 py-8">
      <div className="w-full space-y-6">
        <HomeHero />
        <HomeSearchSection>
          <DomainSuggestionsServer />
        </HomeSearchSection>
      </div>
    </div>
  );
}
